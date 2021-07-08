import { v4 as uuidv4 } from 'uuid';

export interface Task extends NewTask {
  id: string;
  // id: string;
  // name: string;
  // createdAt: number;
  // scheduleDate: number;
  // cost: number;
  // authorID: string; // user ids
  // partnerID: string;
}

export interface NewTask {
  name: string;
  createdAt: number;
  scheduleDate: number;
  cost: number;
  authorID: string; // user ids
  partnerID: string;
}

const tasks: Task[] = [];

const getAll = (): Task[] => {
  return tasks;
};

const add = (newTask: NewTask): Task => {
  const task = {
    id: uuidv4(),
    ...newTask,
  };

  tasks.push(task);
  return task;
};

export default {
  getAll,
  add,
};
