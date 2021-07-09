import { MessageEmbed, MessageReaction, TextChannel } from 'discord.js';
import { CommandoClient } from 'discord.js-commando';
import { Task } from '../services/tasks';

enum MessageState {
  IDLE = 'idle',
  AUTHOR_CHECK_IN = 'author_check_in',
  PARTNER_CONFIRM = 'partner_confirm',
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
    this.state = MessageState.IDLE;
  }

  // TODO use state machine
  //   - add field called 'state' (enum)
  //   - use while loop and switch statement in prompt()
  //   - change state in each event (e.g. promptCheckInWithAuthor: success -> CONFIRM_PARTNER, fail -> FAIL)
  public async prompt() {
    this.state = MessageState.AUTHOR_CHECK_IN; // start state

    while (this.state !== MessageState.IDLE) {
      switch (this.state) {
        case MessageState.AUTHOR_CHECK_IN: {
          const reaction = await this.promptCheckInWithAuthor();
          this.state =
            reaction?.emoji.name === '👍'
              ? MessageState.PARTNER_CONFIRM
              : MessageState.FAILURE;
          break;
        }
        case MessageState.PARTNER_CONFIRM: {
          const reaction = await this.promptConfirmWithPartner();
          this.state =
            reaction?.emoji.name === '👍'
              ? MessageState.SUCCESS
              : MessageState.FAILURE;
          break;
        }
        case MessageState.SUCCESS: {
          this.sendCheckInSuccess();
          this.state = MessageState.IDLE;
          break;
        }
        case MessageState.FAILURE: {
          this.sendCheckInFail();
          this.state = MessageState.IDLE;
          break;
        }
        default: {
          console.error(
            'unknown taskcheckinmessengerstate received',
            this.state,
          );
          // TODO sentry
        }
      }
    }

    console.log('exiting taskcheckinmessenger message loop');
  }

  private async promptCheckInWithAuthor(): Promise<
    MessageReaction | undefined
  > {
    const embed = new MessageEmbed()
      .setColor('#0099ff')
      .setTitle('TASK CHECK IN')
      .setDescription(
        `<@${this.task.authorID}> Your task is due: ${this.task.name}. Have you completed it? Remember to provide photographic proof for your accountability partner!`,
      );

    const msg = await this.channel.send(embed);

    // TODO improve async logic below (can prob do both at once)
    // react
    msg
      .react('👍')
      .then(() => msg.react('👎'))
      .catch((e) => console.error('One of the emojis failed to react:', e));

    // handle author reaction
    const collectedReactions = await msg.awaitReactions(
      (reaction, user) =>
        ['👍', '👎'].includes(reaction.emoji.name) &&
        user.id === this.task.authorID,
      {
        max: 1,
        time: 15 * 60 * 1000, // 15 min
        errors: ['time'],
      },
    );

    const reaction = collectedReactions.first();
    return reaction;
  }

  private async promptConfirmWithPartner(): Promise<
    MessageReaction | undefined
  > {
    const msg = await this.channel.send(
      `<@${this.task.partnerID}> Please confirm that <@${this.task.authorID}> has completed their task.`,
    );

    msg
      .react('👍')
      .then(() => msg.react('👎'))
      .catch((e) => console.error('One of the emojis failed to react:', e));

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
    return reaction;
  }

  private async sendCheckInSuccess() {
    const msg = await this.channel.send(
      `<@${this.task.authorID}> Great job, you have evaded the taxman!`,
    );
  }

  private async sendCheckInFail() {
    const msg = await this.channel.send(
      `<@${this.task.authorID}> The taxman got you... Your account will be charged in the following days.`,
    );
  }
}
