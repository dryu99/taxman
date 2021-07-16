import { MessageReaction, MessageEmbed, User } from 'discord.js';
import { DateTime } from 'luxon';
import theme from '../theme';
import { DiscordTextChannel } from '../types';
import { getUserInputReaction, getUserInputMessage } from '../utils';

export enum TaskLegendAction {
  EDIT_DESCRIPTION = 'edit_description',
  EDIT_DUE_DATE = 'edit_due_date',
  EDIT_PARTNER = 'edit_partner',
  EDIT_STAKES = 'edit_stakes',
  CONFIRM = 'confirm',
  CANCEL = 'cancel',
}

export enum TaskLegendType {
  CREATE_NEW = 'create_new',
  EDIT = 'edit',
}

const EMOJI_ACTION_MAP: { [emoji: string]: TaskLegendAction } = {
  '✏️': TaskLegendAction.EDIT_DESCRIPTION,
  '⏰': TaskLegendAction.EDIT_DUE_DATE,
  '👯': TaskLegendAction.EDIT_PARTNER,
  '💰': TaskLegendAction.EDIT_STAKES,
  '✅': TaskLegendAction.CONFIRM,
  '❌': TaskLegendAction.CANCEL,
};

export default class TaskPrompter {
  private channel: DiscordTextChannel;
  private userID: string;

  constructor(channel: DiscordTextChannel, userID: string) {
    this.channel = channel;
    this.userID = userID;
  }

  // TODO this should go somewhere else lmao maybe parent class
  public async promptReaction(
    title: string,
    description: string,
    emojis: string[],
  ): Promise<MessageReaction> {
    const reactEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle(title)
      .setDescription(description);

    const reactMsg = await this.channel.send(reactEmbed);
    const reaction = await getUserInputReaction(reactMsg, emojis, this.userID);
    reaction.users.remove(this.userID); // async
    return reaction;
  }

  public async promptTaskLegendAction(
    legendType: TaskLegendType,
  ): Promise<TaskLegendAction> {
    const isCreateLegend = legendType === TaskLegendType.CREATE_NEW;

    const reactEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle('Task Confirmation').setDescription(`      
      Your task is shown above! To edit your task, use one of the emojis on this message. 
      Be sure to confirm your new task below.
      (Note: you cannot edit stakes or partner after initial task creation)

      ✏️ Edit title
      ⏰ Edit due date
      ${isCreateLegend ? '👯 Edit accountability partner' : ''}
      ${isCreateLegend ? '💰 Edit stakes' : ''}      
      
      ✅ Confirm
      ❌ Cancel    
      `);

    const emojis = isCreateLegend
      ? ['✏️', '⏰', '👯', '💰', '✅', '❌']
      : ['✏️', '⏰', '✅', '❌'];

    const reactMsg = await this.channel.send(reactEmbed);
    const reaction = await getUserInputReaction(reactMsg, emojis, this.userID);
    reaction.users.remove(this.userID); // async
    return EMOJI_ACTION_MAP[reaction.emoji.name];
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
    const currISODate = new Date().toISOString();
    const dateExample =
      currISODate.slice(0, 10) + ' ' + currISODate.slice(11, 16);
    // TODO shoulnd't use iso date lmao

    const deadlineEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(
        `
        Please provide the deadline for your task.
        Format your response like this: \`<YYYY-MM-DD> <HH:MM>\`

        Example: \`${dateExample}\`
        `,
      );
    await this.channel.send(deadlineEmbed);

    let dueDate: DateTime | undefined;
    while (!dueDate || !dueDate.isValid) {
      // collect user input
      const userInputMsg = await getUserInputMessage(this.channel, this.userID);
      const dueDateStr = userInputMsg.content;
      const [date, time] = dueDateStr.trim().split(' ') as [string?, string?];
      dueDate = DateTime.fromISO(`${date}T${time}`, {
        zone: 'America/Los_Angeles', // TODO change to use user input
      });

      // send error msg on bad input
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

  public async promptPartner(): Promise<User> {
    const partnerEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(`Who do you want to be your accountability partner?`);
    await this.channel.send(partnerEmbed);

    let taggedUser: User | undefined;
    while (!taggedUser) {
      // collect user input
      const userInputMsg = await getUserInputMessage(this.channel, this.userID);
      taggedUser = userInputMsg.mentions.users.first();

      // send error msg on bad input
      if (!taggedUser) {
        const partnerErrorEmbed = new MessageEmbed()
          .setColor(theme.colors.error)
          .setDescription(`Please mention your partner with \`@\``);

        await this.channel.send(partnerErrorEmbed);
      }
    }
    return taggedUser;
  }

  // TODO have to make this optional
  public async promptStakes(): Promise<number> {
    const stakesEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(`How much are you going to stake?`);
    await this.channel.send(stakesEmbed);

    let stakes: number | undefined;
    while (!stakes || isNaN(stakes)) {
      // collect user input
      const userInputMsg = await getUserInputMessage(this.channel, this.userID);
      const stakesStr = userInputMsg.content;
      stakes = Number(stakesStr);

      // send error msg on bad input
      if (isNaN(stakes)) {
        const stkaesErrorEmbed = new MessageEmbed()
          .setColor(theme.colors.error)
          .setDescription(`Please give a valid dollar amount.`);

        await this.channel.send(stkaesErrorEmbed);
      }
    }
    return stakes;
  }
}
