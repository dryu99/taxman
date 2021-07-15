import { MessageReaction, MessageEmbed } from 'discord.js';
import { DateTime } from 'luxon';
import theme from '../theme';
import { DiscordTextChannel } from '../types';
import { getUserInputReaction, getUserInputMessage } from '../utils';

export default class TaskPrompter {
  private channel: DiscordTextChannel;
  private userID: string;

  constructor(channel: DiscordTextChannel, userID: string) {
    this.channel = channel;
    this.userID = userID;
  }

  public async promptReactLegend(): Promise<MessageReaction> {
    const reactLegendEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle('Edit Task')
      .setDescription(
        // TODO rephrase this since you just copied it
        // TODO also use the template literal lib suggested in docs to format nicely
        `Your task is shown above! To edit your task, use one of the emojis on this message. 
        Be sure to confirm your new task below.
        (Note: you cannot edit the cost after initial task creation)

        ✏️ Edit title
        ⏰ Edit due date
        
        ✅ Confirm
        ❌ Cancel
        `,
      );
    const reactLegendMsg = await this.channel.send(reactLegendEmbed);
    const reaction = await getUserInputReaction(
      reactLegendMsg,
      ['✏️', '⏰', '✅', '❌'],
      this.userID,
    );

    // remove reaction (looks cleaner that way)
    reaction.users.remove(this.userID); // async
    return reaction;
  }

  public async promptDescription(): Promise<string> {
    const descriptionEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(`Please provide a brief description of your task.`);
    await this.channel.send(descriptionEmbed);

    const userInputMsg = await getUserInputMessage(this.channel, this.userID);
    return userInputMsg.content;
  }

  public async promptDeadline(): Promise<Date> {
    const deadlineEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle('Edit Deadline')
      .setDescription(
        `
        Please provide the deadline for your task.
        Format your response like this: \`<YYYY-MM-DD> <HH:MM>\`
        `,
      );
    await this.channel.send(deadlineEmbed);

    // collect user input
    let dueDate: DateTime | undefined;
    while (!dueDate || !dueDate.isValid) {
      const userInputMsg = await getUserInputMessage(this.channel, this.userID);

      const dueDateStr = userInputMsg.content;
      const [date, time] = dueDateStr.trim().split(' ') as [string?, string?];

      dueDate = DateTime.fromISO(`${date}T${time}`, {
        zone: 'America/Los_Angeles', // TODO change to use user input
      });

      if (!dueDate.isValid) {
        const dateErrorEmbed = new MessageEmbed()
          .setColor(theme.colors.error)
          .setDescription(
            `Please format your response like this: \`<YYYY-MM-DD> <HH:MM>\``,
          );

        await this.channel.send(dateErrorEmbed);
      }
    }

    return dueDate.toJSDate();
  }
}
