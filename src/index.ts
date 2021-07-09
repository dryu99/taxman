import { MessageEmbed } from 'discord.js';
import { CommandoClient, SQLiteProvider } from 'discord.js-commando';
import dotenv from 'dotenv';
import path from 'path';
import sqlite from 'sqlite';
import taskService from './services/tasks';

dotenv.config();

const client = new CommandoClient({
  commandPrefix: '$', // TODO change to ! (figure out how to avoid conflicts with other bots e.g. rhythm bot)
  owner: process.env.OWNER_ID,
});

client.registry
  .registerGroups([['bot', 'Meta']])
  .registerDefaults()
  .registerCommandsIn(path.join(__dirname, 'commands'));

client.setInterval(async () => {
  console.log(
    `Scheduler: checking tasks (${new Date(Date.now()).toLocaleTimeString()})`,
  );

  // TODO rename lol
  // TODO handle await with try catch
  // TODO determine if this doesn't work with different timezones
  // TODO REFACTOROROROROOROROR so bad
  const dueTasks = taskService.getDueTasks(Date.now());
  console.log('\tall tasks', taskService.getAll());
  console.log('\tdue tasks', dueTasks);
  //      message should
  //        - specify task that's due
  //        - prompt author and partner to react
  //        - send another message based on reacts (e.g. fail or success)

  for (const dueTask of dueTasks) {
    dueTask.isChecked = true; // TODO use updateTask function instead
    const channel = await client.channels.fetch(dueTask.channelID);

    if (channel.isText()) {
      const embed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle('TASK CHECK IN')
        .setDescription(
          `<@${dueTask.authorID}> Your task is due: ${dueTask.name}. Are you doing it? Remember to provide photographic proof!`,
        );

      const msg1 = await channel.send(embed);

      // TODO improve async logic below (can prob do both at once)
      // react
      msg1
        .react('👍')
        .then(() => msg1.react('👎'))
        .catch((e) => console.error('One of the emojis failed to react:', e));

      // handle author reaction
      const collectedReactions = await msg1.awaitReactions(
        (reaction, user) =>
          ['👍', '👎'].includes(reaction.emoji.name) &&
          user.id === dueTask.authorID,
        {
          max: 1,
          time: 15 * 60 * 1000, // 15 min
          errors: ['time'],
        },
      );

      const reaction = collectedReactions.first();
      if (reaction?.emoji.name === '👍') {
        const msg2 = await channel.send(
          `<@${dueTask.partnerID}> Please confirm that <@${dueTask.authorID}> has completed their task.`,
        );

        msg2
          .react('👍')
          .then(() => msg2.react('👎'))
          .catch((e) => console.error('One of the emojis failed to react:', e));

        msg2
          .awaitReactions(
            (reaction, user) =>
              ['👍', '👎'].includes(reaction.emoji.name) &&
              user.id === dueTask.partnerID,
            {
              max: 1,
              time: 15 * 60 * 1000, // 15 min
              errors: ['time'],
            },
          )
          .then(async (collected) => {
            const reaction = collected.first();

            if (reaction?.emoji.name === '👍') {
              const msg3 = await channel.send(
                `<@${dueTask.authorID}> Great job, you have evaded the taxman!`,
              );
            } else {
              const msg3 = await channel.send(
                `<@${dueTask.authorID}> The taxman got you... Your account will be charged in the following days.`,
              );
            }
          });
      } else {
        msg1.reply('you reacted with a thumbs down.');
      }
    }
  }
}, 10 * 1000); // TODO this num should be 1 min

// sqlite
//   .open(path.join(__dirname, 'database.sqlite3'))
//   .then((database) => {
//     client.setProvider(new SQLiteProvider(database));
//   })
//   .catch((e) => {
//     console.error(`Failed to connect to database: ${e}`);
//   });

client.on('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}! (${client.user?.id})`);
  client.user?.setActivity('with Commando');
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(console.error);
