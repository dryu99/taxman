import { MessageEmbed, TextChannel } from 'discord.js';
import { CommandoClient } from 'discord.js-commando';
import { Task, TaskStatus } from '../models/TaskModel';
import { formatMention, getReaction } from './utils';
import theme from './theme';
import taskService from '../services/task-service';
import { TimeoutError } from './errors';
import { DiscordTextChannel } from './types';
import logger from '../lib/logger';

enum MessageState {
  START = 'start',
  EDIT_DUE_DATE = 'edit_due_date',
  EDIT_TITLE = 'edit_title',
  EDITING_ERROR = 'edit_error',
  EDITING_TIMEOUT = 'timeout',
  CONFIRM = 'confirm',
  CANCEL = 'cancel',
  ERROR = 'error',
  END = 'end',
}

// TODO consider tagging users outside embed (pop notification on mobile is weird otherwise)
// TODO partner confirm embed contains redundant info... make it smaller
export default class TaskEditMessenger {
  private task: Task;
  private channel: DiscordTextChannel;
  private state: MessageState;

  constructor(task: Task, channel: DiscordTextChannel) {
    this.task = task;
    this.channel = channel;
    this.state = MessageState.START;
  }

  // TODO consider making state of type { type: MessageState, payload: any }
  //      may be more maintainable
  public async prompt() {
    while (true) {
      switch (this.state) {
        case MessageState.START: {
          this.state = await this.promptReactLegend();
          break;
        }
        case MessageState.EDIT_TITLE: {
          this.state = await this.promptEditTitle();
          break;
        }
        case MessageState.END: {
          logger.info('exiting message loop');
          return;
        }
        default: {
          logger.error('Unknown state received', this.state);
          return; // exit message loop
        }
      }
    }
  }

  private async promptReactLegend(): Promise<MessageState> {
    const embed = new MessageEmbed()
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

    const msg = await this.channel.send(embed);

    try {
      const reaction = await getReaction(
        msg,
        ['✏️', '⏰', '✅', '❌'],
        this.task.authorID,
        5,
      );

      const emojiStr = reaction.emoji.name;
      if (emojiStr === '✏️') return MessageState.EDIT_TITLE;
      if (emojiStr === '⏰') return MessageState.EDIT_DUE_DATE;
      if (emojiStr === '✅') return MessageState.CONFIRM;
      if (emojiStr === '❌') return MessageState.CANCEL;
      return MessageState.ERROR;
    } catch (e) {
      if (e instanceof TimeoutError) return MessageState.EDITING_TIMEOUT;
      return MessageState.ERROR;
    }
  }

  private async promptEditTitle(): Promise<MessageState> {
    const embed = new MessageEmbed()
      .setColor(theme.colors.primary.main)
      .setTitle('Edit Title')
      .setDescription(
        `        
        Examples: 
          - Go to gym
          - Wake up early
          - Work on project
        `,
      );

    // TODO have to figure out how to collect text
    const msg = await this.channel.send(embed);
    return MessageState.END;
  }
}
