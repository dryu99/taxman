import { MessageEmbed } from 'discord.js';
import { Task, TaskStatus } from '../../models/TaskModel';
import {
  createTaskEmbed,
  formatMention,
  getUserInputReaction,
  toMinutes,
} from '../utils';
import theme from '../theme';
import taskService from '../../services/task-service';
import { INTERNAL_ERROR, TimeoutError } from '../errors';
import { DiscordTextChannel } from '../types';
import logger from '../../lib/logger';
import Messenger from './Messenger';
import { stripIndent } from 'common-tags';
import { Guild } from '../../models/GuildModel';

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
  private guild: Guild;

  constructor(task: Task, channel: DiscordTextChannel, guild: Guild) {
    super(channel);
    this.task = task;
    this.state = MessageState.USER_CONFIRM; // start state
    this.guild = guild;
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
    // send reaction embed + collect reacts
    const reactionTimeoutMinutes = toMinutes(
      this.guild.settings.reactionTimeoutLength,
    );
    const taskEmbed = createTaskEmbed(this.task);
    const reactEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(
        stripIndent`
            ${formatMention(this.task.userDiscordID)} your task is due! 🧞‍♂️

            Please confirm whether you've completed it or not.

            Your accountability partner will also be confirming your completion, so make sure to have some photo/video proof ready!
        `,
      )
      .setFooter(`You have ${reactionTimeoutMinutes} minutes to respond.`);

    try {
      await this.channel.send(
        `${formatMention(this.task.userDiscordID)} 🔔 TASK CHECK-IN 🔔`,
        { embed: taskEmbed },
      );
      const reactMsg = await this.channel.send(reactEmbed); // TODO v13: send multiple embeds in 1 msg
      const reaction = await getUserInputReaction(
        reactMsg,
        ['👍', '👎'],
        this.task.userDiscordID,
        reactionTimeoutMinutes, // TODO pass settings time limit here
      );

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
          this.task.userDiscordID,
        )} has completed their task. 
        `,
      )
      .setFooter(`You have ${reactionTimeoutMinutes} minutes to respond.`);

    try {
      const reactMsg = await this.channel.send(
        `${formatMention(
          this.task.partnerUserDiscordID,
        )} 🔔 TASK CHECK-IN: PARTNER CONFIRMATION 🔔`,
        { embed: reactEmbed },
      );

      const reaction = await getUserInputReaction(
        reactMsg,
        ['👍', '👎'],
        this.task.partnerUserDiscordID,
        reactionTimeoutMinutes,
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
          this.task.stakes
        } within the next few days.`,
      )
      .addFields({ name: 'Reason', value: reason });

    // update task status
    await taskService.update(this.task.id, { status: TaskStatus.FAILED });

    await this.channel.send(embed);
  }
}
