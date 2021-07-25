// import { MessageReaction, MessageEmbed, User } from 'discord.js';
// import { DateTime } from 'luxon';
// import theme from '../theme';
// import { DiscordTextChannel } from '../types';
// import { getUserInputReaction, getUserInputMessage } from '../utils';

// export enum EditAction {
//   DESCRIPTION = 'edit_description',
//   DUE_DATE = 'edit_due_date',
//   PARTNER = 'edit_partner',
//   STAKES = 'edit_stakes',
//   CONFIRM = 'confirm',
//   CANCEL = 'cancel',
// }

// export enum TaskLegendType {
//   CREATE_NEW = 'create_new',
//   EDIT = 'edit',
// }

// const EMOJI_ACTION_MAP: { [emoji: string]: EditAction } = {
//   '✏️': EditAction.DESCRIPTION,
//   '⏰': EditAction.DUE_DATE,
//   '👯': EditAction.PARTNER,
//   '💰': EditAction.STAKES,
//   '✅': EditAction.CONFIRM,
//   '❌': EditAction.CANCEL,
// };

// // Provides input collection methods related to task creation/editing
// export default class TaskPrompter {
//   protected channel: DiscordTextChannel;
//   protected userID: string;

//   constructor(channel: DiscordTextChannel, userID: string) {
//     this.channel = channel;
//     this.userID = userID;
//   }

//   public async promptEditAction(
//     legendType: TaskLegendType,
//   ): Promise<EditAction> {
//     const isCreateLegend = legendType === TaskLegendType.CREATE_NEW;

//     const reactEmbed = new MessageEmbed()
//       .setColor(theme.colors.primary.main)
//       .setTitle('Task Confirmation').setDescription(`
//       Your task is shown above! To edit your task, use one of the emojis on this message.
//       Be sure to confirm your new task below.
//       (Note: you cannot edit stakes or partner after initial task creation)

//       ✏️ Edit title
//       ⏰ Edit due date
//       ${isCreateLegend ? '👯 Edit accountability partner' : ''}
//       ${isCreateLegend ? '💰 Edit stakes' : ''}

//       ✅ Confirm
//       ❌ Cancel
//       `);

//     const emojis = isCreateLegend
//       ? ['✏️', '⏰', '👯', '💰', '✅', '❌']
//       : ['✏️', '⏰', '✅', '❌'];

//     const reactMsg = await this.channel.send(reactEmbed);
//     const reaction = await getUserInputReaction(reactMsg, emojis, this.userID);
//     reaction.users.remove(this.userID); // async
//     return EMOJI_ACTION_MAP[reaction.emoji.name];
//   }

//   public async promptDescription(): Promise<string> {
//     const descriptionEmbed = new MessageEmbed()
//       .setColor(theme.colors.primary.main)
//       .setDescription(`Please provide a brief description of your task.`);
//     await this.channel.send(descriptionEmbed);

//     const userInputMsg = await getUserInputMessage(this.channel, this.userID);
//     return userInputMsg.content;
//   }

//   public async promptDeadline(): Promise<Date> {
//     const currISODate = new Date().toISOString();
//     const dateExample =
//       currISODate.slice(0, 10) + ' ' + currISODate.slice(11, 16);
//     // TODO shoulnd't use iso date lmao

//     const deadlineEmbed = new MessageEmbed()
//       .setColor(theme.colors.primary.main)
//       .setDescription(
//         `
//         Please provide the deadline for your task.
//         Format your response like this: \`<YYYY-MM-DD> <HH:MM>\`

//         Example: \`${dateExample}\`
//         `,
//       );
//     await this.channel.send(deadlineEmbed);

//     let dueDate: DateTime | undefined;
//     while (!dueDate || !dueDate.isValid) {
//       // collect user input
//       const userInputMsg = await getUserInputMessage(this.channel, this.userID);
//       const dueDateStr = userInputMsg.content;
//       const [date, time] = dueDateStr.trim().split(' ') as [string?, string?];
//       dueDate = DateTime.fromISO(`${date}T${time}`, {
//         zone: 'America/Los_Angeles', // TODO change to use user input
//       });

//       // send error msg on bad input
//       if (!dueDate.isValid) {
//         const dateErrorEmbed = new MessageEmbed()
//           .setColor(theme.colors.error)
//           .setDescription(
//             `Please format your response like this: \`<YYYY-MM-DD> <HH:MM>\``,
//           );

//         await this.channel.send(dateErrorEmbed);
//       }
//     }

//     return dueDate.toJSDate();
//   }

//   public async promptPartner(): Promise<User> {
//     const partnerEmbed = new MessageEmbed()
//       .setColor(theme.colors.primary.main)
//       .setDescription(`Who do you want to be your accountability partner?`);
//     await this.channel.send(partnerEmbed);

//     let taggedUser: User | undefined;
//     while (!taggedUser) {
//       // collect user input
//       const userInputMsg = await getUserInputMessage(this.channel, this.userID);
//       taggedUser = userInputMsg.mentions.users.first();

//       // send error msg on bad input
//       if (!taggedUser) {
//         const partnerErrorEmbed = new MessageEmbed()
//           .setColor(theme.colors.error)
//           .setDescription(`Please mention your partner with \`@\``);

//         await this.channel.send(partnerErrorEmbed);
//       }
//     }
//     return taggedUser;
//   }

//   // TODO have to make this optional
//   public async promptStakes(): Promise<number> {
//     const stakesEmbed = new MessageEmbed()
//       .setColor(theme.colors.primary.main)
//       .setDescription(`How much are you going to stake?`);
//     await this.channel.send(stakesEmbed);

//     let stakes: number | undefined;
//     while (!stakes || isNaN(stakes)) {
//       // collect user input
//       const userInputMsg = await getUserInputMessage(this.channel, this.userID);
//       const stakesStr = userInputMsg.content;
//       stakes = Number(stakesStr);

//       // send error msg on bad input
//       if (isNaN(stakes)) {
//         const stakesErrorEmbed = new MessageEmbed()
//           .setColor(theme.colors.error)
//           .setDescription(`Please give a valid dollar amount.`);

//         await this.channel.send(stakesErrorEmbed);
//       }
//     }
//     return stakes;
//   }
// }
