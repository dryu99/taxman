import { Message, MessageEmbed, User } from 'discord.js';
import logger from '../../lib/logger';
import { Task } from '../../models/TaskModel';
import { TimeoutError } from '../errors';
import Messenger from './Messenger';
import theme from '../theme';
import { DiscordTextChannel } from '../types';
import { createTaskEmbed, getUserInputMessage } from '../utils';
import TaskPrompter from '../prompters/TaskPrompter';
import taskService from '../../services/task-service';

enum MessageState {
  DESCRIPTION = 'description',
  DEADLINE = 'deadline',
  STAKES = 'stakes',
  PARTNER = 'partner',
  EDIT_LEGEND = 'edit_legend',
  CONFIRM = 'confirm',
  CANCEL = 'cancel',
  END = 'end',
}

enum Workflow {
  CREATE = 'create',
  EDIT = 'edit',
}

export default class TaskAddMessenger extends Messenger {
  private commandMsg: Message;
  private state: MessageState;
  private workflow: Workflow;
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
    this.state = MessageState.DESCRIPTION;
    this.workflow = Workflow.CREATE;
    this.prompter = new TaskPrompter(channel, commandMsg.author.id);

    // commandMsg.author.id
  }

  public async prompt(): Promise<void> {
    try {
      while (true) {
        switch (this.state) {
          case MessageState.DESCRIPTION: {
            this.state = await this.handleDescription();
            break;
          }
          case MessageState.DEADLINE: {
            this.state = await this.handleDeadline();
            break;
          }
          case MessageState.PARTNER: {
            this.state = await this.handleAddPartner();
            break;
          }
          case MessageState.STAKES: {
            this.state = await this.handleAddStakes();
            break;
          }
          case MessageState.EDIT_LEGEND: {
            // once we reach this state, workflow becomes edit
            this.workflow = Workflow.EDIT;
            this.state = await this.handleLegend();
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
      if (e instanceof TimeoutError) this.sendTimeoutMsg();

      return;
    }
  }

  private async handleDescription(): Promise<MessageState> {
    const newDescription = await this.prompter.promptDescription();
    this.description = newDescription;
    return this.workflow === Workflow.CREATE
      ? MessageState.DEADLINE
      : MessageState.EDIT_LEGEND;
  }

  private async handleDeadline(): Promise<MessageState> {
    const newDueDate = await this.prompter.promptDeadline();
    this.dueDate = newDueDate;
    return this.workflow === Workflow.CREATE
      ? MessageState.PARTNER
      : MessageState.EDIT_LEGEND;
  }

  private async handleAddPartner(): Promise<MessageState> {
    const newPartner = await this.prompter.promptPartner();
    this.partner = newPartner;
    return this.workflow === Workflow.CREATE
      ? MessageState.STAKES
      : MessageState.EDIT_LEGEND;
  }

  private async handleAddStakes(): Promise<MessageState> {
    const newStakes = await this.prompter.promptStakes();
    this.stakes = newStakes;
    return MessageState.EDIT_LEGEND;
  }

  private async handleLegend(): Promise<MessageState> {
    // TODO validate props here?
    const taskEmbed = createTaskEmbed({
      name: this.description,
      dueDate: this.dueDate,
      cost: this.stakes,
      authorID: this.userID,
      partnerID: this.partner.id,
      channelID: this.channel.id,
    });
    await this.channel.send(taskEmbed);

    const reaction = await this.prompter.promptReaction(
      'Task Confirmation',
      `Your task is shown above! To edit your task, use one of the emojis on this message. 
    Be sure to confirm your new task below.
    (Note: you cannot edit task stakes after initial task creation)

    ✏️ Edit title
    ⏰ Edit due date
    👯 Edit accountability partner
    💰 Edit stakes
    
    ✅ Confirm
    ❌ Cancel
    `,
      ['✏️', '⏰', '👯', '💰', '✅', '❌'],
    );

    const emojiStr = reaction.emoji.name;
    if (emojiStr === '✏️') return MessageState.DESCRIPTION;
    if (emojiStr === '⏰') return MessageState.DEADLINE;
    if (emojiStr === '👯') return MessageState.PARTNER;
    if (emojiStr === '💰') return MessageState.STAKES;
    if (emojiStr === '✅') return MessageState.CONFIRM;
    if (emojiStr === '❌') return MessageState.CANCEL;
    throw new Error('Received unexpected emoji.');
  }

  private async handleConfirm(): Promise<MessageState> {
    const confirmEmbed = new MessageEmbed()
      .setColor(theme.colors.success)
      .setDescription(`Your task has been created!`); // TODO mention due date
    await this.channel.send(confirmEmbed);

    // save task in db
    await taskService.add({
      authorID: this.userID,
      partnerID: this.partner.id,
      channelID: this.channel.id,
      cost: this.stakes,
      name: this.description,
      dueDate: this.dueDate,
    });

    return MessageState.END;
  }

  private async handleCancel(): Promise<MessageState> {
    const cancelEmbed = new MessageEmbed()
      .setColor(theme.colors.error)
      .setDescription('Task creation cancelled, nothing was saved.');

    await this.channel.send(cancelEmbed);
    return MessageState.END;
  }
}
