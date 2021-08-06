import dayjs from 'dayjs';
import TaskEventModel, {
  NewTaskEvent,
  TaskEvent,
  TaskEventStatus,
} from '../models/TaskEventModel';

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

const getTodayEvents = async (): Promise<TaskEvent[]> => {
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

const update = async (
  eventID: string,
  newProps: Partial<TaskEvent>,
): Promise<TaskEvent | undefined> => {
  // TODO try catch ?
  const updatedEvent = await TaskEventModel.findByIdAndUpdate(
    eventID,
    newProps,
    { new: true },
  );
  return updatedEvent || undefined;
};

const taskEventService = {
  add,
  getTodayEvents,
  update,
};

export default taskEventService;
