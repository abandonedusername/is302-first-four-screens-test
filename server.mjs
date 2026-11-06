import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const args = process.argv.slice(2);
const portArg = args.findIndex(a => a === '--port');
const port = Number(portArg >= 0 ? args[portArg + 1] : process.env.PORT || 5173);
const files = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/styles.css': ['styles.css', 'text/css'], '/app.js': ['app.js', 'text/javascript'] };
createServer(async (req, res) => {
  const file = files[new URL(req.url, 'http://localhost').pathname];
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const content = await readFile(new URL(file[0], import.meta.url));
    res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control': 'no-cache' });
    res.end(content);
  } catch { res.writeHead(500); res.end('Unable to load file'); }
}).listen(port, '0.0.0.0', () => console.log(`RAFT front desk: http://localhost:${port}`));
