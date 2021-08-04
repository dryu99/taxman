import { Message, MessageEmbed } from 'discord.js';
import theme from '../theme';
import { DiscordTextChannel } from '../types';

export default abstract class Messenger {
  protected channel: DiscordTextChannel;

  constructor(channel: DiscordTextChannel) {
    this.channel = channel;
  }

  public abstract start(): void;

  protected async sendErrorMsg(description: string): Promise<void> {
    const errorEmbed = new MessageEmbed().setColor(theme.colors.error);
    // if (title) errorEmbed.setTitle(title);
    if (description) errorEmbed.setDescription(description);
    await this.channel.send(errorEmbed);
  }
}
