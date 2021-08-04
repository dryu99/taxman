// TODO add time stamps to these
const info = (...params: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...params);
  }
};

const error = (...params: any[]) => {
  console.error(...params);
};

const logger = { info, error };
export default logger;
