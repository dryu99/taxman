import ListCommand from '../commands/tasks/list';

export const INVALID_TASK_ID_ERROR = `The task ID you gave doesn't exist! You can find the exact ID with the \`$${ListCommand.DEFAULT_CMD_NAME}\` command.`;
export const MISSING_SETTINGS_ERROR = `Your server doesn't have settings for the bot... Please contact admin.`; // TODO or please support server or sth
export const INTERNAL_ERROR = `Internal bot error occurred, please contact admin.`;

export class TimeoutError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'TimeoutError';
  }
}
