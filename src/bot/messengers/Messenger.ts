import { Message, MessageEmbed } from 'discord.js';
import theme from '../theme';
import { DiscordTextChannel } from '../types';

export default abstract class Messenger {
  static SUPPORT_ERROR_MSG: string =
    'Something went wrong... Please contact support for help.';

  protected channel: DiscordTextChannel;
  // protected state: TaskMessengerState;

  constructor(channel: DiscordTextChannel) {
    this.channel = channel;
  }

  public abstract prompt();

  protected async sendCollectTimeoutMsg(
    title?: string,
    description?: string,
  ): Promise<Message> {
    const timeoutEmbed = new MessageEmbed().setColor(theme.colors.error);
    if (title) timeoutEmbed.setTitle(title);
    if (description) timeoutEmbed.setTitle(description);
    return await this.channel.send(timeoutEmbed);
  }

  protected async sendErrorMsg(description): Promise<void> {
    const errorEmbed = new MessageEmbed().setColor(theme.colors.error);
    // if (title) errorEmbed.setTitle(title);
    if (description) errorEmbed.setTitle(description);
    await this.channel.send(errorEmbed);
  }
}
