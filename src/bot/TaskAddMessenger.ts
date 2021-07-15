import { Message } from 'discord.js';
import logger from '../lib/logger';
import { Task } from '../models/TaskModel';
import { TimeoutError } from './errors';
import Messenger from './messengers/Messenger';
import { DiscordTextChannel } from './types';

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

export default class TaskAddMessenger extends Messenger {
  private newTask: Partial<Task>;
  private commandMsg: Message;
  private state: MessageState;

  constructor(channel: DiscordTextChannel, commandMsg: Message) {
    super(channel);
    this.newTask = {};
    this.commandMsg = commandMsg;
    this.state = MessageState.ADD_DESCRIPTION;
  }

  public async prompt(): Promise<void> {
    try {
      while (true) {
        switch (this.state) {
          case MessageState.ADD_DESCRIPTION: {
            // this.state = await this.handleReactLegend();
            break;
          }
          case MessageState.ADD_DEADLINE: {
            // this.state = await this.handleEditDescription();
            break;
          }
          case MessageState.ADD_STAKES: {
            // this.state = await this.handleDeadline();
            break;
          }
          case MessageState.ADD_PARTNER: {
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
}
