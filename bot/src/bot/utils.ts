import dayjs from 'dayjs';
import { Message, MessageEmbed, MessageReaction, User } from 'discord.js';
import { TaskEvent } from '../models/TaskEventModel';
import { DEFAULT_INPUT_AWAIT_TIME_MIN } from './constants';
import theme from './theme';
import { DiscordTextChannel } from './types';

export const formatDate = (date: Date): string => {
  // TODO add conditions to format with words like "tomorrow" and "today"
  return dayjs(date).format('M/D/YY - h:mm a');
};

export const formatMention = (id: string): string => {
  return `<@${id}>`;
};

export const hasGracePeriodEnded = (taskEvent: TaskEvent): boolean => {
  const { gracePeriodEndOffset } = taskEvent.schedule.guild.settings;
  const gracePeriodEnd = taskEvent.dueAt.getTime() - gracePeriodEndOffset;
  return Date.now() >= gracePeriodEnd; // TODO will timezones affect this...
};

export const toMinutes = (milliseconds: number): number => {
  return milliseconds / (1000 * 60);
};

export const toHours = (milliseconds: number): number => {
  return milliseconds / (1000 * 60 * 60);
};

export const toMilliseconds = (
  timeVal: number,
  timeType: 'hours' | 'minutes',
) => {
  return timeType === 'hours' ? timeVal * 1000 * 60 * 60 : timeVal * 1000 * 60;
};

export const _p = async <T>(
  promise: Promise<T>,
): Promise<[T | null, Record<string, string> | null]> => {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    console.error('CUSTOM ERROR HANDLER', error);
    return [null, error];
  }
};

export const createTaskEmbed = (
  taskData: {
    description: string;
    dueAt: Date;
    partnerUserDiscordID: string;
  },
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
        value: taskData.description,
      },
      {
        name: 'Deadline',
        value: formatDate(taskData.dueAt),
      },
      {
        name: 'Accountability Partner',
        value: formatMention(taskData.partnerUserDiscordID),
      },
      // {
      //   name: 'Money at stake',
      //   value: `$${task.stakes}`,
      // },
    );

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);

  return embed;
};

// TODO rename to collect
/**
 * @returns undefined output implies timeout
 */
export const getUserInputReaction = async (
  msg: Message,
  emojis: string[],
  reactorUserID: string,
  reactionTimeoutMinutes: number = DEFAULT_INPUT_AWAIT_TIME_MIN, // TODO change this to milliseconds lmao
): Promise<MessageReaction | undefined> => {
  reactToMsg(msg, emojis); // we don't await here b/c we want to let users react even if not all reactions have appeared

  try {
    const collectedReactions = await msg.awaitReactions(
      (reaction: MessageReaction, user: User) =>
        emojis.includes(reaction.emoji.name) && user.id === reactorUserID,
      {
        max: 1,
        time: toMilliseconds(reactionTimeoutMinutes, 'minutes'),
        errors: ['time'],
      },
    );

    const reaction = collectedReactions.first();
    if (!reaction) throw new Error("Reaction couldn't be collected.");
    return reaction;
  } catch (e) {
    // timeout occurred
    return undefined;
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
/**
 * @returns undefined output implies timeout
 */
export const getUserInputMessage = async (
  channel: DiscordTextChannel,
  filterUserID: string,
): Promise<Message | undefined> => {
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
    // timeout occurred
    return undefined;
  }
};
