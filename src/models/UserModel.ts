import { Document, Schema, model } from 'mongoose';

export interface User {
  discordID: string;
  // isStripeRegistered: boolean;
  // stripeID

  // mongo props
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = User & Document<any, any, User>;

const userSchema = new Schema<User>(
  {
    discordID: { type: String, required: true },
  },
  { timestamps: true },
);

const UserModel = model<User>('User', userSchema);

export default UserModel;
