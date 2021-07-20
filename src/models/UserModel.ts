import { Document, Schema, model } from 'mongoose';
import { MongoModel } from '../types';

export interface User extends MongoModel {
  discordID: string;
  // isStripeRegistered: boolean;
  // stripeID
}

export type UserDocument = User & Document<any, any, User>;

export const userSchema = new Schema<User>(
  {
    discordID: { type: String, required: true },
  },
  { timestamps: true },
);

const UserModel = model<User>('User', userSchema);

export default UserModel;
