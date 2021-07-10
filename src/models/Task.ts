import mongoose from 'mongoose';
mongoose.set('useFindAndModify', false);

export interface NewTask {
  name: string;
  dueDate: Date;
  cost: number;
  authorID: string;
  partnerID: string;
  channelID: string;
  // TODO guildID
}

export interface Task extends NewTask {
  id: string;
  isChecked: boolean;
  createdAt: number; // TODO check to see if this is actualy being created
}

// set up schema blueprint
const taskSchema = new mongoose.Schema<Task>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isChecked: {
      // TDOO set default ? its being set in plan command rn
      type: Boolean,
      required: true,
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
