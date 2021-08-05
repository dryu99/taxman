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
  return savedEvent;
};

const getTodayEvents = async (): Promise<TaskEvent[]> => {
  const todayEndDate = dayjs().endOf('date').toDate();

  // TODO might be able to make this query more efficient with indexes + more conditions ($gte)
  const todayEvents = await TaskEventModel.find({
    dueAt: { $lte: todayEndDate },
    status: TaskEventStatus.PENDING,
  }).populate('schedule');

  return todayEvents;
};

// const update = async (
//   scheduleID: string,
//   newProps: Partial<TaskSchedule>,
// ): Promise<TaskSchedule | undefined> => {
//   // TODO try catch ?
//   const updatedSchedule = await TaskScheduleModel.findByIdAndUpdate(
//     scheduleID,
//     newProps,
//     { new: true },
//   );
//   return updatedSchedule || undefined;
// };

const taskEventService = {
  add,
  getTodayEvents,
  // update,
};

export default taskEventService;
