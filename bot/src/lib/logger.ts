const dev = (...params: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    info(...params);
  }
};

const info = (...params: any[]) => {
  console.log(`[${new Date().toLocaleTimeString()}] `, ...params);
};

const error = (...params: any[]) => {
  console.error(`[${new Date().toLocaleTimeString()}] `, ...params);
};

const logger = { dev, error, info };
export default logger;
