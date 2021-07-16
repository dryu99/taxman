import { Message, MessageEmbed } from 'discord.js';
import { DateTime } from 'luxon';
import theme from '../theme';
import { DiscordTextChannel } from '../types';

// All messenger abstractions are state machines.
export default abstract class Messenger {
  static CANCEL_KEY: string = 'cancel';
  protected channel: DiscordTextChannel;
  // protected state: TaskMessengerState;

  constructor(channel: DiscordTextChannel) {
    this.channel = channel;
  }

  // start message workflow
  public abstract prompt();

  protected async sendErrorMsg(description): Promise<void> {
    const errorEmbed = new MessageEmbed().setColor(theme.colors.error);
    // if (title) errorEmbed.setTitle(title);
    if (description) errorEmbed.setDescription(description);
    await this.channel.send(errorEmbed);
  }

  // TODO this should go in a child class or another class (TaskWriteMessenger?)
  protected validateDate(date: DateTime): boolean {
    if (!date.isValid) {
      this.sendErrorMsg(
        `Please format your response like this: \`<YYYY-MM-DD> <HH:MM>\``,
      );
      return false;
    }

    // TODO if date given is in the past...

    return true;
  }
}
