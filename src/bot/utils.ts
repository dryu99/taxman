import dayjs from 'dayjs';
import {
  Channel,
  Message,
  MessageEmbed,
  MessageReaction,
  User,
} from 'discord.js';
import logger from '../lib/logger';
import { GuildSettings } from '../models/SettingsModel';
import { NewTask, Task } from '../models/TaskModel';
import { DEFAULT_INPUT_AWAIT_TIME_MIN } from './constants';
import { TimeoutError } from './errors';
import theme from './theme';
import { DiscordTextChannel } from './types';

export const formatMention = (id: string) => {
  return `<@${id}>`;
};

export const hasGracePeriodEnded = (task: Task, settings: GuildSettings) => {
  const gracePeriodEnd = task.dueAt.getTime() - settings.gracePeriodEndOffset;
  return Date.now() >= gracePeriodEnd; // TODO will timezones affect this...
};

export const toMinutes = (milliseconds: number) => {
  return milliseconds / (1000 * 60);
};

export const toHours = (milliseconds: number) => {
  return milliseconds / (1000 * 60 * 60);
};

export const toMilliseconds = (
  timeVal: number,
  timeType: 'hours' | 'minutes',
) => {
  return timeType === 'hours' ? timeVal * 1000 * 60 * 60 : timeVal * 1000 * 60;
};

export const createTaskEmbed = (
  task: NewTask,
  title?: string,
  description?: string,
): MessageEmbed => {
  const embed = new MessageEmbed()
    .setColor(theme.colors.primary.main)
    .addFields(
      // {
      //   name: `\`${task.id.substring(0, 5)}\` - ${task.name}`,
      //   value: `
      //     **DUE @ ${task.dueDate.toLocaleString()}**
      //     **Accountability Partner**
      //     ${formatMention(task.partnerID)}
      //     **Money at Stake**
      //     $${task.cost}
      //   `,
      // },
      {
        name: 'Task',
        value: task.description,
      },
      {
        name: 'Deadline',
        value: dayjs(task.dueAt).format('MM/DD/YY @ h:mm a'),
      },
      {
        name: 'Accountability Partner',
        value: formatMention(task.partnerUserDiscordID),
      },
      {
        name: 'Money at stake',
        value: `$${task.stakes}`,
      },
    );

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);

  return embed;
};

// TODO rename to collect
export const getUserInputReaction = async (
  msg: Message,
  emojis: string[],
  reactorUserID: string,
  reactionTimeLimitMinutes: number = DEFAULT_INPUT_AWAIT_TIME_MIN,
): Promise<MessageReaction> => {
  reactToMsg(msg, emojis); // we don't await here b/c we want to let users react even if not all reactions have appeared

  try {
    const collectedReactions = await msg.awaitReactions(
      (reaction: MessageReaction, user: User) =>
        emojis.includes(reaction.emoji.name) && user.id === reactorUserID,
      {
        max: 1,
        time: toMilliseconds(reactionTimeLimitMinutes, 'minutes'),
        errors: ['time'],
      },
    );

    const reaction = collectedReactions.first();
    if (!reaction) throw new Error("Reaction couldn't be collected.");
    return reaction;
  } catch (e) {
    throw new TimeoutError('User took too long to respond with react input.');
  }
};

const reactToMsg = async (msg: Message, emojis: string[]) => {
  try {
    for (const emoji of emojis) {
      await msg.react(emoji);
    }
  } catch (e) {
    throw new Error('An emoji failed to react');
  }
};

// TODO rename to collect
export const getUserInputMessage = async (
  channel: DiscordTextChannel,
  filterUserID: string,
): Promise<Message> => {
  try {
    const collectedMsgs = await channel.awaitMessages(
      (m) => filterUserID === m.author.id,
      {
        time: DEFAULT_INPUT_AWAIT_TIME_MIN * 60 * 1000,
        max: 1,
        errors: ['time'],
      },
    );

    const collectedMsg = collectedMsgs.first();
    if (!collectedMsg) throw new Error("Message couldn't be collected.");
    return collectedMsg;
  } catch (e) {
    throw new TimeoutError('User took too long to respond with text input.');
  }
};
