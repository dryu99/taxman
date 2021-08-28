// TODO add time stamps to these OR use morgan or sth
const info = (...params: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${new Date().toLocaleTimeString()}] `, ...params);
  }
};

const error = (...params: any[]) => {
  console.error(...params);
};

const logger = { info, error };
export default logger;
