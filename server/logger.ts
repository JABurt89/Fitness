import { log } from "./vite";

export const logger = {
  info: (message: string, data?: any) => {
    if (data) {
      log(`${message} :: ${JSON.stringify(data)}`);
    } else {
      log(message);
    }
  },
  error: (message: string, error?: any) => {
    if (error) {
      log(`ERROR: ${message} :: ${JSON.stringify(error)}`);
    } else {
      log(`ERROR: ${message}`);
    }
  }
};
