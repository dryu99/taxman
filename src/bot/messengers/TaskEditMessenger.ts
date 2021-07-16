import { Message, MessageEmbed } from 'discord.js';
import { Task } from '../../models/TaskModel';
import { getUserInputReaction, createTaskEmbed, parseDate } from '../utils';
import theme from '../theme';
import taskService from '../../services/task-service';
import { TimeoutError } from '../errors';
import { DiscordTextChannel } from '../types';
import logger from '../../lib/logger';
import Messenger from './Messenger';
import TaskPrompter, {
  EditAction,
  TaskLegendType,
} from '../prompters/TaskPrompter';
import { DateTime } from 'luxon';

enum MessageState {
  EDIT_LEGEND = 'react_legend',
  GET_DEADLINE = 'due_date',
  GET_DESCRIPTION = 'description',
  END = 'end',
}

// TODO consider tagging users outside embed (pop notification on mobile is weird otherwise)
// TODO allow users to cancel mid edit
export default class TaskEditMessenger extends Messenger {
  static TIMEOUT_MSG: string = 'This command timed out, cancelling command';

  private task: Task;
  private newTask: Task;
  private commandMsg: Message;
  private state: MessageState;
  private prompter: TaskPrompter;

  constructor(task: Task, channel: DiscordTextChannel, commandMsg: Message) {
    super(channel);
    this.task = task;
    this.newTask = { ...task }; // TODO might need to deep clone (if theres nested data)
    this.commandMsg = commandMsg;
    this.state = MessageState.EDIT_LEGEND;
    this.prompter = new TaskPrompter(
      channel,
      commandMsg.author.id,
      TaskLegendType.EDIT,
    );
  }

  public async prompt(): Promise<void> {
    while (true) {
      switch (this.state) {
        case MessageState.EDIT_LEGEND:
          this.state = await this.handleChooseEdit();
          break;
        case MessageState.GET_DESCRIPTION:
          this.state = await this.handleCollectDescription();
          break;
        case MessageState.GET_DEADLINE:
          this.state = await this.handleCollectDeadline();
          break;
        case MessageState.END:
          logger.info('exiting message loop');
          return;
        default:
          logger.error('Unknown state received', this.state);
          return;
      }
    }
  }

  private async handleChooseEdit(): Promise<MessageState> {
    try {
      const taskEmbed = createTaskEmbed(this.newTask);
      await this.commandMsg.reply(taskEmbed);

      const action = await this.prompter.promptEditAction();

      if (action === EditAction.DESCRIPTION)
        return MessageState.GET_DESCRIPTION;
      if (action === EditAction.DUE_DATE) return MessageState.GET_DEADLINE;
      if (action === EditAction.CONFIRM) {
        this.completeTaskEdit();
        return MessageState.END;
      }
      if (action === EditAction.CANCEL) {
        this.cancelTaskEdit();
        return MessageState.END;
      }

      await this.sendErrorMsg({
        description: 'Received unexpected emoji, cancelling task creation.',
      });
      return MessageState.END;
    } catch (e) {
      const errorText =
        e instanceof TimeoutError ? TaskEditMessenger.TIMEOUT_MSG : e.message;
      await this.sendErrorMsg(errorText);
      return MessageState.END;
    }
  }

  private async handleCollectDescription(): Promise<MessageState> {
    try {
      const userMsg = await this.prompter.promptDescription();
      this.newTask.name = userMsg.content;
      return MessageState.EDIT_LEGEND;
    } catch (e) {
      const errorText =
        e instanceof TimeoutError ? TaskEditMessenger.TIMEOUT_MSG : e.message;
      await this.sendErrorMsg(errorText);
      return MessageState.END;
    }
  }

  private async handleCollectDeadline(): Promise<MessageState> {
    try {
      const userMsg = await this.prompter.promptDeadline();
      const newDueDate = parseDate(userMsg.content);

      if (!this.validateDate(newDueDate)) {
        return MessageState.GET_DEADLINE;
      }

      this.newTask.dueDate = newDueDate.toJSDate();
      return MessageState.EDIT_LEGEND;
    } catch (e) {
      const errorText =
        e instanceof TimeoutError ? TaskEditMessenger.TIMEOUT_MSG : e.message;
      await this.sendErrorMsg(errorText);
      return MessageState.END;
    }
  }

  private async completeTaskEdit(): Promise<MessageState> {
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
      throw new Error(`Task with ID ${this.task.id} couldn't be updated.`);
    return MessageState.END;
  }

  private async cancelTaskEdit(): Promise<MessageState> {
    const cancelEmbed = new MessageEmbed()
      .setColor(theme.colors.error)
      .setDescription(`You cancelled editing! None of your edits were saved.`);

    await this.channel.send(cancelEmbed);
    return MessageState.END;
  }
}
