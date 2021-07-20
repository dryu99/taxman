import { Document, Schema, model } from 'mongoose';
import { User } from './UserModel';

export interface Member {
  discordID: string;
  user: User;
  // guild: Guild

  // mongo props
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MemberDocument = Member & Document<any, any, Member>;

const memberSchema = new Schema<Member>(
  {
    discordID: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const MemberModel = model<Member>('Member', memberSchema);

export default MemberModel;
