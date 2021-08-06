import TaskScheduleModel, {
  NewTaskSchedule,
  TaskSchedule,
} from '../models/TaskScheduleModel';

// TODO have to auth users for write operations (ow other users could mess with your shit)
const add = async (
  newSchedule: NewTaskSchedule,
  guildID: string,
): Promise<TaskSchedule> => {
  const schedule = new TaskScheduleModel({ ...newSchedule, guild: guildID });
  const savedSchedule = await schedule.save();
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
