import { MessageEmbed } from 'discord.js';
import logger from '../../lib/logger';
import { Task, TaskFrequency } from '../../models/TaskModel';
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

enum MessengerState {
  END = 'end',

  // collection states
  GET_DESCRIPTION = 'description',
  GET_DUE_DATE = 'deadline',
  GET_STAKES = 'stakes',
  GET_PARTNER = 'partner',
  CHOOSE_EDIT = 'choose_edit',

  // error states
  TIMEOUT = 'timeout',
  CANCEL = 'cancel',
}

enum MessengerWorkflow {
  CREATE = 'create',
  EDIT = 'edit',
}

// TODO add reminder param
// TODO add channel param

const CANCEL_KEY = 'cancel';
export default class TaskWriteMessenger extends Messenger {
  private state: MessengerState;
  private workflow: MessengerWorkflow;
  private guild: Guild;
  private isCreatingNew: boolean;
  private userDiscordID: string;
  private task: Partial<Task>; // contains task metadata we write to db

  constructor(
    channel: DiscordTextChannel,
    userDiscordID: string,
    guild: Guild,
    isCreatingNew: boolean,
    task?: Task,
  ) {
    super(channel);
    this.userDiscordID = userDiscordID;
    this.guild = guild;
    this.isCreatingNew = isCreatingNew;
    this.workflow = MessengerWorkflow.CREATE;
    this.state = isCreatingNew
      ? MessengerState.GET_DESCRIPTION
      : MessengerState.CHOOSE_EDIT; // initial state
    this.task = task ? task : {};
  }

  public async prompt(): Promise<void> {
    while (true) {
      switch (this.state) {
        case MessengerState.GET_DESCRIPTION:
          this.state = await this.handleCollectDescription();
          break;
        case MessengerState.GET_DUE_DATE:
          this.state = await this.handleCollectDueDate();
          break;
        case MessengerState.GET_PARTNER:
          this.state = await this.handleCollectPartner();
          break;
        case MessengerState.GET_STAKES:
          this.state = await this.handleCollectStakes();
          break;
        case MessengerState.CHOOSE_EDIT:
          // once we reach this state, workflow becomes edit
          this.workflow = MessengerWorkflow.EDIT;
          this.state = await this.handleChooseEdit();
          break;
        case MessengerState.TIMEOUT:
          await this.sendErrorMsg(TIMEOUT_ERROR);
          return;
        case MessengerState.CANCEL:
          await this.cancelTaskAdd();
          return;
        case MessengerState.END:
          return;
        default:
          logger.error('Unknown state received', this.state);
          return; // exit message loop
      }
    }
  }

  private async handleCollectDescription(): Promise<MessengerState> {
    // Send embed prompt
    const descriptionEmbed = this.makePromptEmbed(
      'Please provide a brief description of your task.',
    );
    // TODO include cancel key footer
    await this.channel.send(descriptionEmbed);

    // Collect user input
    const userInputMsg = await getUserInputMessage(
      this.channel,
      this.userDiscordID,
    );
    if (!userInputMsg) return MessengerState.TIMEOUT;
    if (userInputMsg.content === CANCEL_KEY) return MessengerState.CANCEL;

    // Validate user input
    if (userInputMsg.content.trim().length <= 0) {
      await this.channel.send('Please provide a description!');
      return MessengerState.GET_DESCRIPTION;
    }

    // Set task state + advance next msg state
    this.task.description = userInputMsg.content;
    return this.workflow === MessengerWorkflow.CREATE
      ? MessengerState.GET_DUE_DATE
      : MessengerState.CHOOSE_EDIT;
  }

  private async handleCollectDueDate(): Promise<MessengerState> {
    // Send embed prompt
    const currDate = dayjs(Date.now()).add(1, 'day');
    const dateExample = currDate.format('MM/DD/YYYY h:mm a');
    const deadlineEmbed = this.makePromptEmbed(stripIndent`
        Please provide the deadline for your task.
        Format your response like this: \`<MM/DD/YYYY> <H:MM> AM or PM\`

        Example: \`${dateExample}\`
        `);
    await this.channel.send(deadlineEmbed);

    // Collect user input
    const userInputMsg = await getUserInputMessage(
      this.channel,
      this.userDiscordID,
    );
    if (!userInputMsg) return MessengerState.TIMEOUT;
    if (userInputMsg.content === CANCEL_KEY) return MessengerState.CANCEL;

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
      return MessengerState.GET_DUE_DATE;
    }

