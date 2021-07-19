import mongoose, { Document } from 'mongoose';
mongoose.set('useFindAndModify', false);

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
  authorID: string; // TODO consider changing to userID or discordUserID
  partnerID: string;
  channelID: string;
  reminderOffset?: number; // milliseconds TODO rename to
  // TODO guildID
  // frequency
  // reminderMinutes
  // discordGuildMemberID
  // TODO isChargeable
}

export interface Task extends NewTask {
  id: string;
  createdAt: number; // TODO check to see if this is actualy being created
  status: TaskStatus;
  wasReminded: boolean; // TODO rename lmao
}

export type MongoTask = Task & Document<any, any, Task>;

// set up schema blueprint
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

taskSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

// TODO stretch goal: make schema instance methods https://medium.com/@agentwhs/complete-guide-for-typescript-for-mongoose-for-node-js-8cc0a7e470c1
// taskSchema.methods.hasGracePeriodEnded = function (this: Task) {
//   console.log('this', this);
//   return this.name + '!';
// };

const TaskModel = mongoose.model<Task>('Task', taskSchema);

export default TaskModel;
