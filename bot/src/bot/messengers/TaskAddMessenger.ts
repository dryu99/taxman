import { Message, MessageEmbed } from 'discord.js';
import logger from '../../lib/logger';
import { Task, TaskFrequency } from '../../models/TaskModel';
import { TIMEOUT_ERROR } from '../errors';
import Messenger from './Messenger';
import theme from '../theme';
import { DiscordTextChannel } from '../types';
import {
  createTaskEmbed,
  formatDate,
  getUserInputMessage,
  getUserInputReaction,
} from '../utils';
import taskService from '../../services/task-service';
import dayjs from 'dayjs';
import { stripIndents } from 'common-tags';
import { Guild } from '../../models/GuildModel';

enum MessengerState {
  END = 'end',

  // collection states
  GET_DESCRIPTION = 'get_description',
  GET_DUE_DATE = 'get_deadline',
  GET_STAKES = 'get_stakes',
  GET_PARTNER = 'get_partner',
  GET_EDIT_OPTION = 'get_edit_option',

  // error states
  TIMEOUT = 'timeout',
  CANCEL = 'cancel',
}

enum MessengerWorkflow {
  CREATE = 'create', // on new task creation
  EDIT = 'edit', // when user sees edit option embed
}

// TODO add reminder param
// TODO add channel param
// TODO add examples for everything

const CANCEL_KEY = 'cancel';

// User input state machine responsible for task creation / edit workflows
export default class TaskWriteMessenger extends Messenger {
  private state: MessengerState;
  private workflow: MessengerWorkflow;
  private guild: Guild;
  private isCreatingNew: boolean; // specifies whether msger is creating or updating task
  private userDiscordID: string;
  private task: Partial<Task>; // contains task metadata we write to db

  constructor(
    channel: DiscordTextChannel,
    userDiscordID: string,
    guild: Guild,
    task?: Task, // if it exists, user is editing, ow user is creating new
  ) {
    super(channel);
    this.userDiscordID = userDiscordID;
    this.guild = guild;
    this.workflow = MessengerWorkflow.CREATE;
    this.isCreatingNew = task === undefined;
    this.state =
      task === undefined
        ? MessengerState.GET_DESCRIPTION
        : MessengerState.GET_EDIT_OPTION; // initial state
    this.task = task ? task : {};
  }

  public async start(): Promise<void> {
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
        case MessengerState.GET_EDIT_OPTION:
          this.workflow = MessengerWorkflow.EDIT;
          this.state = await this.handleCollectEditOption();
          break;
        case MessengerState.TIMEOUT:
          await this.sendErrorMsg(TIMEOUT_ERROR);
          this.state = MessengerState.END;
        case MessengerState.CANCEL:
          await this.cancelTaskWrite();
          this.state = MessengerState.END;
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
    await this.sendPromptEmbed(`
      What do you want to do?

      Example: \`Go to the gym\`        
    `);

    // Collect user input
    const userInputMsg = await getUserInputMessage(
      this.channel,
      this.userDiscordID,
    );
    if (!userInputMsg) return MessengerState.TIMEOUT;
    if (userInputMsg.content === CANCEL_KEY) return MessengerState.CANCEL;

    // Validate user input
    if (userInputMsg.content.trim().length <= 0) {
      await this.sendErrorMsg('Please provide a valid description!');
      return MessengerState.GET_DESCRIPTION;
    }

    // Set task state + advance next msg state
    this.task.description = userInputMsg.content;
    return this.workflow === MessengerWorkflow.CREATE
      ? MessengerState.GET_DUE_DATE
      : MessengerState.GET_EDIT_OPTION;
  }

  private async handleCollectDueDate(): Promise<MessengerState> {
    // Send embed prompt
    const currDate = dayjs(Date.now()).add(1, 'day');
    const dateExample = currDate.format('MM/DD/YYYY h:mm a');

    // TODO can reword this. (When will you commit by?)
    await this.sendPromptEmbed(`
      When do you want to complete this by?
      Format your response like this: \`MM/DD/YYYY H:MM AM or PM\`

      Example: \`${dateExample}\`
    `);

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
    ).tz('America/Los_Angeles'); // TODO add timezone param

    if (!dueDate.isValid()) {
      await this.sendErrorMsg('Please provide a valid date format!');
      return MessengerState.GET_DUE_DATE;
    }

