import mongoose from 'mongoose';

mongoose.set('useFindAndModify', false);

// set up schema blueprint
const taskSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isChecked: {
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

const Task = mongoose.model('Task', taskSchema);

export default Task;
