import { Document, Schema, model } from 'mongoose';
import { MongoModel } from '../types';

export enum TaskStatus {
  PENDING = 'pending', // task that has yet to be checked-in
  CHECKED = 'checked', // task that is currently being checked-in with user (yet to be determined as COMPLETED or FAILED)
  COMPLETED = 'completed', // task that user successfully completed TODO rename to succeeded?
  FAILED = 'failed', // task that user failed to complete
  CANCELLED = 'cancelled', // task that has been cancelled
}

export enum TaskFrequency {
  ONCE = 'once',
  RECURRING = 'recurring',
  CUSTOM_WEEKLY = 'custom_weekly',
  CUSTOM_MONTHLY = 'custom_monthly',
}

export interface NewTask {
  metaID: string; // multiple ScheduledTasks can belong to same TaskMeta
  description: string;
  dueAt: Date;
  stakes?: number; // $ amount
  userDiscordID: string;
  partnerUserDiscordID: string;
  channelID: string;
  guildID: string;
  reminderTimeOffset?: number;
  frequency: {
    type: TaskFrequency;
    interval?: number; //  milliseconds (only with periodic)
    hour?: number; // only with weekly | monthly
    minute?: number; // only with weekly | monthly
    weekDays?: number[]; // 1-7 only with weekly
    monthDays?: number[]; // 1-31  only with monthly
  };
  // TODO isChargeable
}

export interface Task extends NewTask, MongoModel {
  status: TaskStatus;
  wasReminded: boolean; // TODO rename lmao
}

export type TaskDocument = Task & Document<any, any, Task>;

export const taskSchema = new Schema<Task>(
  {
    metaID: { type: String, required: true }, // ref
    description: { type: String, required: true, trim: true },
    dueAt: { type: Date, required: true },
    userDiscordID: { type: String, required: true }, // ref
    partnerUserDiscordID: { type: String, required: true }, // ref
    channelID: { type: String, required: true },
    guildID: { type: String, required: true }, // ref
    stakes: { type: Number },
    reminderTimeOffset: { type: Number },
    wasReminded: { type: Boolean, required: true, default: false }, // TODO consider not doing this, instead make a reminders collection
    frequency: {
      type: {
        type: String,
        enum: Object.values(TaskFrequency),
        required: true,
      },
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.PENDING,
    },
  },
  { timestamps: true },
);

// TODO stretch goal: make schema instance methods https://medium.com/@agentwhs/complete-guide-for-typescript-for-mongoose-for-node-js-8cc0a7e470c1
// taskSchema.methods.hasGracePeriodEnded = function (this: Task) {
//   console.log('this', this);
//   return this.name + '!';
// };

const TaskModel = model<Task>('Task', taskSchema);

export default TaskModel;
