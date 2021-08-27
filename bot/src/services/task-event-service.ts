import dayjs from 'dayjs';
import logger from '../lib/logger';
import TaskEventModel, {
  NewTaskEvent,
  TaskEvent,
  TaskEventStatus,
} from '../models/TaskEventModel';
import { TaskSchedule } from '../models/TaskScheduleModel';

// TODO address populates

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
  status: TaskEventStatus,
): Promise<TaskEvent[]> => {
  return TaskEventModel.find({
    userDiscordID,
    status,
  })
    .sort({
      dueAt: status === TaskEventStatus.PENDING ? 1 : -1,
      createdAt: -1,
    })
    .populate({
      path: 'schedule',
      populate: { path: 'guild' },
    });
};

const update = async (
  eventID: string,
  newProps: Partial<TaskEvent>,
): Promise<TaskEvent | undefined> => {
  try {
    const updatedEvent = await TaskEventModel.findByIdAndUpdate(
      eventID,
      newProps,
      { new: true },
    ).populate({
      path: 'schedule',
      populate: { path: 'guild' },
    });
    return updatedEvent || undefined;
  } catch (e) {
    return undefined;
  }
};

// TODO address unknown type
const updateAllByScheduleID = async (
  scheduleID: string,
  newProps: Partial<TaskEvent>,
): Promise<TaskEvent[]> => {
  await TaskEventModel.updateMany(
    { schedule: scheduleID as unknown as TaskSchedule },
    { $set: newProps },
  );

  return TaskEventModel.find({
    schedule: scheduleID as unknown as TaskSchedule,
  }).populate({
    path: 'schedule',
    populate: { path: 'guild' },
  });
};

// try/catch needed when user provides id that can't be parsed into mongo ObjectID
const getByID = async (eventID: string): Promise<TaskEvent | undefined> => {
  try {
    const event = await TaskEventModel.findById(eventID).populate({
      path: 'schedule',
      populate: { path: 'guild' },
    });
    return event || undefined;
  } catch (e) {
    return undefined;
  }
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
