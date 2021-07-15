import { Message, MessageEmbed, User } from 'discord.js';
import logger from '../../lib/logger';
import { Task } from '../../models/TaskModel';
import { TimeoutError } from '../errors';
import Messenger from './Messenger';
import theme from '../theme';
import { DiscordTextChannel } from '../types';
import { getUserInputMessage } from '../utils';
import TaskPrompter from '../prompters/TaskPrompter';
import taskService from '../../services/task-service';

enum MessageState {
  DESCRIPTION = 'description',
  DEADLINE = 'deadline',
  STAKES = 'stakes',
  PARTNER = 'partner',
  EDIT_LEGEND = 'legend',
  CONFIRM = 'confirm',
  CANCEL = 'cancel',
  END = 'end',
}

export default class TaskAddMessenger extends Messenger {
  private userID: string;
  private newDescription: string;
  private newDueDate: Date;
  private newPartner: User;
  private newStakes: number;
  private commandMsg: Message;
  private state: MessageState;
  private prompter: TaskPrompter;

  constructor(channel: DiscordTextChannel, commandMsg: Message) {
    super(channel);
    this.userID = commandMsg.author.id;
    this.commandMsg = commandMsg;
    this.state = MessageState.DESCRIPTION;
    this.prompter = new TaskPrompter(channel, commandMsg.author.id);

    // commandMsg.author.id
  }

  public async prompt(): Promise<void> {
    try {
      while (true) {
        switch (this.state) {
          case MessageState.DESCRIPTION: {
            this.state = await this.handleAddDescription();
            break;
          }
          case MessageState.DEADLINE: {
            this.state = await this.handleAddDeadline();
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

  private async handleAddDescription(): Promise<MessageState> {
    const newDescription = await this.prompter.promptDescription();
    this.newDescription = newDescription;
    return MessageState.DEADLINE;
  }

  private async handleAddDeadline(): Promise<MessageState> {
    const newDueDate = await this.prompter.promptDeadline();
    this.newDueDate = newDueDate;
    return MessageState.PARTNER;
  }

  private async handleAddPartner(): Promise<MessageState> {
    const newPartner = await this.prompter.promptPartner();
    this.newPartner = newPartner;
    return MessageState.STAKES;
  }

  private async handleAddStakes(): Promise<MessageState> {
    const newStakes = await this.prompter.promptStakes();
    this.newStakes = newStakes;
    return MessageState.EDIT_LEGEND;
  }

  private async handleLegend(): Promise<MessageState> {
    // TODO send task embed

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
    if (emojiStr === '👯') return MessageState.STAKES;
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
      partnerID: this.newPartner.id,
      channelID: this.channel.id,
      cost: this.newStakes,
      name: this.newDescription,
      dueDate: this.newDueDate,
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
