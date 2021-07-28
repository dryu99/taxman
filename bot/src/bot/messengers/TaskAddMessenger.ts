import { Message, MessageEmbed, User } from 'discord.js';
import logger from '../../lib/logger';
import { Task } from '../../models/TaskModel';
import { INTERNAL_ERROR, TimeoutError, TIMEOUT_ERROR } from '../errors';
import Messenger from './Messenger';
import theme from '../theme';
import { DiscordTextChannel } from '../types';
import { createTaskEmbed, getUserInputMessage } from '../utils';
import TaskPrompter, {
  EditAction,
  TaskLegendType,
} from '../prompters/TaskPrompter';
import taskService from '../../services/task-service';

enum MessageState {
  GET_DESCRIPTION = 'description',
  GET_DEADLINE = 'deadline',
  GET_STAKES = 'stakes',
  GET_PARTNER = 'partner',
  CHOOSE_EDIT = 'edit_legend',
  END = 'end',
}

enum MessageWorkflow {
  CREATE = 'create',
  EDIT = 'edit',
}

export default class TaskAddMessenger extends Messenger {
  static CANCEL_KEY: string = 'cancel';

  private commandMsg: Message;
  private state: MessageState;
  private workflow: MessageWorkflow;
  private prompter: TaskPrompter;

  // task props we are collecting from user
  private userID: string;
  private description: string;
  private dueDate: Date;
  private partner: User;
  private stakes: number;

  constructor(channel: DiscordTextChannel, commandMsg: Message) {
    super(channel);
    this.userID = commandMsg.author.id;
    this.commandMsg = commandMsg;
    this.state = MessageState.GET_DESCRIPTION;
    this.workflow = MessageWorkflow.CREATE;
    this.prompter = new TaskPrompter(channel, commandMsg.author.id);
  }

  public async prompt(): Promise<void> {
    while (true) {
      switch (this.state) {
        case MessageState.GET_DESCRIPTION:
          this.state = await this.handleCollectDescription();
          break;
        case MessageState.GET_DEADLINE:
          this.state = await this.handleCollectDeadline();
          break;
        case MessageState.GET_PARTNER:
          this.state = await this.handleCollectPartner();
          break;
        case MessageState.GET_STAKES:
          this.state = await this.handleCollectStakes();
          break;
        case MessageState.CHOOSE_EDIT:
          // once we reach this state, workflow becomes edit
          this.workflow = MessageWorkflow.EDIT;
          this.state = await this.handleChooseEdit();
          break;
        case MessageState.END:
          logger.info('exiting message loop');
          return;
        default:
          logger.error('Unknown state received', this.state);
          return; // exit message loop
      }
    }
  }

  private async handleCollectDescription(): Promise<MessageState> {
    const descriptionEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(`Please provide fea brief description of your task.`);

    await this.channel.send(descriptionEmbed);

    try {
      const userInputMsg = await getUserInputMessage(this.channel, this.userID);
      if (userInputMsg.content === TaskAddMessenger.CANCEL_KEY) {
        this.cancelTaskAdd();
        return MessageState.END;
      }

      if (userInputMsg.content.trim().length <= 0) {
        await this.channel.send('Please provide a description!');
        return MessageState.GET_DESCRIPTION;
      }

      this.description = userInputMsg.content;
      return this.workflow === MessageWorkflow.CREATE
        ? MessageState.END
        : MessageState.CHOOSE_EDIT;
    } catch (e) {
      const errorText =
        e instanceof TimeoutError
          ? TIMEOUT_ERROR
          : e.message !== undefined
          ? e.message
          : INTERNAL_ERROR;
      await this.sendErrorMsg(errorText);
      return MessageState.END;
    }
  }

  private async handleCollectDeadline(): Promise<MessageState> {
    try {
      const newDueDate = await this.prompter.promptDeadline();
      this.dueDate = newDueDate;
      return this.workflow === MessageWorkflow.CREATE
        ? MessageState.GET_PARTNER
        : MessageState.CHOOSE_EDIT;
    } catch (e) {
      const errorText = e instanceof TimeoutError ? TIMEOUT_ERROR : e.message;
      await this.sendErrorMsg(errorText);
      return MessageState.END;
    }
  }

  private async handleCollectPartner(): Promise<MessageState> {
    try {
      const newPartner = await this.prompter.promptPartner();
      this.partner = newPartner;
      return this.workflow === MessageWorkflow.CREATE
        ? MessageState.GET_STAKES
        : MessageState.CHOOSE_EDIT;
    } catch (e) {
      const errorText = e instanceof TimeoutError ? TIMEOUT_ERROR : e.message;
      await this.sendErrorMsg(errorText);
      return MessageState.END;
    }
  }

  private async handleCollectStakes(): Promise<MessageState> {
    try {
      const newStakes = await this.prompter.promptStakes();
      this.stakes = newStakes;
      return MessageState.CHOOSE_EDIT;
    } catch (e) {
      const errorText = e instanceof TimeoutError ? TIMEOUT_ERROR : e.message;
      await this.sendErrorMsg(errorText);
      return MessageState.END;
    }
  }

  private async handleChooseEdit(): Promise<MessageState> {
    try {
      // TODO validate props here?
      // const taskEmbed = createTaskEmbed({
      //   description: this.description,
      //   dueAt: this.dueDate,
      //   stakes: this.stakes,
      //   userDiscordID: this.userID,
      //   partnerUserDiscordID: this.partner.id,
      //   channelID: this.channel.id,
      // });
      // await this.channel.send(taskEmbed);

      const action = await this.prompter.promptEditAction(
        TaskLegendType.CREATE_NEW,
      );

      if (action === EditAction.DESCRIPTION)
        return MessageState.GET_DESCRIPTION;
      if (action === EditAction.DUE_DATE) return MessageState.GET_DEADLINE;
      if (action === EditAction.PARTNER) return MessageState.GET_PARTNER;
      if (action === EditAction.STAKES) return MessageState.GET_STAKES;
      if (action === EditAction.CONFIRM) {
        this.completeTaskAdd();
        return MessageState.END;
      }
      if (action === EditAction.CANCEL) {
        this.cancelTaskAdd();
        return MessageState.END;
      }

      await this.sendErrorMsg(
        'Received unexpected emoji, cancelling task creation.',
      );
      return MessageState.END;
    } catch (e) {
      const errorText = e instanceof TimeoutError ? TIMEOUT_ERROR : e.message;
      await this.sendErrorMsg(errorText);
      return MessageState.END;
    }
  }

  private async completeTaskAdd(): Promise<void> {
    const confirmEmbed = new MessageEmbed()
      .setColor(theme.colors.success)
      .setDescription(`Your task has been created!`); // TODO mention due date
    await this.channel.send(confirmEmbed);

    // save task in db
    // await taskService.add({
    //   authorID: this.userID,
    //   partnerID: this.partner.id,
    //   channelID: this.channel.id,
    //   cost: this.stakes,
    //   name: this.description,
    //   dueDate: this.dueDate,
    // });
  }

  private async cancelTaskAdd(): Promise<void> {
    const cancelEmbed = new MessageEmbed()
      .setColor(theme.colors.error)
      .setDescription('Task creation cancelled, nothing was saved.');
    await this.channel.send(cancelEmbed);
  }
}