    // Set task state + advance next msg state
    this.task.dueAt = dueDate.toDate();
    return this.workflow === MessengerWorkflow.CREATE
      ? MessengerState.GET_PARTNER
      : MessengerState.GET_EDIT_OPTION;
  }

  private async handleCollectPartner(): Promise<MessengerState> {
    await this.sendPromptEmbed(`
      Who do you want to be your accountability partner?

      Example: \`@partner_name\`
    `);

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
      await this.sendErrorMsg('Please mention your partner with `@`');
      return MessengerState.GET_PARTNER;
    }
    if (taggedUser.id === this.userDiscordID) {
      await this.sendErrorMsg(
        "You can't be your own partner!. Please mention your partner with `@`",
      );
      return MessengerState.GET_PARTNER;
    }

    // Set states
    this.task.partnerUserDiscordID = taggedUser.id;
    return this.workflow === MessengerWorkflow.CREATE
      ? MessengerState.GET_EDIT_OPTION // TODO change to GET_STAKES once you integrate stripe
      : MessengerState.GET_EDIT_OPTION;
  }

  private async handleCollectStakes(): Promise<MessengerState> {
    await this.sendPromptEmbed(`
      How much $ are you going to stake?
      
      Example: \`10\`    
    `);

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
    return MessengerState.GET_EDIT_OPTION;
  }

  private async handleCollectEditOption(): Promise<MessengerState> {
    const { description, dueAt, partnerUserDiscordID } = this.task;
    if (!description || !dueAt || !partnerUserDiscordID)
      throw new Error(invalidDataErrorMsg(this.handleCollectEditOption.name));

    // send embeds
    const taskEmbed = createTaskEmbed({
      description,
      dueAt,
      partnerUserDiscordID,
    });
    await this.channel.send(taskEmbed);

    const reactEmbed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle('Task Confirmation')
      .setDescription(
        stripIndents`
            Your task is shown above! To edit your task, use one of the emojis on this message.
            Be sure to confirm your new task below.
            (Note: you cannot edit partner after initial task creation)
  
            ✏️ Edit title
            ⏰ Edit due date\
            ${this.isCreatingNew ? '\n👯 Edit accountability partner' : ''}
  
            ✅ Confirm
            ❌ Cancel
            `,
      );
    // TODO use this instead once stripe integration is done
    // .setDescription(
    //   stripIndents`
    //     Your task is shown above! To edit your task, use one of the emojis on this message.
    //     Be sure to confirm your new task below.
    //     (Note: you cannot edit stakes or partner after initial task creation)

    //     ✏️ Edit title
    //     ⏰ Edit due date\
    //     ${
    //       this.isCreatingNew
    //         ? '\n👯 Edit accountability partner\n💰 Edit stakes'
    //         : ''
    //     }

    //     ✅ Confirm
    //     ❌ Cancel
    //     `,
    // );

    const reactMsg = await this.channel.send(reactEmbed);

    // TODO reduce duplication with emojis
    // collect user input
    const emojis = this.isCreatingNew
      ? ['✏️', '⏰', '👯', '✅', '❌'] // TODO add stakes emoji once stripe integration is done
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

    throw new Error('Received unexpected emoji, cancelling task creation.');
  }

  private async completeTaskAdd(): Promise<void> {
    const { description, dueAt, stakes, partnerUserDiscordID } = this.task;
    if (!description || !dueAt || !partnerUserDiscordID)
      throw new Error(invalidDataErrorMsg(this.completeTaskAdd.name));

    const confirmEmbed = new MessageEmbed()
      .setColor(theme.colors.success)
      .setDescription(`Task created successfully! Due @ ${formatDate(dueAt)}.`);
    await this.channel.send(confirmEmbed);

    // save task in db
    await taskService.add({
      metaID: Date.now() + Math.random() + '', // TODO use 3rd party lib
      userDiscordID: this.userDiscordID,
      channelID: this.channel.id,
      guildID: this.guild.id,
      description,
      stakes, // optional
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
    if (!description || !dueAt || !taskID)
      throw new Error(invalidDataErrorMsg(this.completeTaskEdit.name));

    const confirmEmbed = new MessageEmbed()
      .setColor(theme.colors.success)
      .setDescription(`Task updated successfully!`);
    await this.channel.send(confirmEmbed);

    // Update task in db
    await taskService.update(taskID, {
      description,
      dueAt,
    });
  }

  private async cancelTaskWrite(): Promise<void> {
    await this.sendErrorMsg(
      `Task ${
        this.isCreatingNew ? 'creation' : 'update'
      } cancelled, nothing was saved.`,
    );
  }

  // private makePromptEmbed(description: string): MessageEmbed {
  //   const embed = new MessageEmbed()
  //     .setColor(theme.colors.primary.main)
  //     .setDescription(stripIndent(description));

  //   if (this.isCreatingNew && this.workflow === MessengerWorkflow.CREATE) {
  //     embed.setFooter('Type "cancel" to stop');
  //   }
  //   return embed;
  // }

  private async sendPromptEmbed(description: string): Promise<Message> {
    const embed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setDescription(stripIndents(description));

    if (this.isCreatingNew && this.workflow === MessengerWorkflow.CREATE) {
      embed.setFooter('Type "cancel" to stop');
    }

    return await this.channel.send(embed);
  }
}

// Static helper functions
const invalidDataErrorMsg = (functionName: string): string => {
  return `Reached ${functionName} with invalid collected task data (this should never happen)`;
};
