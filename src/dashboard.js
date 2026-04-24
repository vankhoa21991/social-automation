import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

function getLatestDataDir() {
  const dataDir = path.join(ROOT, 'data');
  const dirs = fs.readdirSync(dataDir)
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();
  return dirs[0] ? path.join(dataDir, dirs[0]) : null;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/trending') {
    const dir = getLatestDataDir();
    const data = dir ? readJson(path.join(dir, 'trending.json')) : null;
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data || { error: 'No data found' }));
    return;
  }

  if (url.pathname === '/api/all') {
    const dir = getLatestDataDir();
    const data = dir ? readJson(path.join(dir, 'all.json')) : null;
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data || { error: 'No data found' }));
    return;
  }

  if (url.pathname === '/api/date') {
    const dir = getLatestDataDir();
    const date = dir ? path.basename(dir) : null;
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ date }));
    return;
  }

  // Serve static files
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  filePath = path.join(PUBLIC, filePath);

  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = process.env.DASHBOARD_PORT || 3737;
server.listen(PORT, () => {
  console.log(`Dashboard: http://localhost:${PORT}`);
});
