import { Message, MessageEmbed } from 'discord.js';
import logger from '../../lib/logger';
import { Task } from '../../models/TaskModel';
import { TimeoutError } from '../errors';
import Messenger from './Messenger';
import TaskWriteMessenger from './TaskWriteMessenger';
import theme from '../theme';
import { DiscordTextChannel } from '../types';
import { getUserInputMessage } from '../utils';

enum MessageState {
  ADD_DESCRIPTION = 'add_description',
  ADD_DEADLINE = 'add_deadline',
  ADD_STAKES = 'add_stakes',
  ADD_PARTNER = 'add_partner',
  REACT_LEGEND = 'react_legend',
  CONFIRM = 'confirm',
  CANCEL = 'cancel',
  END = 'end',
}

export default class TaskAddMessenger extends TaskWriteMessenger {
  private newTask: Partial<Task>;
  private commandMsg: Message;
  private state: MessageState;

  constructor(channel: DiscordTextChannel, commandMsg: Message) {
    super(channel, commandMsg.author.id);
    this.newTask = {};
    this.commandMsg = commandMsg;
    this.state = MessageState.ADD_DESCRIPTION;
  }

  public async prompt(): Promise<void> {
    try {
      while (true) {
        switch (this.state) {
          case MessageState.ADD_DESCRIPTION: {
            this.state = await this.handleAddDescription();
            break;
          }
          case MessageState.ADD_DEADLINE: {
            this.state = await this.handleAddDeadline();
            break;
          }
          case MessageState.ADD_PARTNER: {
            // this.state = await this.handleDeadline();
            break;
          }
          case MessageState.ADD_STAKES: {
            // this.state = await this.handleDeadline();
            break;
          }
          case MessageState.CONFIRM: {
            // this.state = await this.handleConfirm();
            break;
          }
          case MessageState.REACT_LEGEND: {
            // this.state = await this.handleReactLegend();
            break;
          }
          case MessageState.CANCEL: {
            // this.state = await this.handleCancel();
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
      if (e instanceof TimeoutError) this.sendTimeoutMsg();

      return;
    }
  }

  private async handleAddDescription(): Promise<MessageState> {
    const newDescription = await this.promptDescription();

    // update task placeholder in memory
    this.newTask.name = newDescription;
    return MessageState.ADD_DEADLINE;
  }

  private async handleAddDeadline(): Promise<MessageState> {
    const newDueDate = await this.promptDeadline();

    // update task placeholder in memory
    this.newTask.dueDate = newDueDate;
    return MessageState.ADD_PARTNER;
  }
}
