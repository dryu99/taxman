import { ToadScheduler, SimpleIntervalJob, Task } from 'toad-scheduler';
import taskService from '../services/tasks';

// TODO turn this into a class / singleton

const scheduler = new ToadScheduler();
const task = new Task('check tasks', () => {
  console.log('ToadScheduler: checking tasks', taskService.getAll());
  const dueTasks = taskService.getDueTasks(Date.now());
  console.log('ToadScheduler: due tasks', dueTasks);
  // TODO have to somehow use discord client object here to send message to channel
  //      message should
  //        - specify task that's due
  //        - prompt author and partner to react
  //        - send another message based on reacts (e.g. fail or success)
});
const job = new SimpleIntervalJob({ seconds: 10 }, task);

const start = () => {
  scheduler.addSimpleIntervalJob(job);
};

export default {
  start,
};
