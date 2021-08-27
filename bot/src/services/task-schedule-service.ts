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
  try {
    const updatedSchedule = await TaskScheduleModel.findByIdAndUpdate(
      scheduleID,
      newProps,
      { new: true },
    ).populate('guild');
    return updatedSchedule || undefined;
  } catch (e) {
    return undefined;
  }
};

const taskScheduleService = {
  add,
  update,
};

export default taskScheduleService;
