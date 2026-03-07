import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');

class Storage {
  constructor() {
    this.ensureDataDirs();
  }

  ensureDataDirs() {
    const dirs = ['queue', 'drafts', 'published'];
    dirs.forEach(dir => {
      const dirPath = path.join(DATA_DIR, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  getFilePath(type, filename) {
    return path.join(DATA_DIR, type, filename);
  }

  readAll(type) {
    const dirPath = path.join(DATA_DIR, type);
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    return files.map(file => {
      const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
      return JSON.parse(content);
    });
  }

  read(type, id) {
    const filePath = this.getFilePath(type, `${id}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
    return null;
  }

  write(type, id, data) {
    const filePath = this.getFilePath(type, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  }

  delete(type, id) {
    const filePath = this.getFilePath(type, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  exists(type, id) {
    const filePath = this.getFilePath(type, `${id}.json`);
    return fs.existsSync(filePath);
  }

  moveTo(fromType, toType, id) {
    const data = this.read(fromType, id);
    if (data) {
      this.write(toType, id, data);
      this.delete(fromType, id);
      return true;
    }
    return false;
  }

  addToQueue(item) {
    const id = this.generateId();
    item.id = id;
    item.queuedAt = new Date().toISOString();
    item.status = 'queued';
    this.write('queue', id, item);
    return id;
  }

  getQueueItems(status = null) {
    const items = this.readAll('queue');
    if (status) {
      return items.filter(item => item.status === status);
    }
    return items.sort((a, b) => new Date(a.queuedAt) - new Date(b.queuedAt));
  }

  updateQueueStatus(id, status) {
    const item = this.read('queue', id);
    if (item) {
      item.status = status;
      item.updatedAt = new Date().toISOString();
      this.write('queue', id, item);
      return true;
    }
    return false;
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  isDuplicate(content) {
    // Check if content already exists in queue or drafts
    const normalizedContent = this.normalizeContent(content);
    const queueItems = this.readAll('queue');
    const draftItems = this.readAll('drafts');
    const publishedItems = this.readAll('published');

    const allItems = [...queueItems, ...draftItems, ...publishedItems];

    for (const item of allItems) {
      if (this.normalizeContent(item.originalContent || item.content) === normalizedContent) {
        return true;
      }
    }
    return false;
  }

  normalizeContent(content) {
    return content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim()
      .substring(0, 200);
  }
}

export default new Storage();
