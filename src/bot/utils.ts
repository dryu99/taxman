import { Settings } from '../models/SettingsModel';
import { Task } from '../models/TaskModel';

export const formatMention = (id: string) => {
  return `<@${id}>`;
};

export const hasGracePeriodEnded = (task: Task, settings: Settings) => {
  const penaltyPeriodsMillisecs = settings.penaltyPeriodMinutes * 60 * 1000;
  const gracePeriodStart = task.dueDate.getTime() - penaltyPeriodsMillisecs;

  return Date.now() >= gracePeriodStart; // TODO will timezones affect this...
};
