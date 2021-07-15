import { Message, MessageEmbed } from 'discord.js';
import { Task } from '../models/TaskModel';
import {
  getUserInputMessage,
  getUserInputReaction,
  createTaskEmbed,
} from './utils';
import theme from './theme';
import taskService from '../services/task-service';
import { TimeoutError } from './errors';
import { DiscordTextChannel } from './types';
import logger from '../lib/logger';
import { DateTime } from 'luxon';
import EditCommand from '../commands/tasks/edit';

enum MessageState {
  REACT_LEGEND = 'react_legend',
  EDIT_DEADLINE = 'edit_due_date',
  EDIT_DESCRIPTION = 'edit_description',
  EDITING_ERROR = 'edit_error',
  EDITING_TIMEOUT = 'timeout',
  CONFIRM = 'confirm',
  CANCEL = 'cancel',
  END = 'end',
}

// TODO consider tagging users outside embed (pop notification on mobile is weird otherwise)
// TODO partner confirm embed contains redundant info... make it smaller
// TODO allow users to cancel mid edit
export default class TaskEditMessenger {
  private task: Task;
  private newTask: Task;
  private channel: DiscordTextChannel;
  private commandMsg: Message;
  private state: MessageState;

  constructor(task: Task, channel: DiscordTextChannel, commandMsg: Message) {
    this.task = task;
    this.newTask = { ...task }; // TODO might need to deep clone (if theres nested data)
    this.channel = channel;
    this.commandMsg = commandMsg;
    this.state = MessageState.REACT_LEGEND;
  }

  public async prompt(): Promise<void> {
    try {
      while (true) {
        switch (this.state) {
          case MessageState.REACT_LEGEND: {
            this.state = await this.handleReactLegend();
            break;
          }
          case MessageState.EDIT_DESCRIPTION: {
            this.state = await this.handleEditDescription();
            break;
          }
          case MessageState.EDIT_DEADLINE: {
            this.state = await this.handleDeadline();
            break;
          }
          case MessageState.CONFIRM: {
            this.state = await this.handleConfirm();
            break;
          }
          case MessageState.CANCEL: {
            this.state = await this.handleCancel();
            break;
          }
          case MessageState.END: {
            logger.info('exiting message loop');
            return;
          }
          default: {
            logger.error('Unknown state received', this.state);
            return; // exit message loop
          }
        }
      }
    } catch (e) {
      logger.error(e);
      if (e instanceof TimeoutError) return this.sendTimeoutMsg();

      // TODO maybe throw here? to let caller handle bad errors.
      //      I feel there are no expected bad errors. we should only really get timeout + editing error
      //      So i guess we should throw cause its a reallllly unexpected error
      return;
    }
  }

  private async handleReactLegend(): Promise<MessageState> {
    const taskEmbed = createTaskEmbed(this.newTask);
    // const taskMsg = await this.channel.send(taskEmbed);

    this.commandMsg.reply(taskEmbed);

    const reactLegendEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle('Edit Task')
      .setDescription(
        // TODO rephrase this since you just copied it
        // TODO also use the template literal lib suggested in docs to format nicely
        `Your task is shown above! To edit your task, use one of the emojis on this message. 
        Be sure to confirm your new task below.
        (Note: you cannot edit the cost after initial task creation)

        ✏️ Edit title
        ⏰ Edit due date
        
        ✅ Confirm
        ❌ Cancel
        `,
      );
    const reactLegendMsg = await this.channel.send(reactLegendEmbed);
    const reaction = await getUserInputReaction(
      reactLegendMsg,
      ['✏️', '⏰', '✅', '❌'],
      this.task.authorID,
    );

    // remove reaction (looks cleaner that way)
    reaction.users.remove(this.task.authorID); // async

    const emojiStr = reaction.emoji.name;
    if (emojiStr === '✏️') return MessageState.EDIT_DESCRIPTION;
    if (emojiStr === '⏰') return MessageState.EDIT_DEADLINE;
    if (emojiStr === '✅') return MessageState.CONFIRM;
    if (emojiStr === '❌') return MessageState.CANCEL;
    throw new Error('Received unexpected emoji.');
  }

  private async handleEditDescription(): Promise<MessageState> {
    const editDescriptionEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(`Please provide a brief description of your task.`);
    const editDescriptionMsg = await this.channel.send(editDescriptionEmbed);

    // collect user input
    const userInputMsg = await getUserInputMessage(
      this.channel,
      this.task.authorID,
    );
    const newDescription = userInputMsg.content;

    // update task placeholder in memory
    this.newTask.name = newDescription;

    return MessageState.REACT_LEGEND;
  }

  private async handleDeadline(): Promise<MessageState> {
    const editDeadlineEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle('Edit Deadline')
      .setDescription(
        `
        Please provide the deadline for your task.
        Format your response like this: \`<YYYY-MM-DD> <HH:MM>\`
        `,
      );
    const editDeadlineMsg = await this.channel.send(editDeadlineEmbed);

    // collect user input
    let newDueDate: DateTime | undefined;
    while (!newDueDate || !newDueDate.isValid) {
      const userInputMsg = await getUserInputMessage(
        this.channel,
        this.task.authorID,
      );

      const newDueDateStr = userInputMsg.content;
      const [date, time] = newDueDateStr.trim().split(' ') as [
        string?,
        string?,
      ];

      newDueDate = DateTime.fromISO(`${date}T${time}`, {
        zone: 'America/Los_Angeles', // TODO change to use user input
      });

      if (!newDueDate.isValid) {
        const editErrorEmbed = new MessageEmbed()
          .setColor(theme.colors.error)
          .setDescription(
            `Please format your response like this: \`<YYYY-MM-DD> <HH:MM>\``,
          );

        await this.channel.send(editErrorEmbed);
      }
    }

    // update task placeholder in memory
    this.newTask.dueDate = newDueDate.toJSDate();

    return MessageState.REACT_LEGEND;
  }

  private async handleConfirm(): Promise<MessageState> {
    const confirmEmbed = new MessageEmbed()
      .setColor(theme.colors.success)
      .setDescription(`You finished editing! Your edits have been saved.`);
    await this.channel.send(confirmEmbed);

    // update task in db
    const updatedTask = await taskService.update(this.task.id, {
      name: this.newTask.name, // TODO prob more programmatic way to do this (have to manually add here every time we create new edit option)
      dueDate: this.newTask.dueDate,
    });
    if (!updatedTask)
      throw new Error(`Task with ID ${this.task.id} couldn't be updated.`); // TODO should prob move to task service?? maybe check out other uses of update and see how common this error could occur

    return MessageState.END;
  }

  private async handleCancel(): Promise<MessageState> {
    const cancelEmbed = new MessageEmbed()
      .setColor(theme.colors.error)
      .setDescription(`You cancelled editing! None of your edits were saved.`);

    await this.channel.send(cancelEmbed);

    return MessageState.END;
  }

  private async sendTimeoutMsg(): Promise<void> {
    const timeoutEmbed = new MessageEmbed()
      .setColor(theme.colors.error)
      .setTitle(`Editing Timeout`)
      .setDescription(
        `You didn't respond in time... Use the \`$${EditCommand.DEFAULT_CMD_NAME}\` command to try again.`,
      );

    await this.channel.send(timeoutEmbed);
  }
}
