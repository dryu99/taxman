import { Document, Schema, model } from 'mongoose';
import { MongoModel } from '../types';

export interface NewMember {
  discordUserID: string;
  guildID: string;
}

export interface Member extends NewMember, MongoModel {
  // role_fields
  // freebies
}

export type MemberDocument = Member & Document<any, any, Member>;

export const memberSchema = new Schema<Member>(
  {
    discordUserID: { type: String, required: true },
    guildID: { type: String, required: true },
  },
  { timestamps: true },
);

const MemberModel = model<Member>('Member', memberSchema);

export default MemberModel;
