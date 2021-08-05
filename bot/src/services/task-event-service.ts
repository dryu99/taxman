import TaskEventModel, {
  NewTaskEvent,
  TaskEvent,
} from '../models/TaskEventModel';

const add = async (
  newEvent: NewTaskEvent,
  scheduleID: string,
): Promise<TaskEvent> => {
  const event = new TaskEventModel({ ...newEvent, schedule: scheduleID });
  const savedEvent = await event.save();
  return savedEvent;
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
  // update,
};

export default taskEventService;