    // Set task state + advance next msg state
    this.task.dueAt = dueDate.toDate();
    return this.workflow === MessengerWorkflow.CREATE
      ? MessengerState.GET_PARTNER
      : MessengerState.CHOOSE_EDIT;
  }

  // TODO shouldnt let users tag themselves or bots
  private async handleCollectPartner(): Promise<MessengerState> {
    const partnerEmbed = this.makePromptEmbed(
      'Who do you want to be your accountability partner?',
    );
    await this.channel.send(partnerEmbed);

    // Collect user input
    const userInputMsg = await getUserInputMessage(
      this.channel,
      this.userDiscordID,
    );
    if (!userInputMsg) return MessengerState.TIMEOUT;
    if (userInputMsg.content === CANCEL_KEY) return MessengerState.CANCEL;

    // Validate user input
    const taggedUser = userInputMsg.mentions.users.first();
    if (!taggedUser) {
      await this.sendErrorMsg(`Please mention your partner with \`@\``);
      return MessengerState.GET_PARTNER;
    }

    // Set states
    this.task.partnerUserDiscordID = taggedUser.id;
    return this.workflow === MessengerWorkflow.CREATE
      ? MessengerState.GET_STAKES
      : MessengerState.CHOOSE_EDIT;
  }

  private async handleCollectStakes(): Promise<MessengerState> {
    const stakesEmbed = this.makePromptEmbed(
      `How much are you going to stake?`,
    );
    await this.channel.send(stakesEmbed);

    // collet user input
    const userInputMsg = await getUserInputMessage(
      this.channel,
      this.userDiscordID,
    );
    if (!userInputMsg) return MessengerState.TIMEOUT;
    if (userInputMsg.content === CANCEL_KEY) return MessengerState.CANCEL;

    // validate
    const stakes = Number(userInputMsg.content);
    if (isNaN(stakes)) {
      await this.sendErrorMsg(`Please provide a valid dollar amount.`);
      return MessengerState.GET_STAKES;
    }

    // set states
    this.task.stakes = stakes;
    return MessengerState.CHOOSE_EDIT;
  }

  private async handleChooseEdit(): Promise<MessengerState> {
    const { description, dueAt, stakes, partnerUserDiscordID } = this.task;
    if (!description || !dueAt || !stakes || !partnerUserDiscordID) {
      throw new Error(
        'Reached CHOOSE_EDIT state with invalid collected data (this should never happen).',
      ); // TODO sentry
    }

    // send embeds
    const taskEmbed = createTaskEmbed({
      description,
      dueAt,
      stakes,
      partnerUserDiscordID,
    });
    await this.channel.send(taskEmbed);

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
        this.isCreatingNew
          ? '\n👯 Edit accountability partner\n💰 Edit stakes'
          : ''
      }

      ✅ Confirm
      ❌ Cancel
      `,
      );

    const reactMsg = await this.channel.send(reactEmbed);

    // collect user input
    const emojis = this.isCreatingNew
      ? ['✏️', '⏰', '👯', '💰', '✅', '❌'] // TODO reduce duplication with emojis
      : ['✏️', '⏰', '✅', '❌'];
    const reaction = await getUserInputReaction(
      reactMsg,
      emojis,
      this.userDiscordID,
    );
    if (!reaction) return MessengerState.TIMEOUT;

    reaction.users
      .remove(this.userDiscordID)
      .catch((e) => logger.error("Couldn't remove emoji")); // async

    const emoji = reaction.emoji.name;
    if (emoji === '✏️') return MessengerState.GET_DESCRIPTION;
    if (emoji === '⏰') return MessengerState.GET_DUE_DATE;
    if (emoji === '👯') return MessengerState.GET_PARTNER;
    if (emoji === '💰') return MessengerState.GET_STAKES;
    if (emoji === '❌') return MessengerState.CANCEL;
    if (emoji === '✅') {
      this.isCreatingNew
        ? await this.completeTaskAdd()
        : await this.completeTaskEdit();
      return MessengerState.END;
    }

    // TODO will this throw when user randomly reacts lol prob not cause filter
    throw new Error('Received unexpected emoji, cancelling task creation.');
  }

  private async completeTaskAdd(): Promise<void> {
    const { description, dueAt, stakes, partnerUserDiscordID } = this.task;
    if (!description || !dueAt || !stakes || !partnerUserDiscordID) {
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
      userDiscordID: this.userDiscordID,
      channelID: this.channel.id,
      guildID: this.guild.id,
      description,
      stakes,
      dueAt,
      partnerUserDiscordID,
      // reminderTimeOffset: parsedReminderMinutes * 60 * 1000,  TODO collect reminder data
      frequency: {
        type: TaskFrequency.ONCE,
      },
    });
  }

  private async completeTaskEdit(): Promise<void> {
    const { description, dueAt, id: taskID } = this.task;
    if (!description || !dueAt || !taskID) {
      throw new Error(
        'Reached task edit completion with invalid collected data (this should never happen).',
      ); // TODO sentry + adjust error msg
    }

    const confirmEmbed = new MessageEmbed()
      .setColor(theme.colors.success)
      .setDescription(`You finished editing! Your edits have been saved.`);
    await this.channel.send(confirmEmbed);

    // update task in db
    await taskService.update(taskID, {
      description, // TODO prob more programmatic way to do this (have to manually add here every time we create new edit option)
      dueAt,
    });
  }

  private async cancelTaskAdd(): Promise<void> {
    const cancelEmbed = new MessageEmbed()
      .setColor(theme.colors.error)
      .setDescription('Task creation cancelled, nothing was saved.');
    await this.channel.send(cancelEmbed);
  }

  private makePromptEmbed(description: string): MessageEmbed {
    const embed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(description);

    if (this.isCreatingNew && this.workflow === MessengerWorkflow.CREATE) {
      embed.setFooter('Type `cancel` to stop');
    }
    return embed;
  }
}
