import { Channel } from 'discord.js';
import { Client } from 'discord.js-commando';
import nodeSchedule from 'node-schedule';
import TaskCheckInMessenger from './messengers/TaskCheckInMessenger';
import { TaskEvent, TaskEventStatus } from '../models/TaskEventModel';
import taskEventService from '../services/task-event-service';
import logger from '../lib/logger';
import { formatDate } from './utils';

const TaskScheduler = (function () {
  let _client: Client | undefined;

  const init = (client: Client) => {
    _client = client;
  };

  // TODO should do a check here to see if task event was supposed to be fired yesterday (sth messed up)

  // TODO we're using closures here to access vars like the discord client and taskEvent.
  //      How does this affect performance? At some point we should benchmark it and see if we should bind() or sth.
  //      We coudl alternatively make a DB call for each scheduled task instead to get meta
  const scheduleEvent = (taskEvent: TaskEvent) => {
    logger.info('Scheduling Task', taskEvent);
    nodeSchedule.scheduleJob(taskEvent.dueAt, async () => {
      if (!_verifyInit(_client)) return;
      logger.info('Running scheduled task', taskEvent);

      let channel: Channel | undefined;
      try {
        channel = await _client.channels.fetch(taskEvent.schedule.channelID);
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
        const taskCheckInMessenger = new TaskCheckInMessenger(
          taskEvent,
          channel,
        );
        taskCheckInMessenger.start(); // async
      } catch (error) {
        logger.error('Something went wrong with check in...', error);
      }
    });
  };

  const scheduleEvents = (taskEvents: TaskEvent[]) => {
    for (const taskEvent of taskEvents) {
      scheduleEvent(taskEvent);
    }
  };

  const _verifyInit = (client: Client | undefined): client is Client => {
    if (client !== undefined) return true;
    logger.error("Client wasn't initialized for scheduler.");
    // TODO sentry
    return false;
  };

  return {
    init,
    scheduleEvent,
    scheduleEvents,
  };
})();

export default TaskScheduler;
