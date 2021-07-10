import TaskModel, { NewTask, Task, TaskStatus } from '../models/TaskModel';

const getAll = async (): Promise<Task[]> => {
  const tasks = await TaskModel.find({});
  return tasks.map((task) => task.toJSON());
};

const getAuthorTasks = async (
  authorID: string,
  filter: Partial<Task>,
): Promise<Task[]> => {
  const tasks = await TaskModel.find({ authorID, ...filter });
  return tasks;
};

// TODO should prob think of some caching mechanism cause this gets fired so frequently lol
const getDueTasks = async (currDate: Date): Promise<Task[]> => {
  const dueTasks = await TaskModel.find({
    dueDate: { $lte: currDate },
    status: TaskStatus.PENDING,
  });

  // Update task check flags
  const dueTaskPromises: Promise<Task>[] = [];
  for (const dueTask of dueTasks) {
    dueTask.status = TaskStatus.CHECKED;
    dueTaskPromises.push(dueTask.save());
  }

  return Promise.all(dueTaskPromises); // TODO have to call toJson here??
};

const add = async (newTask: NewTask): Promise<Task> => {
  const task = new TaskModel({
    ...newTask,
  });

  const savedTask = await task.save();
  return savedTask.toJSON();
};

const update = async (taskID: string, newProps: Partial<Task>) => {
  await TaskModel.updateOne({ _id: taskID }, { $set: newProps });
};

export default {
  getAll,
  getDueTasks,
  add,
  getAuthorTasks,
  update,
};
