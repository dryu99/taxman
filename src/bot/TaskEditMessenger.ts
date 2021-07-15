import { Message, MessageEmbed, TextChannel } from 'discord.js';
import { CommandoClient } from 'discord.js-commando';
import { Task, TaskStatus } from '../models/TaskModel';
import {
  formatMention,
  getUserInputMessage,
  getUserInputReaction,
  createTaskEmbed,
} from './utils';
import theme from './theme';
import taskService from '../services/task-service';
import { TimeoutError } from './errors';
import { DiscordTextChannel } from './types';
import logger from '../lib/logger';

enum MessageState {
  REACT_LEGEND = 'react_legend',
  EDIT_DUE_DATE = 'edit_due_date',
  EDIT_TITLE = 'edit_title',
  EDITING_ERROR = 'edit_error',
  EDITING_TIMEOUT = 'timeout',
  CONFIRM = 'confirm',
  CANCEL = 'cancel',
  END = 'end',
}

// TODO consider tagging users outside embed (pop notification on mobile is weird otherwise)
// TODO partner confirm embed contains redundant info... make it smaller
export default class TaskEditMessenger {
  private task: Task;
  private channel: DiscordTextChannel;
  private state: MessageState;

  // Messages that are always displayed
  private taskMsg: Message;
  private reactLegendMsg: Message;

  constructor(task: Task, channel: DiscordTextChannel) {
    this.task = task;
    this.channel = channel;
    this.state = MessageState.REACT_LEGEND;
  }

  public async prompt(): Promise<void> {
    await this.sendPersistentMsgs();

    try {
      while (true) {
        switch (this.state) {
          case MessageState.REACT_LEGEND: {
            this.state = await this.promptReactLegend();
            break;
          }
          case MessageState.EDIT_TITLE: {
            this.state = await this.promptEditTitle();
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

  // TODO have to immediately remove reaction
  private async promptReactLegend(): Promise<MessageState> {
    const reaction = await getUserInputReaction(
      this.reactLegendMsg,
      ['✏️', '⏰', '✅', '❌'],
      this.task.authorID,
      5,
    );

    reaction.users.remove(this.task.authorID); // async

    const emojiStr = reaction.emoji.name;
    if (emojiStr === '✏️') return MessageState.EDIT_TITLE;
    if (emojiStr === '⏰') return MessageState.EDIT_DUE_DATE;
    if (emojiStr === '✅') return MessageState.CONFIRM;
    if (emojiStr === '❌') return MessageState.CANCEL;
    throw new Error('Received unexpected emoji.');
  }

  private async promptEditTitle(): Promise<MessageState> {
    const editDescriptionEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle('Edit Description')
      .setDescription(
        `
        Please provide a brief description of the task.
        
        Examples: 
          - Go to gym
          - Wake up early
          - Work on project
        `,
      );
    const editDescriptionMsg = await this.channel.send(editDescriptionEmbed);

    // collect user input
    const userInputMsg = await getUserInputMessage(
      this.channel,
      this.task.authorID,
    );
    const newDescription = userInputMsg.content;

    // update task
    const updatedTask = await taskService.update(this.task.id, {
      name: newDescription,
    });
    if (!updatedTask)
      throw new Error(`Task with ID ${this.task.id} couldn't be updated.`); // TODO should prob move to task service?? maybe check out other uses of update and see how common this error could occur
    this.task = updatedTask;

    // cleanup sent msgs
    await editDescriptionMsg.delete();
    await userInputMsg.delete();

    // update task embed
    const newTaskEmbed = createTaskEmbed({
      ...this.task,
      name: newDescription,
    });
    this.taskMsg.edit(newTaskEmbed);

    // go to next msger state
    return MessageState.REACT_LEGEND;
  }

  private async sendTimeoutMsg(): Promise<void> {
    const embed = new MessageEmbed()
      .setColor(theme.colors.error)
      .setTitle(`Editing Timeout`)
      .setDescription(
        `You didn't respond in time... Use the edit command to try again.`,
      );

    await this.channel.send(embed);
  }

  private async sendPersistentMsgs(): Promise<void> {
    const taskEmbed = createTaskEmbed(this.task);
    const taskMsg = await this.channel.send(taskEmbed);
    this.taskMsg = taskMsg;

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
    this.reactLegendMsg = reactLegendMsg;
  }
}
