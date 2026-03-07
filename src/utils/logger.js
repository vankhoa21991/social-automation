import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(__dirname, '../../logs');

class Logger {
  constructor(component) {
    this.component = component;
    this.ensureLogsDir();
  }

  ensureLogsDir() {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
  }

  getLogFilePath(type) {
    const date = new Date().toISOString().split('T')[0];
    return path.join(LOGS_DIR, `${date}-${type}.log`);
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const baseMsg = `[${timestamp}] [${level}] [${this.component}] ${message}`;
    if (data) {
      return `${baseMsg}\n${JSON.stringify(data, null, 2)}`;
    }
    return baseMsg;
  }

  writeToFile(type, message) {
    const filePath = this.getLogFilePath(type);
    fs.appendFileSync(filePath, message + '\n');
  }

  info(message, data) {
    const msg = this.formatMessage('INFO', message, data);
    console.log(msg);
    this.writeToFile('info', msg);
  }

  error(message, data) {
    const msg = this.formatMessage('ERROR', message, data);
    console.error(msg);
    this.writeToFile('error', msg);
  }

  warn(message, data) {
    const msg = this.formatMessage('WARN', message, data);
    console.warn(msg);
    this.writeToFile('warn', msg);
  }

  debug(message, data) {
    const msg = this.formatMessage('DEBUG', message, data);
    if (process.env.DEBUG === 'true') {
      console.debug(msg);
    }
    this.writeToFile('debug', msg);
  }

  success(message, data) {
    const msg = this.formatMessage('SUCCESS', message, data);
    console.log(`\x1b[32m${msg}\x1b[0m`);
    this.writeToFile('success', msg);
  }
}

export default function createLogger(component) {
  return new Logger(component);
}
