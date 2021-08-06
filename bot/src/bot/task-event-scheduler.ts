import { Channel } from 'discord.js';
import { Client } from 'discord.js-commando';
import nodeSchedule from 'node-schedule';
import TaskCheckInMessenger from './messengers/TaskCheckInMessenger';
import { TaskEvent, TaskEventStatus } from '../models/TaskEventModel';
import taskEventService from '../services/task-event-service';
import logger from '../lib/logger';

// TODO consider making this a singleton or sth (so we can init client and not have to consume param)

const scheduleTaskEvent = (taskEvent: TaskEvent, client: Client) => {
  nodeSchedule.scheduleJob(taskEvent.dueAt, async () => {
    let channel: Channel | undefined;
    try {
      channel = await client.channels.fetch(taskEvent.schedule.channelID);
    } catch (e) {
      // possible errors:
      //  - channel doesn't exist anymore
      //  - bot was kicked from guild
      logger.error(e);
      await taskEventService.update(taskEvent.id, {
        status: TaskEventStatus.FORCE_CANCEL,
      });
      return;
    }

    if (!channel.isText()) return;

    try {
      const taskCheckInMessenger = new TaskCheckInMessenger(taskEvent, channel);

      taskCheckInMessenger.start(); // async
    } catch (error) {
      logger.error('Something went wrong with check in...', error);
    }
  });
};

const scheduleTaskEvents = (taskEvents: TaskEvent[], client: Client) => {
  for (const taskEvent of taskEvents) {
    // TODO should do a check here to see if task event was supposed to be fired yesterday (sth messed up)

    // TODO we're using closures here to access vars like the discord client and taskEvent.
    //      How does this affect performance? At some point we should benchmark it and see if we should bind() or sth.
    scheduleTaskEvent(taskEvent, client);
  }

  logger.info(
    'Scheduled Jobs:',
    Object.keys(nodeSchedule.scheduledJobs).map((id) => id),
  );
};

const taskScheduler = {
  scheduleTaskEvent,
  scheduleTaskEvents,
};

export default taskScheduler;
