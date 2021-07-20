import { MessageEmbed } from 'discord.js';
import { Task, TaskStatus } from '../../models/TaskModel';
import { createTaskEmbed, formatMention, getUserInputReaction } from '../utils';
import theme from '../theme';
import taskService from '../../services/task-service';
import { TimeoutError } from '../errors';
import { DiscordTextChannel } from '../types';
import logger from '../../lib/logger';
import Messenger from './Messenger';

enum MessageState {
  USER_CONFIRM = 'user_confirm',
  PARTNER_CONFIRM = 'partner_confirm',
  END = 'end',
}

// TODO consider tagging users outside embed (pop notification on mobile is weird otherwise)
// TODO partner confirm embed contains redundant info... make it smaller
export default class TaskCheckInMessenger extends Messenger {
  private task: Task;
  private state: MessageState;

  constructor(task: Task, channel: DiscordTextChannel) {
    super(channel);
    this.task = task;
    this.state = MessageState.USER_CONFIRM; // start state
  }

  public async prompt() {
    while (true) {
      switch (this.state) {
        case MessageState.USER_CONFIRM:
          this.state = await this.handleUserConfirm();
          break;
        case MessageState.PARTNER_CONFIRM:
          this.state = await this.handlePartnerConfirm();
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

  private async handleUserConfirm(): Promise<MessageState> {
    try {
      // send reaction embed + collect reacts
      const reactionTimeLimitMinutes = 5;
      const reactEmbed = new MessageEmbed()
        .setTitle('Task Check-In')
        .setDescription(
          `
          ${formatMention(this.task.userDiscordID)} Your task is due!
          Have you completed it?
          Remember to provide photographic proof for your accountability partner! 
          You have ${reactionTimeLimitMinutes} minutes to respond.
        `,
        )
        .addFields(
          { name: 'Task Description', value: this.task.name },
          {
            name: 'Deadline',
            value: this.task.dueDate.toDateString(), // TODO include time
          },
          {
            name: 'Accountability Partner',
            value: formatMention(this.task.partnerID),
          },
          {
            name: 'Money at stake',
            value: `$${this.task.cost}`,
          },
        );

      const reactMsg = await this.channel.send(
        `${formatMention(this.task.userDiscordID)} ‼️ TASK CHECK-IN ‼️`,
        { embed: reactEmbed },
      );
      const reaction = await getUserInputReaction(
        reactMsg,
        ['👍', '👎'],
        this.task.userDiscordID,
        reactionTimeLimitMinutes, // TODO pass settings time limit here
      );

      // set next state
      const emojiStr = reaction.emoji.name;
      if (emojiStr === '👍') return MessageState.PARTNER_CONFIRM;
      if (emojiStr === '👎') {
        await this.failCheckIn('You admitted to not completing the task.');
        return MessageState.END;
      }

      await this.sendErrorMsg(
        'Received unexpected emoji, cancelling check-in.',
      );
      return MessageState.END;
    } catch (e) {
      if (e instanceof TimeoutError) {
        await this.failCheckIn('You failed to to check-in in time.');
      } else {
        await this.sendErrorMsg(e.message);
      }

      return MessageState.END;
    }
  }

  private async handlePartnerConfirm(): Promise<MessageState> {
    const reactionTimeLimitMinutes = 5;
    const reactEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle(`Task Check-In: Partner Confirmation`)
      .setDescription(
        `${formatMention(
          this.task.partnerID,
        )} Please confirm that ${formatMention(
          this.task.userDiscordID,
        )} has completed their task. 
        You have ${reactionTimeLimitMinutes} minutes to respond.`,
      );

    try {
      const reactMsg = await this.channel.send(reactEmbed);
      const reaction = await getUserInputReaction(
        reactMsg,
        ['👍', '👎'],
        this.task.partnerID,
        reactionTimeLimitMinutes, // TODO pass settings time
      );

      // set next state
      const emojiStr = reaction.emoji.name;
      if (emojiStr === '👍') {
        await this.completeCheckIn();
        return MessageState.END;
      }
      if (emojiStr === '👎') {
        await this.failCheckIn('Your partner rejected your check-in.');
        return MessageState.END;
      }

      await this.sendErrorMsg(
        'Received unexpected emoji, cancelling check-in.',
      );
      return MessageState.END;
    } catch (e) {
      if (e instanceof TimeoutError) {
        await this.failCheckIn(
          "Your partner didn't respond in time and lost the opportunity to audit you.",
        );
      } else {
        await this.sendErrorMsg(e.message);
      }
      return MessageState.END;
    }
  }

  private async completeCheckIn(): Promise<void> {
    const embed = new MessageEmbed()
      .setColor(theme.colors.success)
      .setTitle(`Task Check-In: Success`)
      .setDescription(
        `${formatMention(
          this.task.userDiscordID,
        )} Great job, you have evaded the taxman!`,
      );

    // update task status
    await taskService.update(this.task.id, { status: TaskStatus.COMPLETED });

    // TODO 'your next task is...?' or 'create a new task!'
    await this.channel.send(embed);
  }

  private async failCheckIn(reason: string): Promise<void> {
    const embed = new MessageEmbed()
      .setColor(theme.colors.error)
      .setTitle(`Task Check-In: Failure`)
      .setDescription(
        `${formatMention(
          this.task.userDiscordID,
        )} The taxman got you... Your stripe account will be charged $${
          this.task.cost
        } within the next few days.`,
      )
      .addFields({ name: 'Reason', value: reason });

    // update task status
    await taskService.update(this.task.id, { status: TaskStatus.FAILED });

    await this.channel.send(embed);
  }
}
