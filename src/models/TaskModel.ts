import mongoose, { Document } from 'mongoose';

export enum TaskStatus {
  PENDING = 'pending', // task that has yet to be checked-in
  CHECKED = 'checked', // task that is currently being checked-in with user (yet to be determined as COMPLETED or FAILED)
  COMPLETED = 'completed', // task that user successfully completed TODO rename to succeeded?
  FAILED = 'failed', // task that user failed to complete
  CANCELLED = 'cancelled', // task that has been cancelled
}

export interface NewTask {
  name: string; // tODO rename to title? description? make sure to change edit command embeds lol
  dueDate: Date; // TODO rename to deadline / dueAt
  cost?: number; // TODO rename to payout? stakes?
  userDiscordID: string; // TODO userDiscordID
  partnerID: string; // TODO partnerDiscordID
  channelID: string;
  reminderOffset?: number; // milliseconds TODO rename to
  // memberDiscordID: string;
  // TODO guildID
  // frequency
  // reminderMinutes
  // discordGuildMemberID
  // TODO isChargeable
}

export interface Task extends NewTask {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: TaskStatus;
  wasReminded: boolean; // TODO rename lmao
}

export type TaskDocument = Task & Document<any, any, Task>;

const taskSchema = new mongoose.Schema<Task>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    authorID: {
      type: String,
      required: true,
    },
    partnerID: {
      type: String,
      required: true,
    },
    channelID: {
      type: String,
      required: true,
    },
    cost: {
      type: Number,
    },
    reminderOffset: {
      type: Number,
    },
    wasReminded: {
      type: Boolean,
      required: true,
      default: false,
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

const TaskModel = mongoose.model<Task>('Task', taskSchema);

export default TaskModel;
