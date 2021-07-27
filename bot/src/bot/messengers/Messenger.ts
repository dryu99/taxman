import { Message, MessageEmbed } from 'discord.js';
import theme from '../theme';
import { DiscordTextChannel } from '../types';

export default abstract class Messenger {
  protected channel: DiscordTextChannel;
  // protected state: TaskMessengerState;

  constructor(channel: DiscordTextChannel) {
    this.channel = channel;
  }

  public abstract prompt(): void;

  protected async sendCollectTimeoutMsg(
    title?: string,
    description?: string,
  ): Promise<Message> {
    const timeoutEmbed = new MessageEmbed().setColor(theme.colors.error);
    if (title) timeoutEmbed.setTitle(title);
    if (description) timeoutEmbed.setTitle(description);
    return await this.channel.send(timeoutEmbed);
  }

  protected async sendErrorMsg(description: string): Promise<void> {
    const errorEmbed = new MessageEmbed().setColor(theme.colors.error);
    // if (title) errorEmbed.setTitle(title);
    if (description) errorEmbed.setTitle(description);
    await this.channel.send(errorEmbed);
  }
}
