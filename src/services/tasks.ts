import TaskModel, { NewTask, Task } from '../models/Task';

const getAll = async (): Promise<Task[]> => {
  const tasks = await TaskModel.find({});
  return tasks.map((task) => task.toJSON());
};

// TODO should prob think of some caching mechanism cause this gets fired so frequently lol
const getDueTasks = async (currDate: Date): Promise<Task[]> => {
  const dueTasks = await TaskModel.find({
    dueDate: { $lte: currDate },
    isChecked: false,
  });

  // Update task check flags
  const dueTaskPromises: Promise<Task>[] = [];
  for (const dueTask of dueTasks) {
    dueTask.isChecked = true;
    dueTaskPromises.push(dueTask.save());
  }

  return Promise.all(dueTaskPromises);
};

const add = async (newTask: NewTask): Promise<Task> => {
  const task = new TaskModel({
    isChecked: false,
    ...newTask,
  });

  const savedTask = await task.save();
  return savedTask.toJSON();
};

const check = async (id: string): Promise<void> => {
  await TaskModel.updateOne({ _id: id }, { $set: { isChecked: true } });
};

export default {
  getAll,
  getDueTasks,
  add,
  check,
};
