import TaskModel, {
  TaskDocument,
  NewTask,
  Task,
  TaskStatus,
} from '../models/TaskModel';

const getAll = async (): Promise<Task[]> => {
  const tasks = await TaskModel.find({});
  return tasks;
};

const getByID = async (taskID: string): Promise<Task | undefined> => {
  const task = await TaskModel.findById(taskID);
  return task || undefined;
};

const getAuthorTasks = async (
  authorID: string,
  filter: Partial<Task>,
): Promise<Task[]> => {
  const tasks = await TaskModel.find({
    userDiscordID: authorID,
    ...filter,
  });
  return tasks;
};

// TODO should prob think of some caching mechanism cause this gets fired so frequently lol
const getDueTasks = async (currDate: Date): Promise<Task[]> => {
  const dueTasks = await TaskModel.find({
    dueAt: { $lte: currDate },
    status: TaskStatus.PENDING,
  });
  // Update task check flags
  const dueTaskPromises: Promise<TaskDocument>[] = [];
  for (const dueTask of dueTasks) {
    dueTask.status = TaskStatus.CHECKED;
    dueTaskPromises.push(dueTask.save());
  }

  const updatedDueTasks = await Promise.all(dueTaskPromises);
  return updatedDueTasks;
};

// task_schema_check
const getReminderTasks = async (currDate: Date): Promise<Task[]> => {
  const reminderTasks = await TaskModel.aggregate<Task>([
    {
      $project: {
        // TODO how to improve typing here...
        _id: false,
        id: '$_id',
        description: true,
        dueAt: true,
        stakes: true,
        reminderTimeOffset: true,
        userDiscordID: true,
        partnerUserDiscordID: true,
        channelID: true,
        status: true,
        wasReminded: true,
        reminderAt: { $subtract: ['$dueAt', '$reminderTimeOffset'] },
      },
    },
    {
      $match: {
        wasReminded: false,
        reminderTimeOffset: { $ne: null },
        reminderAt: { $ne: null, $lte: currDate },
        status: TaskStatus.PENDING,
      },
    },
  ]);

  // check reminded flag to avoid redundant fetches
  const reminderTaskIDs = reminderTasks.map((task) => task.id);
  await updateMany(reminderTaskIDs, { wasReminded: true });

  return reminderTasks;
};

// TODO have to auth users for write operations (ow other users could mess with your shit)
const add = async (newTask: NewTask): Promise<Task> => {
  const task = new TaskModel({ ...newTask });
  const savedTask = await task.save();
  return savedTask;
};

const update = async (
  taskID: string,
  newProps: Partial<Task>,
): Promise<Task | undefined> => {
  const updatedTask = await TaskModel.findByIdAndUpdate(taskID, newProps, {
    new: true,
  });
  return updatedTask || undefined;
};

const updateMany = async (
  taskIDs: string[],
  newProps: Partial<Task>,
): Promise<Task[]> => {
  const updatedTaskPromises: Promise<Task | undefined>[] = [];

  // TODO we shouldn't be making multiple update queries for each task, we should do one big query.
  //      But alas thats a problem for future me: https://docs.mongodb.com/manual/reference/method/db.collection.updateMany/
  for (const taskID of taskIDs) {
    updatedTaskPromises.push(update(taskID, newProps));
  }

  const updatedTasks = await Promise.all(updatedTaskPromises);
  return updatedTasks.filter((task) => task !== undefined) as Task[];
};

const taskService = {
  getAll,
  getByID,
  getDueTasks,
  getReminderTasks,
  add,
  getAuthorTasks,
  update,
  updateMany,
};

export default taskService;
