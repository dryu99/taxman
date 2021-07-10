import { MessageEmbed, MessageReaction, TextChannel } from 'discord.js';
import { CommandoClient } from 'discord.js-commando';
import { Task } from '../models/Task';
import { getMentionString } from '../utils/utils';
import theme from './theme';

enum MessageState {
  IDLE = 'idle',
  AUTHOR_CHECK_IN = 'author_check_in',
  AUTHOR_CHECK_IN_TIMEOUT = 'author_check_in_timeout',
  AUTHOR_CHECK_IN_FAILURE = 'author_check_in_failure',
  PARTNER_CONFIRM = 'partner_confirm',
  PARTNER_CONFIRM_TIMEOUT = 'partner_confirm_timeout',
  PARTNER_CONFIRM_FAILURE = 'partner_confirm_failure',
  SUCCESS = 'success',
}

export default class TaskCheckInMessenger {
  private task: Task;
  private channel: TextChannel;
  private client: CommandoClient;
  private state: MessageState;

  constructor(task: Task, client: CommandoClient, channel: TextChannel) {
    this.task = task;
    this.client = client;
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
          console.log('exiting message loop');
          return; // exit message loop
        }
        default: {
          console.error(
            'unknown taskcheckinmessengerstate received',
            this.state,
          );
          return; // exit message loop
          // TODO sentry
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
        `${getMentionString(this.task.authorID)} Your task is due!
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
          value: getMentionString(this.task.partnerID),
        },
        {
          name: 'Money at stake',
          value: `$${this.task.cost}`,
        },
      );

    const msg = await this.channel.send(embed);
    msg
      .react('👍')
      .then(() => msg.react('👎'))
      .catch((e) => console.error('One of the emojis failed to react:', e));

    try {
      const collectedReactions = await msg.awaitReactions(
        (reaction, user) =>
          ['👍', '👎'].includes(reaction.emoji.name) &&
          user.id === this.task.authorID,
        {
          max: 1,
          time: reactionTimeLimitMinutes * 60 * 1000,
          errors: ['time'],
        },
      );

      const reaction = collectedReactions.first();

      // update message state
      return reaction?.emoji.name === '👍'
        ? MessageState.PARTNER_CONFIRM
        : MessageState.AUTHOR_CHECK_IN_FAILURE;
    } catch (e) {
      // TODO may need to handle other errors here too
      return MessageState.AUTHOR_CHECK_IN_TIMEOUT;
    }
  }

  private async promptConfirmWithPartner(): Promise<MessageState> {
    const reactionTimeLimitMinutes = 5;

    const embed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle(`Task Check-In: Partner Confirmation`)
      .setDescription(
        `${getMentionString(
          this.task.partnerID,
        )} Please confirm that ${getMentionString(
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
          value: getMentionString(this.task.authorID),
        },
        {
          name: 'Money at stake',
          value: `$${this.task.cost}`,
        },
      );

    const msg = await this.channel.send(embed);
    msg // TODO abstract this logic
      .react('👍')
      .then(() => msg.react('👎'))
      .catch((e) => console.error('One of the emojis failed to react:', e));

    try {
      // TODO abstract this logic
      const collectedReactions = await msg.awaitReactions(
        (reaction, user) =>
          ['👍', '👎'].includes(reaction.emoji.name) &&
          user.id === this.task.partnerID,
        {
          max: 1,
          time: reactionTimeLimitMinutes * 60 * 1000,
          errors: ['time'],
        },
      );

      const reaction = collectedReactions.first();

      // update message state
      return reaction?.emoji.name === '👍'
        ? MessageState.SUCCESS
        : MessageState.PARTNER_CONFIRM_FAILURE;
    } catch (e) {
      return MessageState.PARTNER_CONFIRM_TIMEOUT;
    }
  }

  private async sendCheckInSuccess(notes?: string): Promise<MessageState> {
    const embed = new MessageEmbed()
      .setColor(theme.colors.success)
      .setTitle(`Task Check-In: Success`)
      .setDescription(
        `${getMentionString(
          this.task.authorID,
        )} Great job, you have evaded the taxman!`,
      );

    if (notes) {
      embed.addFields({ name: 'Notes', value: notes });
    }
    // TODO 'your next task is...?' or 'create a new task!'
    const msg = await this.channel.send(embed);
    return MessageState.IDLE;
  }

  private async sendCheckInFail(reason: string): Promise<MessageState> {
    const embed = new MessageEmbed()
      .setColor(theme.colors.error)
      .setTitle(`Task Check-In: Failure`)
      .setDescription(
        `${getMentionString(
          this.task.authorID,
        )} The taxman got you... Your stripe account will be charged $${
          this.task.cost
        } within the next few days.`,
      )
      .addFields({ name: 'Reason', value: reason });

    const msg = await this.channel.send(embed);
    return MessageState.IDLE;
  }
}
