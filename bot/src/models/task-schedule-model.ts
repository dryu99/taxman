import { User } from 'discord.js';
import { Document, Schema, model } from 'mongoose';
import { toMilliseconds } from '../bot/utils';
import { MongoModel } from '../types';
import { Guild } from './guild-model';

export enum TaskScheduleFrequency {
  ONCE,
  // TODO prob change below ones (refer here https://docs.microsoft.com/en-us/sql/relational-databases/system-tables/dbo-sysschedules-transact-sql?redirectedfrom=MSDN&view=sql-server-ver15)
  RECURRING,
  CUSTOM_WEEKLY,
  CUSTOM_MONTHLY,
}

interface TaskScheduleMeta {
  userDiscordID: string;
  partnerUserDiscordID: string;
  description: string;
  stakes?: number; // $ amount
  channelID: string;
  reminderTimeOffset?: number;
  startAt: Date;
  frequency: {
    type: TaskScheduleFrequency;
    interval?: number; //  milliseconds (only with periodic)
    hour?: number; // only with weekly | monthly
    minute?: number; // only with weekly | monthly
    weekDays?: number[]; // 1-7 only with weekly
    monthDays?: number[]; // 1-31  only with monthly
  };
}

export interface NewTaskSchedule extends TaskScheduleMeta {}

export interface TaskSchedule extends TaskScheduleMeta, MongoModel {
  // TODO add these when we need it
  // user: User;
  // userPartner: User;
  guild: Guild; // TODO consider adding | string (for unpopulated cases??)
  enabled: boolean; // cancelled schedules are disabled
}

export type TaskScheduleDocument = TaskSchedule &
  Document<any, any, TaskSchedule>;

export const taskScheduleSchema = new Schema<TaskSchedule>(
  {
    // TODO these can be added later when we eventually need them
    //      also they should probably be members instead
    // user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // userPartner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userDiscordID: { type: String, required: true }, // ref
    partnerUserDiscordID: { type: String, required: true }, // ref
    guild: { type: Schema.Types.ObjectId, ref: 'Guild', required: true }, // ref
    description: { type: String, required: true, trim: true },
    stakes: { type: Number, required: true, default: 0 },
    channelID: { type: String, required: true },
    startAt: { type: Date, required: true },
    enabled: { type: Boolean, required: true, default: true },
    reminderTimeOffset: {
      type: Number,
      required: true,
      default: toMilliseconds(30, 'minutes'),
    },
    frequency: {
      type: {
        type: Number,
        enum: Object.values(TaskScheduleFrequency),
        required: true,
      },
    },
  },
  { timestamps: true },
);

// TODO stretch goal: make schema instance methods https://medium.com/@agentwhs/complete-guide-for-typescript-for-mongoose-for-node-js-8cc0a7e470c1
// taskSchema.methods.hasGracePeriodEnded = function (
//   this: Task,
//   gracePeriodEndOffset: number,
// ): boolean {
//   const gracePeriodEnd = this.dueAt.getTime() - gracePeriodEndOffset;
//   return Date.now() >= gracePeriodEnd; // TODO will timezones affect this...
// };

const TaskScheduleModel = model<TaskSchedule>(
  'TaskSchedule',
  taskScheduleSchema,
);

export default TaskScheduleModel;
