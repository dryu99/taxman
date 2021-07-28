import { Message, MessageEmbed, User } from 'discord.js';
import logger from '../../lib/logger';
import { TaskFrequency } from '../../models/TaskModel';
import { TIMEOUT_ERROR } from '../errors';
import Messenger from './Messenger';
import theme from '../theme';
import { DiscordTextChannel } from '../types';
import {
  createTaskEmbed,
  getUserInputMessage,
  getUserInputReaction,
} from '../utils';
import taskService from '../../services/task-service';
import dayjs from 'dayjs';
import { stripIndent } from 'common-tags';
import { Guild } from '../../models/GuildModel';

enum MessageState {
  END = 'end',

  // collection states
  GET_DESCRIPTION = 'description',
  GET_DUE_DATE = 'deadline',
  GET_STAKES = 'stakes',
  GET_PARTNER = 'partner',
  CHOOSE_EDIT = 'edit_legend',

  // error states
  TIMEOUT = 'timeout',
  CANCEL = 'cancel',
}

enum MessageWorkflow {
  CREATE = 'create',
  EDIT = 'edit',
}

// TODO add reminder param
// TODO add channel param

const CANCEL_KEY = 'cancel';
export default class TaskAddMessenger extends Messenger {
  private commandMsg: Message;
  private state: MessageState;
  private workflow: MessageWorkflow;
  private guild: Guild;

  // task props we are collecting from user
  private userID: string;
  private description?: string;
  private dueDate?: Date;
  private partner?: User;
  private stakes?: number;

  constructor(channel: DiscordTextChannel, commandMsg: Message, guild: Guild) {
    super(channel);
    this.userID = commandMsg.author.id;
    this.commandMsg = commandMsg;
    this.guild = guild;
    this.state = MessageState.GET_DESCRIPTION;
    this.workflow = MessageWorkflow.CREATE;
  }

  public async prompt(): Promise<void> {
    while (true) {
      switch (this.state) {
        case MessageState.GET_DESCRIPTION:
          this.state = await this.handleCollectDescription();
          break;
        case MessageState.GET_DUE_DATE:
          this.state = await this.handleCollectDueDate();
          break;
        case MessageState.GET_PARTNER:
          this.state = await this.handleCollectPartner();
          break;
        case MessageState.GET_STAKES:
          this.state = await this.handleCollectStakes();
          break;
        case MessageState.CHOOSE_EDIT:
          // once we reach this state, workflow becomes edit
          this.workflow = MessageWorkflow.EDIT;
          this.state = await this.handleChooseEdit();
          break;
        case MessageState.TIMEOUT:
          await this.sendErrorMsg(TIMEOUT_ERROR);
          return;
        case MessageState.CANCEL:
          await this.cancelTaskAdd();
          return;
        case MessageState.END:
          return;
        default:
          logger.error('Unknown state received', this.state);
          return; // exit message loop
      }
    }
  }

  private async handleCollectDescription(): Promise<MessageState> {
    // Send embed prompt
    const descriptionEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(`Please provide a brief description of your task.`);
    // TODO include cancel key footer
    await this.channel.send(descriptionEmbed);

    // Collect user input
    const userInputMsg = await getUserInputMessage(this.channel, this.userID);
    if (!userInputMsg) return MessageState.TIMEOUT;
    if (userInputMsg.content === CANCEL_KEY) return MessageState.CANCEL;

    // Validate user input
    if (userInputMsg.content.trim().length <= 0) {
      await this.channel.send('Please provide a description!');
      return MessageState.GET_DESCRIPTION;
    }

    // Set task state + advance next msg state
    this.description = userInputMsg.content;
    return this.workflow === MessageWorkflow.CREATE
      ? MessageState.GET_DUE_DATE
      : MessageState.CHOOSE_EDIT;
  }

  private async handleCollectDueDate(): Promise<MessageState> {
    // Send embed prompt
    const currDate = dayjs(Date.now()).add(1, 'day');
    const dateExample = currDate.format('MM/DD/YYYY h:mm a');
    const deadlineEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(
        `
        Please provide the deadline for your task.
        Format your response like this: \`<MM/DD/YYYY> <H:MM> AM or PM\`

        Example: \`${dateExample}\`
        `,
      );
    await this.channel.send(deadlineEmbed);

    // Collect user input
    const userInputMsg = await getUserInputMessage(this.channel, this.userID);
    if (!userInputMsg) return MessageState.TIMEOUT;
    if (userInputMsg.content === CANCEL_KEY) return MessageState.CANCEL;

    // Validate user input
    // TODO consider abstracting dayjs
    const dueDate = dayjs(
      userInputMsg.content,
      // TODO add more accepted formats (add option for no year specification)
      ['MM/DD/YYYY h:mm A', 'MM/DD/YYYY h:mm a'],
      true,
    ).tz('America/Los_Angeles'); // TODO should accept user input

    if (!dueDate.isValid()) {
      await this.sendErrorMsg('Please provide a valid date format!');
      return MessageState.GET_DUE_DATE;
    }

    // Set task state + advance next msg state
    this.dueDate = dueDate.toDate();
    return this.workflow === MessageWorkflow.CREATE
      ? MessageState.GET_PARTNER
      : MessageState.CHOOSE_EDIT;
  }

