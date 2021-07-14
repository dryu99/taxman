const info = (...params) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...params);
  }
};

const error = (...params) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(...params);
  }
};

const logger = { info, error };
export default logger;
