import { MessageEmbed, MessageReaction, TextChannel } from 'discord.js';
import { CommandoClient } from 'discord.js-commando';
import { Task } from '../services/tasks';

enum MessageState {
  IDLE = 'idle',
  AUTHOR_CHECK_IN = 'author_check_in',
  AUTHOR_CHECK_IN_TIMEOUT = 'author_check_in_timeout',
  PARTNER_CONFIRM = 'partner_confirm',
  PARTNER_CONFIRM_TIMEOUT = 'partner_confirm_timeout',
  SUCCESS = 'success',
  FAILURE = 'failure',
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

  public async prompt() {
    while (true) {
      switch (this.state) {
        case MessageState.AUTHOR_CHECK_IN: {
          await this.promptCheckInWithAuthor();
          break;
        }
        case MessageState.AUTHOR_CHECK_IN_TIMEOUT: {
          await this.sendCheckInFail();
          break;
        }
        case MessageState.PARTNER_CONFIRM: {
          await this.promptConfirmWithPartner();
          break;
        }
        case MessageState.PARTNER_CONFIRM_TIMEOUT: {
          await this.sendCheckInFail();
          break;
        }
        case MessageState.SUCCESS: {
          await this.sendCheckInSuccess();
          break;
        }
        case MessageState.FAILURE: {
          await this.sendCheckInFail();
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

  private async promptCheckInWithAuthor() {
    const reactionTimeLimitMinutes = 0.1;

    const embed = new MessageEmbed()
      .setColor('#5bb0e4')
      .setTitle('TASK CHECK IN')
      .setDescription(
        `<@${this.task.authorID}> Your task is due: ${this.task.name}. 
        Have you completed it? 
        Remember to provide photographic proof for your accountability partner! 
        You have ${reactionTimeLimitMinutes} minutes to respond.`,
      );

    const msg = await this.channel.send(embed);

    // TODO improve async logic below (can prob do both at once)
    // react
    msg
      .react('👍')
      .then(() => msg.react('👎'))
      .catch((e) => console.error('One of the emojis failed to react:', e));

    // handle author reaction
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
      this.state =
        reaction?.emoji.name === '👍'
          ? MessageState.PARTNER_CONFIRM
          : MessageState.FAILURE;
    } catch (e) {
      // TODO may need to handle other errors here too
      this.state = MessageState.AUTHOR_CHECK_IN_TIMEOUT;
    }
  }

  private async promptConfirmWithPartner() {
    const msg = await this.channel.send(
      `<@${this.task.partnerID}> Please confirm that <@${this.task.authorID}> has completed their task.`,
    );

    msg
      .react('👍')
      .then(() => msg.react('👎'))
      .catch((e) => console.error('One of the emojis failed to react:', e));

    try {
      const collectedReactions = await msg.awaitReactions(
        (reaction, user) =>
          ['👍', '👎'].includes(reaction.emoji.name) &&
          user.id === this.task.partnerID,
        {
          max: 1,
          time: 15 * 60 * 1000, // 15 min
          errors: ['time'],
        },
      );

      const reaction = collectedReactions.first();

      // update message state
      this.state =
        reaction?.emoji.name === '👍'
          ? MessageState.SUCCESS
          : MessageState.FAILURE;
    } catch (e) {
      this.state = MessageState.PARTNER_CONFIRM_TIMEOUT;
    }
  }

  private async sendCheckInSuccess() {
    const msg = await this.channel.send(
      `<@${this.task.authorID}> Great job, you have evaded the taxman!`,
    );
    this.state = MessageState.IDLE;
  }

  private async sendCheckInFail() {
    const msg = await this.channel.send(
      `<@${this.task.authorID}> The taxman got you... Your account will be charged in the following days.`,
    );
    this.state = MessageState.IDLE;
  }
}
