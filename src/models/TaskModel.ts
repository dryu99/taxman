import mongoose from 'mongoose';
mongoose.set('useFindAndModify', false);

export enum TaskStatus {
  PENDING = 'pending', // task that has yet to be checked-in
  CHECKED = 'checked', // task that is currently being checked-in with user (yet to be determined as COMPLETED or FAILED)
  COMPLETED = 'completed', // task that user successfully completed TODO rename to succeeded?
  FAILED = 'failed', // task that user failed to complete
  CANCELLED = 'cancelled', // task that has been cancelled
}

export interface NewTask {
  name: string;
  dueDate: Date;
  cost: number; // TODO rename to payout?
  authorID: string; // TODO consider changing to userID
  partnerID: string;
  channelID: string;
  // TODO guildID
  // frequency
  // reminderMinutes
}

export interface Task extends NewTask {
  id: string;
  createdAt: number; // TODO check to see if this is actualy being created
  status: TaskStatus;
}

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
      default: 0,
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

const TaskModel = mongoose.model<Task>('Task', taskSchema);

export default TaskModel;
