import { NewTaskEvent, TaskEvent } from '../models/TaskEventModel';
import TaskScheduleModel, {
  NewTaskSchedule,
  TaskSchedule,
  TaskScheduleFrequency,
} from '../models/TaskScheduleModel';
import taskEventService from './task-event-service';

// TODO have to auth users for write operations (ow other users could mess with your shit)
const add = async (
  newSchedule: NewTaskSchedule,
  guildID: string,
): Promise<TaskSchedule> => {
  // Create + save schedule to DB
  const schedule = new TaskScheduleModel({ ...newSchedule, guild: guildID });
  const savedSchedule = await schedule.save();

  // Create + save new event to DB
  if (savedSchedule.frequency.type === TaskScheduleFrequency.ONCE) {
    const newEvent: NewTaskEvent = { dueAt: savedSchedule.startAt };
    await taskEventService.add(newEvent, savedSchedule.id);

    // TODO add cron job if event due date is <= today 11:59 pm
  }
  // TODO add more cases for different frequency types

  return savedSchedule;
};

const update = async (
  scheduleID: string,
  newProps: Partial<TaskSchedule>,
): Promise<TaskSchedule | undefined> => {
  // TODO try catch ?
  const updatedSchedule = await TaskScheduleModel.findByIdAndUpdate(
    scheduleID,
    newProps,
    { new: true },
  );
  return updatedSchedule || undefined;
};

const taskScheduleService = {
  add,
  update,
};

export default taskScheduleService;
