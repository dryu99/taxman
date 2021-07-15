import { Message, MessageEmbed } from 'discord.js';
import EditCommand from '../../commands/tasks/edit';
import { Task } from '../../models/TaskModel';
import theme from '../theme';
import { DiscordTextChannel } from '../types';

export default abstract class Messenger {
  protected channel: DiscordTextChannel;
  // protected state: TaskMessengerState;

  constructor(
    channel: DiscordTextChannel,
    // initialState: TaskMessengerState,
  ) {
    this.channel = channel;
    // this.state = initialState;
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
}