  // TODO shouldnt let users tag themselves or bots
  private async handleCollectPartner(): Promise<MessageState> {
    // Send embed
    const partnerEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(`Who do you want to be your accountability partner?`);

    await this.channel.send(partnerEmbed);

    // Collect user input
    const userInputMsg = await getUserInputMessage(this.channel, this.userID);
    if (!userInputMsg) return MessageState.TIMEOUT;
    if (userInputMsg.content === CANCEL_KEY) return MessageState.CANCEL;

    // Validate user input
    const taggedUser = userInputMsg.mentions.users.first();
    if (!taggedUser) {
      await this.sendErrorMsg(`Please mention your partner with \`@\``);
      return MessageState.GET_PARTNER;
    }

    // Set states
    this.partner = taggedUser;
    return this.workflow === MessageWorkflow.CREATE
      ? MessageState.GET_STAKES
      : MessageState.CHOOSE_EDIT;
  }

  private async handleCollectStakes(): Promise<MessageState> {
    const stakesEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(`How much are you going to stake?`);
    await this.channel.send(stakesEmbed);

    // collet user input
    const userInputMsg = await getUserInputMessage(this.channel, this.userID);
    if (!userInputMsg) return MessageState.TIMEOUT;
    if (userInputMsg.content === CANCEL_KEY) return MessageState.CANCEL;

    // validate
    const stakes = Number(userInputMsg.content);
    if (isNaN(stakes)) {
      await this.sendErrorMsg(`Please provide a valid dollar amount.`);
      return MessageState.GET_STAKES;
    }

    // set states
    this.stakes = stakes;
    return MessageState.CHOOSE_EDIT;
  }

  private async handleChooseEdit(): Promise<MessageState> {
    if (!this.description || !this.dueDate || !this.stakes || !this.partner) {
      throw new Error(
        'Reached CHOOSE_EDIT state with invalid collected data (this should never happen).',
      ); // TODO sentry
    }

    // send embeds
    const taskEmbed = createTaskEmbed({
      description: this.description,
      dueAt: this.dueDate,
      stakes: this.stakes,
      partnerUserDiscordID: this.partner.id,
    });
    await this.channel.send(taskEmbed);

    const isCreateLegend = true; // TODO change this
    const reactEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle('Task Confirmation')
      .setDescription(
        stripIndent`
      Your task is shown above! To edit your task, use one of the emojis on this message.
      Be sure to confirm your new task below.
      (Note: you cannot edit stakes or partner after initial task creation)

      ✏️ Edit title
      ⏰ Edit due date\
      ${
        isCreateLegend ? '\n👯 Edit accountability partner\n💰 Edit stakes' : ''
      }

      ✅ Confirm
      ❌ Cancel
      `,
      );

    const reactMsg = await this.channel.send(reactEmbed);

    // collect user input
    const emojis = isCreateLegend
      ? ['✏️', '⏰', '👯', '💰', '✅', '❌']
      : ['✏️', '⏰', '✅', '❌'];
    const reaction = await getUserInputReaction(reactMsg, emojis, this.userID);
    if (!reaction) return MessageState.TIMEOUT;

    reaction.users
      .remove(this.userID)
      .catch((e) => logger.error("Couldn't remove emoji")); // async

    const emoji = reaction.emoji.name;
    if (emoji === '✏️') return MessageState.GET_DESCRIPTION;
    if (emoji === '⏰') return MessageState.GET_DUE_DATE;
    if (emoji === '👯') return MessageState.GET_PARTNER;
    if (emoji === '💰') return MessageState.GET_STAKES;
    if (emoji === '❌') return MessageState.CANCEL;
    if (emoji === '✅') {
      this.completeTaskAdd();
      return MessageState.END;
    }

    // TODO will this throw when user randomly reacts lol prob not cause filter
    throw new Error('Received unexpected emoji, cancelling task creation.');
  }

  private async completeTaskAdd(): Promise<void> {
    if (!this.description || !this.dueDate || !this.stakes || !this.partner) {
      throw new Error(
        'Reached task add completion with invalid collected data (this should never happen).',
      ); // TODO sentry
    }

    const confirmEmbed = new MessageEmbed()
      .setColor(theme.colors.success)
      .setDescription(`Your task has been created!`); // TODO mention due date
    await this.channel.send(confirmEmbed);

    // save task in db
    await taskService.add({
      metaID: Date.now() + Math.random() + '', // TODO use 3rd party lib
      userDiscordID: this.userID,
      partnerUserDiscordID: this.partner.id,
      channelID: this.channel.id,
      guildID: this.guild.id,
      stakes: this.stakes,
      description: this.description,
      dueAt: this.dueDate,
      // reminderTimeOffset: parsedReminderMinutes * 60 * 1000,  TODO collect reminder data
      frequency: {
        type: TaskFrequency.ONCE,
      },
    });
  }

  private async cancelTaskAdd(): Promise<void> {
    const cancelEmbed = new MessageEmbed()
      .setColor(theme.colors.error)
      .setDescription('Task creation cancelled, nothing was saved.');
    await this.channel.send(cancelEmbed);
  }
}
