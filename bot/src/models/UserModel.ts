import { Document, Schema, model } from 'mongoose';
import { MongoModel } from '../types';

// TODO if you decide to stick with mongo, consider embedding member data in this model
export interface NewUser {
  discordID: string;
}

export interface User extends NewUser, MongoModel {
  // isStripeRegistered: boolean;
  // stripeID
}

export type UserDocument = User & Document<any, any, User>;

export const userSchema = new Schema<User>(
  {
    discordID: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

const UserModel = model<User>('User', userSchema);

export default UserModel;
