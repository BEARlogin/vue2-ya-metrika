const moduleName = '[vue2-ya-metrika]';

export const logger = {
  warn(...args) {
    console.warn(moduleName, ...args);
  },
  error(...args) {
    console.error(moduleName, ...args);
  },
  log(...args) {
    console.log(moduleName, ...args);
  },
};
