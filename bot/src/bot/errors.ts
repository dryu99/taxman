import ListCommand from '../commands/tasks/list';

export const INVALID_TASK_ID_ERROR = `The task ID you gave doesn't exist! You can find the exact ID with the \`$${ListCommand.DEFAULT_CMD_NAME}\` command.`;
export const MISSING_SETTINGS_ERROR = `Your server doesn't have settings for the bot... Please contact support for help.`;
export const INTERNAL_ERROR =
  'Something went wrong... Please contact support for help.';
export const TIMEOUT_ERROR = 'This command timed out, cancelling command.';

export class TimeoutError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'TimeoutError';
  }
}
