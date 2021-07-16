import { Message, MessageEmbed, MessageReaction } from 'discord.js';
import EditCommand from '../../commands/tasks/edit';
import { Task } from '../../models/TaskModel';
import theme from '../theme';
import { DiscordTextChannel } from '../types';
import { getUserInputReaction } from '../utils';

export default abstract class Messenger {
  protected channel: DiscordTextChannel;
  // protected state: TaskMessengerState;

  constructor(channel: DiscordTextChannel) {
    this.channel = channel;
  }

  public abstract prompt();

  protected async sendTimeoutMsg(
    title?: string,
    description?: string,
  ): Promise<Message> {
    const timeoutEmbed = new MessageEmbed().setColor(theme.colors.error);
    if (title) timeoutEmbed.setTitle(title);
    if (description) timeoutEmbed.setTitle(description);
    return await this.channel.send(timeoutEmbed);
  }

  protected async sendErrorMsg(description: string): Promise<void> {
    await this.channel.send(`Interal Bot Error: ${description}`);
  }
}
