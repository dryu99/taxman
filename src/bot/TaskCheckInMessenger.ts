import { MessageEmbed, MessageReaction, TextChannel } from 'discord.js';
import { CommandoClient } from 'discord.js-commando';
import { Task } from '../services/tasks';

export default class TaskCheckInMessenger {
  private task: Task;
  private channel: TextChannel;
  private client: CommandoClient;
  // private state: TaskChec;

  constructor(task: Task, client: CommandoClient, channel: TextChannel) {
    this.task = task;
    this.client = client;
    this.channel = channel;
  }

  // TODO use state machine
  //   - add field called 'state' (enum)
  //   - use while loop and switch statement in prompt()
  //   - change state in each event (e.g. promptCheckInWithAuthor: success -> CONFIRM_PARTNER, fail -> FAIL)
  public async prompt() {
    const taskCheckInReaction = await this.promptCheckInWithAuthor();
    if (!taskCheckInReaction) return; // TODO sentry

    if (taskCheckInReaction.emoji.name === '👍') {
      const partnerConfirmReaction = await this.promptConfirmWithPartner();
      if (!partnerConfirmReaction) return; // TODO sentry

      if (partnerConfirmReaction.emoji.name === '👍') {
        this.sendCheckInSuccess();
      } else {
        this.sendCheckInFail();
      }
    } else {
      this.sendCheckInFail();
    }
  }

  private async promptCheckInWithAuthor(): Promise<
    MessageReaction | undefined
  > {
    const embed = new MessageEmbed()
      .setColor('#0099ff')
      .setTitle('TASK CHECK IN')
      .setDescription(
        `<@${this.task.authorID}> Your task is due: ${this.task.name}. Are you doing it? Remember to provide photographic proof!`,
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
