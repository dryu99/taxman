import { User } from 'discord.js';
import { Document, Schema, model } from 'mongoose';
import { toMilliseconds } from '../bot/utils';
import { MongoModel } from '../types';
import { Guild } from './GuildModel';
import { TaskSchedule, taskScheduleSchema } from './TaskScheduleModel';

export enum TaskEventStatus {
  PENDING, // task that has yet to be checked-in
  // CHECKED, // task that is currently being checked-in with user (yet to be determined as COMPLETED or FAILED)
  SUCCESS, // task that user successfully completed
  FAIL, // task that user failed to complete
  CANCEL, // task that has been cancelled by user
  FORCE_CANCEL, // task that has been cancelled by bot (i.e. error occurred)
}

interface TaskEventMeta {
  dueAt: Date;
}

// TODO might not need this (maybe enough to just pass schedule id)
export interface NewTaskEvent extends TaskEventMeta {}

export interface TaskEvent extends TaskEventMeta, MongoModel {
  schedule: TaskSchedule; // TODO consider adding | string (for unpopulated cases??)
  status: TaskEventStatus;
}

export type TaskEventDocument = TaskEvent & Document<any, any, TaskEvent>;

export const taskEventSchema = new Schema<TaskEvent>(
  {
    dueAt: { type: Date, required: true },
    schedule: {
      type: Schema.Types.ObjectId,
      ref: 'TaskSchedule',
      required: true,
    }, // TODO consider changing to embed
    status: {
      type: Number,
      enum: Object.values(TaskEventStatus),
      default: TaskEventStatus.PENDING,
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

const TaskEventModel = model<TaskEvent>('TaskEvent', taskEventSchema);

export default TaskEventModel;
