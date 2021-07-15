import {
  Channel,
  Message,
  MessageEmbed,
  MessageReaction,
  User,
} from 'discord.js';
import logger from '../lib/logger';
import { Settings } from '../models/SettingsModel';
import { Task } from '../models/TaskModel';
import { DEFAULT_INPUT_AWAIT_TIME_MIN } from './constants';
import { TimeoutError } from './errors';
import theme from './theme';
import { DiscordTextChannel } from './types';

export const formatMention = (id: string) => {
  return `<@${id}>`;
};

export const hasGracePeriodEnded = (task: Task, settings: Settings) => {
  const penaltyPeriodsMillisecs = settings.penaltyPeriodMinutes * 60 * 1000;
  const gracePeriodStart = task.dueDate.getTime() - penaltyPeriodsMillisecs;

  return Date.now() >= gracePeriodStart; // TODO will timezones affect this...
};

export const createTaskEmbed = (
  task: Task,
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
        value: task.name,
      },
      {
        name: 'Due Date',
        value: task.dueDate.toLocaleString(),
      },
      {
        name: 'Accountability Partner',
        value: formatMention(task.partnerID),
      },
      {
        name: 'Money at stake',
        value: `$${task.cost}`,
      },
    );

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);

  return embed;
};

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
        time: reactionTimeLimitMinutes * 60 * 1000,
        errors: ['time'],
      },
    );

    const reaction = collectedReactions.first();
    if (!reaction)
      throw new Error("Internal Bot Error: Reaction couldn't be collected."); // TODO handle this error better (look at edit command caller)

    return reaction;
  } catch (e) {
    throw new TimeoutError('You took too long to react, cancelling command.');
  }
};

const reactToMsg = async (msg: Message, emojis: string[]) => {
  try {
    for (const emoji of emojis) {
      await msg.react(emoji);
    }
  } catch (e) {
    logger.error('An emoji failed to react');
  }
};

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
    if (!collectedMsg)
      throw new Error("Internal Bot Error: Message couldn't be collected."); // TODO handle this error better (look at edit command caller)

    return collectedMsg;
  } catch (e) {
    throw new TimeoutError('You took too long to react, cancelling command.');
  }
};
