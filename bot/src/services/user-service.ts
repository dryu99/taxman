import UserModel, { NewUser, User } from '../models/user-model';

const contains = async (discordID: string): Promise<boolean> => {
  const user = await UserModel.findOne({ discordID });
  return user !== null;
};

const add = async (newUser: NewUser): Promise<User> => {
  const user = new UserModel({ ...newUser });
  const savedUser = await user.save();
  return savedUser;
};

const userService = {
  contains,
  add,
};

export default userService;
