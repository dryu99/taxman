import { MessageEmbed } from 'discord.js';
import {
  createTaskEmbed,
  formatMention,
  getUserInputReaction,
  toMinutes,
} from '../utils';
import theme from '../theme';
import { INTERNAL_ERROR, TimeoutError } from '../errors';
import { DiscordTextChannel } from '../types';
import logger from '../../lib/logger';
import Messenger from './messenger';
import { stripIndents } from 'common-tags';
import { Guild } from '../../models/guild-model';
import { TaskEvent, TaskEventStatus } from '../../models/task-event-model';
import { TaskSchedule } from '../../models/task-schedule-model';
import taskScheduleService from '../../services/task-schedule-service';
import taskEventService from '../../services/task-event-service';

enum MessageState {
  USER_CONFIRM = 'user_confirm',
  PARTNER_CONFIRM = 'partner_confirm',
  END = 'end',
}

// TODO consider tagging users outside embed (pop notification on mobile is weird otherwise)
// TODO partner confirm embed contains redundant info... make it smaller
// TODO handle errors similar to write msger
export default class TaskCheckInMessenger extends Messenger {
  private taskEvent: TaskEvent;
  private taskSchedule: TaskSchedule;
  private guild: Guild;
  private state: MessageState;

  constructor(taskEvent: TaskEvent, channel: DiscordTextChannel) {
    super(channel);
    this.taskEvent = taskEvent;
    this.taskSchedule = taskEvent.schedule;
    this.guild = taskEvent.schedule.guild;
    this.state = MessageState.USER_CONFIRM; // start state
  }

  public async start() {
    logger.dev('Starting task checkin', this.taskEvent.id);
    while (true) {
      switch (this.state) {
        case MessageState.USER_CONFIRM:
          this.state = await this.handleUserConfirm();
          break;
        case MessageState.PARTNER_CONFIRM:
          this.state = await this.handlePartnerConfirm();
          break;
        case MessageState.END:
          logger.dev('Ending task checkin', this.taskEvent.id);
          return;
        default:
          logger.error('Unknown state received', this.state);
          return; // exit message loop
      }
    }
  }

  private async handleUserConfirm(): Promise<MessageState> {
    // send reaction embed + collect reacts
    const reactionTimeoutMinutes = toMinutes(
      this.guild.settings.reactionTimeoutLength,
    );
    const taskEmbed = createTaskEmbed({
      description: this.taskSchedule.description,
      partnerUserDiscordID: this.taskSchedule.partnerUserDiscordID,
      dueAt: this.taskEvent.dueAt,
    });
    const reactEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(
        stripIndents`
            ${formatMention(
              this.taskSchedule.userDiscordID,
            )} your task is due! 🧞‍♂️

            Please confirm whether you've completed it or not.

            Your accountability partner will also be confirming your completion, so make sure to have some photo/video proof ready!
        `,
      )
      .setFooter(`You have ${reactionTimeoutMinutes} minutes to respond.`);

    try {
      await this.channel.send(
        `${formatMention(this.taskSchedule.userDiscordID)} 🔔 TASK CHECK-IN 🔔`,
        { embed: taskEmbed },
      );
      const reactMsg = await this.channel.send(reactEmbed); // TODO v13: send multiple embeds in 1 msg
      const reaction = await getUserInputReaction(
        reactMsg,
        ['👍', '👎'],
        this.taskSchedule.userDiscordID,
        reactionTimeoutMinutes,
      );

      if (!reaction) {
        // TODO do timeout stuff here like in add msger
        return MessageState.END;
      }

      // set next state
      const emojiStr = reaction.emoji.name;
      if (emojiStr === '👍') return MessageState.PARTNER_CONFIRM;
      if (emojiStr === '👎') {
        await this.failCheckIn('You admitted to not completing the task.');
        return MessageState.END;
      }

      // TODO sentry
      await this.sendErrorMsg(INTERNAL_ERROR);
      return MessageState.END;
    } catch (e) {
      logger.error(e);
      if (e instanceof TimeoutError) {
        await this.failCheckIn('You failed to to check-in in time.');
      } else {
        // TODO sentry
        await this.sendErrorMsg(INTERNAL_ERROR);
      }
      return MessageState.END;
    }
  }

  private async handlePartnerConfirm(): Promise<MessageState> {
    const reactionTimeoutMinutes = toMinutes(
      this.guild.settings.reactionTimeoutLength,
    );
    // TODO should somehow have this msg reference previous embed (so they can check what the task was)
    const reactEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(
        `Please confirm that ${formatMention(
          this.taskSchedule.userDiscordID,
        )} has completed their task.
        `,
      )
      .setFooter(`You have ${reactionTimeoutMinutes} minutes to respond.`);

    try {
      const reactMsg = await this.channel.send(
        `${formatMention(
          this.taskSchedule.partnerUserDiscordID,
        )} 🔔 TASK CHECK-IN: PARTNER CONFIRMATION 🔔`,
        { embed: reactEmbed },
      );

      const reaction = await getUserInputReaction(
        reactMsg,
        ['👍', '👎'],
        this.taskSchedule.partnerUserDiscordID,
        reactionTimeoutMinutes,
      );

      if (!reaction) {
        // TODO do timeout stuff here like in add msger
        return MessageState.END;
      }

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

      await this.sendErrorMsg(INTERNAL_ERROR);
      return MessageState.END;
    } catch (e) {
      logger.error(e);
      if (e instanceof TimeoutError) {
        await this.failCheckIn(
          "Your partner didn't respond in time and lost the opportunity to audit you.",
        );
      } else {
        await this.sendErrorMsg(INTERNAL_ERROR);
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
          this.taskSchedule.userDiscordID,
        )} Great job, you have evaded the taxman!`,
      );

    // update task event
    await taskEventService.update(this.taskEvent.id, {
      status: TaskEventStatus.SUCCESS,
    });

    // update task status
    // TODO should only be conditionally disabled based on freq, for now we'll always disable
    await taskScheduleService.update(this.taskSchedule.id, {
      enabled: false,
    });

    // TODO 'your next task is...?' or 'create a new task!'
    await this.channel.send(embed);
  }

  private async failCheckIn(reason: string): Promise<void> {
    const embed = new MessageEmbed()
      .setColor(theme.colors.error)
      .setTitle(`Task Check-In: Failure`)
      .setDescription(
        `${formatMention(
          this.taskSchedule.userDiscordID,
        )} The taxman got you...`,
      )
      // TODO use this once stripe integration is done
      // .setDescription(
      //   `${formatMention(
      //     this.task.userDiscordID,
      //   )} The taxman got you... Your stripe account will be charged $${
      //     this.task.stakes
      //   } within the next few days.`,

      .addFields({ name: 'Reason', value: reason });

    // update task event
    await taskEventService.update(this.taskEvent.id, {
      status: TaskEventStatus.FAIL,
    });

    // update task status
    // TODO should only be conditionally disabled based on freq, for now we'll always disable
    await taskScheduleService.update(this.taskSchedule.id, {
      enabled: false,
    });

    await this.channel.send(embed);
  }
}
