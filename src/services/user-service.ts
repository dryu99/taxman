import { Task } from '../models/TaskModel';

export interface User extends NewUser {
  tasks: Task[];
}

export interface NewUser {
  id: string;
  // timezone
}

const users: User[] = [];

const getAll = (): User[] => {
  return users;
};

const contains = (id: string): boolean => {
  return users.findIndex((user) => user.id === id) !== -1;
};

const add = (newUser: NewUser): User => {
  const user = {
    ...newUser,
    tasks: [],
  };

  users.push(user);

  return user;
};

const userService = {
  getAll,
  contains,
  add,
};

export default userService;