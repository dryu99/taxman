import dayjs from 'dayjs';
import logger from '../lib/logger';
import TaskEventModel, {
  NewTaskEvent,
  TaskEvent,
  TaskEventStatus,
} from '../models/TaskEventModel';
import { TaskSchedule } from '../models/TaskScheduleModel';

const add = async (
  newEvent: NewTaskEvent,
  scheduleID: string,
): Promise<TaskEvent> => {
  const event = new TaskEventModel({ ...newEvent, schedule: scheduleID });
  const savedEvent = await event.save();
  const populatedEvent = await savedEvent
    .populate({
      path: 'schedule',
      populate: { path: 'guild' },
    })
    .execPopulate(); // TODO might not want to do this if we're calling this frequently
  return populatedEvent;
};

const getAllByToday = async (): Promise<TaskEvent[]> => {
  const todayEndDate = dayjs().endOf('date').toDate();

  // TODO might be able to make this query more efficient with indexes + more conditions ($gte)
  const todayEvents = await TaskEventModel.find({
    dueAt: { $lte: todayEndDate },
    status: TaskEventStatus.PENDING,
  }).populate({
    path: 'schedule',
    populate: { path: 'guild' },
  });

  return todayEvents;
};

const getAllByUserID = async (
  userDiscordID: string,
  status?: TaskEventStatus,
): Promise<TaskEvent[]> => {
  const filter: Partial<TaskEvent> = {};

  // if no status given, don't filter
  if (status) {
    filter.status = status;
  }

  const events = await TaskEventModel.find({
    userDiscordID,
    ...filter,
  })
    .sort({
      dueAt: status === TaskEventStatus.PENDING ? 1 : -1,
      createdAt: -1,
    })
    .populate('schedule');
  return events;
};

const update = async (
  eventID: string,
  newProps: Partial<TaskEvent>,
): Promise<TaskEvent | undefined> => {
  const updatedEvent = await TaskEventModel.findByIdAndUpdate(
    eventID,
    newProps,
    { new: true },
  );
  return updatedEvent || undefined;
};

const updateAllByScheduleID = async (
  scheduleID: string,
  newProps: Partial<TaskEvent>,
): Promise<void> => {
  TaskEventModel.updateMany(
    { schedule: scheduleID as unknown as TaskSchedule },
    { $set: newProps },
  );
};

const getByID = async (eventID: string): Promise<TaskEvent | undefined> => {
  const event = await TaskEventModel.findById(eventID).populate({
    path: 'schedule',
    populate: { path: 'guild' },
  });
  return event || undefined;
};

const taskEventService = {
  add,
  getAllByToday,
  getAllByUserID,
  update,
  updateAllByScheduleID,
  getByID,
};

export default taskEventService;
