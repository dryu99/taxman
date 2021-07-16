import { MessageReaction, MessageEmbed, User, Message } from 'discord.js';
import { DateTime } from 'luxon';
import theme from '../theme';
import { DiscordTextChannel } from '../types';
import { getUserInputReaction, getUserInputMessage } from '../utils';

export enum EditAction {
  DESCRIPTION = 'edit_description',
  DUE_DATE = 'edit_due_date',
  PARTNER = 'edit_partner',
  STAKES = 'edit_stakes',
  CONFIRM = 'confirm',
  CANCEL = 'cancel',
}

export enum TaskLegendType {
  CREATE_NEW = 'create_new',
  EDIT = 'edit',
}

const EMOJI_ACTION_MAP: { [emoji: string]: EditAction } = {
  '✏️': EditAction.DESCRIPTION,
  '⏰': EditAction.DUE_DATE,
  '👯': EditAction.PARTNER,
  '💰': EditAction.STAKES,
  '✅': EditAction.CONFIRM,
  '❌': EditAction.CANCEL,
};

// Provides input collection methods related to task creation/editing
// Should be instantiated for each unique message workflow (i.e. per user)
export default class TaskPrompter {
  protected channel: DiscordTextChannel;
  protected userID: string;
  private legendType: TaskLegendType;

  constructor(
    channel: DiscordTextChannel,
    userID: string,
    legendType: TaskLegendType,
  ) {
    this.channel = channel;
    this.userID = userID;
    this.legendType = legendType;
  }

  public async promptEditAction(): Promise<EditAction> {
    const isCreateLegend = this.legendType === TaskLegendType.CREATE_NEW;

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

  public async promptDescription(): Promise<Message> {
    const descriptionEmbed = this.createPromptEmbed(
      `Please provide a brief description of your task.`,
    );
    await this.channel.send(descriptionEmbed);
    return await getUserInputMessage(this.channel, this.userID);
  }

  public async promptDeadline(): Promise<Message> {
    const currISODate = new Date().toISOString();
    const dateExample =
      currISODate.slice(0, 10) + ' ' + currISODate.slice(11, 16);
    // TODO shoulnd't use iso date lmao

    const deadlineEmbed = this.createPromptEmbed(`
      Please provide the deadline for your task.
      Format your response like this: \`<YYYY-MM-DD> <HH:MM>\`

      Example: \`${dateExample}\`
      `);
    await this.channel.send(deadlineEmbed);
    return await getUserInputMessage(this.channel, this.userID);
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
        const stakesErrorEmbed = new MessageEmbed()
          .setColor(theme.colors.error)
          .setDescription(`Please give a valid dollar amount.`);

        await this.channel.send(stakesErrorEmbed);
      }
    }
    return stakes;
  }

  private createPromptEmbed(description: string): MessageEmbed {
    const embed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(description);

    if (this.legendType === TaskLegendType.CREATE_NEW) {
      embed.setFooter('Type `cancel` to stop');
    }
    return embed;
  }
}
