import { MessageEmbed } from 'discord.js';
import { Task, TaskStatus } from '../../models/TaskModel';
import { formatMention, getUserInputReaction } from '../utils';
import theme from '../theme';
import taskService from '../../services/task-service';
import { TimeoutError } from '../errors';
import { DiscordTextChannel } from '../types';
import logger from '../../lib/logger';

enum MessageState {
  IDLE = 'idle',
  AUTHOR_CHECK_IN = 'author_check_in',
  AUTHOR_CHECK_IN_TIMEOUT = 'author_check_in_timeout',
  AUTHOR_CHECK_IN_FAILURE = 'author_check_in_failure',
  PARTNER_CONFIRM = 'partner_confirm',
  PARTNER_CONFIRM_TIMEOUT = 'partner_confirm_timeout',
  PARTNER_CONFIRM_FAILURE = 'partner_confirm_failure',
  SUCCESS = 'success',
  ERROR = 'error',
}

// TODO consider tagging users outside embed (pop notification on mobile is weird otherwise)
// TODO partner confirm embed contains redundant info... make it smaller
// TODO refactor to extend messenger and make it look more like other ones
export default class TaskCheckInMessenger {
  private task: Task;
  private channel: DiscordTextChannel;
  private state: MessageState;

  constructor(task: Task, channel: DiscordTextChannel) {
    this.task = task;
    this.channel = channel;
    this.state = MessageState.AUTHOR_CHECK_IN; // start state
  }

  // TODO consider making state of type { type: MessageState, payload: any }
  //      may be more maintainable
  public async prompt() {
    while (true) {
      switch (this.state) {
        case MessageState.AUTHOR_CHECK_IN: {
          this.state = await this.promptCheckInWithAuthor();
          break;
        }
        case MessageState.AUTHOR_CHECK_IN_TIMEOUT: {
          this.state = await this.sendCheckInFail(
            'You failed to to check-in in time.',
          );
          break;
        }
        case MessageState.AUTHOR_CHECK_IN_FAILURE: {
          this.state = await this.sendCheckInFail(
            'You admitted to not completing the task.',
          );
          break;
        }
        case MessageState.PARTNER_CONFIRM: {
          this.state = await this.promptConfirmWithPartner();
          break;
        }
        case MessageState.PARTNER_CONFIRM_TIMEOUT: {
          this.state = await this.sendCheckInSuccess(
            "Your partner didn't respond in time and lost the opportunity to audit you.",
          );
          break;
        }
        case MessageState.PARTNER_CONFIRM_FAILURE: {
          this.state = await this.sendCheckInFail(
            'Your partner rejected your check-in.',
          );
          break;
        }
        case MessageState.SUCCESS: {
          this.state = await this.sendCheckInSuccess();
          break;
        }
        case MessageState.IDLE: {
          logger.info('exiting message loop');
          return; // exit message loop
        }
        case MessageState.ERROR: {
          // TODO sentry
          return; // exit message loop
        }
        default: {
          logger.error('Unknown state received', this.state);
          return; // exit message loop
        }
      }
    }
  }

  private async promptCheckInWithAuthor(): Promise<MessageState> {
    const reactionTimeLimitMinutes = 5;

    const embed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle(`Task Check-In`)
      .setDescription(
        `${formatMention(this.task.authorID)} Your task is due!
        Have you completed it?
        Remember to provide photographic proof for your accountability partner! 
        You have ${reactionTimeLimitMinutes} minutes to respond.`,
      )
      // TODO abstract this away
      .addFields(
        { name: 'Task', value: this.task.name },
        {
          name: 'Due Date',
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

    const msg = await this.channel.send(embed);

    try {
      const reaction = await getUserInputReaction(
        msg,
        ['👍', '👎'],
        this.task.authorID,
        reactionTimeLimitMinutes,
      );

      const emojiStr = reaction.emoji.name;
      if (emojiStr === '👍') return MessageState.PARTNER_CONFIRM;
      if (emojiStr === '👎') return MessageState.AUTHOR_CHECK_IN_FAILURE;
      return MessageState.ERROR;
    } catch (e) {
      if (e instanceof TimeoutError)
        return MessageState.AUTHOR_CHECK_IN_TIMEOUT;
      return MessageState.ERROR;
    }
  }

  private async promptConfirmWithPartner(): Promise<MessageState> {
    const reactionTimeLimitMinutes = 5;

    const embed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle(`Task Check-In: Partner Confirmation`)
      .setDescription(
        `${formatMention(
          this.task.partnerID,
        )} Please confirm that ${formatMention(
          this.task.authorID,
        )} has completed their task. 
        You have ${reactionTimeLimitMinutes} minutes to respond.`,
      )
      .addFields(
        { name: 'Task', value: this.task.name },
        {
          name: 'Due Date',
          value: this.task.dueDate.toDateString(),
        },
        {
          name: 'Task Author',
          value: formatMention(this.task.authorID),
        },
        {
          name: 'Money at stake',
          value: `$${this.task.cost}`,
        },
      );

    const msg = await this.channel.send(embed);

    try {
      const reaction = await getUserInputReaction(
        msg,
        ['👍', '👎'],
        this.task.partnerID,
        reactionTimeLimitMinutes,
      );

      const emojiStr = reaction.emoji.name;
      if (emojiStr === '👍') return MessageState.SUCCESS;
      if (emojiStr === '👎') return MessageState.PARTNER_CONFIRM_FAILURE;
      return MessageState.ERROR;
    } catch (e) {
      if (e instanceof TimeoutError)
        return MessageState.PARTNER_CONFIRM_TIMEOUT;
      return MessageState.ERROR;
    }
  }

  private async sendCheckInSuccess(notes?: string): Promise<MessageState> {
    const embed = new MessageEmbed()
      .setColor(theme.colors.success)
      .setTitle(`Task Check-In: Success`)
      .setDescription(
        `${formatMention(
          this.task.authorID,
        )} Great job, you have evaded the taxman!`,
      );

    if (notes) {
      embed.addFields({ name: 'Notes', value: notes });
    }

    // update task status
    await taskService.update(this.task.id, { status: TaskStatus.COMPLETED });

    // TODO 'your next task is...?' or 'create a new task!'
    const msg = await this.channel.send(embed);
    return MessageState.IDLE;
  }

  private async sendCheckInFail(reason: string): Promise<MessageState> {
    const embed = new MessageEmbed()
      .setColor(theme.colors.error)
      .setTitle(`Task Check-In: Failure`)
      .setDescription(
        `${formatMention(
          this.task.authorID,
        )} The taxman got you... Your stripe account will be charged $${
          this.task.cost
        } within the next few days.`,
      )
      .addFields({ name: 'Reason', value: reason });

    // update task status
    await taskService.update(this.task.id, { status: TaskStatus.FAILED });

    const msg = await this.channel.send(embed);
    return MessageState.IDLE;
  }
}
