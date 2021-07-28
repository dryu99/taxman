import CancelCommand from '../commands/tasks/cancel';
import EditCommand from '../commands/tasks/edit';
import ListCommand from '../commands/tasks/list';
import NewCommand from '../commands/tasks/new';
import RegisterCommand from '../commands/tasks/register';
import ScheduleCommand from '../commands/tasks/schedule';

// TODO this solely exists to make ts-node-dev compile commands that aren't being explicitly imported anywhere
//      it's a crappy hack, but it'll do.
const tsNodeDevDummy = {
  CancelCommand,
  EditCommand,
  ListCommand,
  NewCommand,
  RegisterCommand,
  ScheduleCommand,
};

console.log('tsNodeDevDummy', Object.keys(tsNodeDevDummy).length);

export const DEFAULT_INPUT_AWAIT_TIME_MIN = 5;
export const DASHBOARD_URL = 'http://localhost:3001/dashboard';
export const REGISTER_URL = `${DASHBOARD_URL}/register`;
