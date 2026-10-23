const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);

  // Map to local file path
  let filePath = path.join(DIST, reqPath);

  // Check if directory -> try index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  } else if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  } else if (!fs.existsSync(filePath) && fs.existsSync(path.join(filePath, 'index.html'))) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Handle Range requests for video/audio streaming
  const range = req.headers.range;
  if (range && (ext === '.mp4' || ext === '.webm')) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType
    });
    file.pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Length': stat.size,
    'Content-Type': contentType,
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(filePath).pipe(res);
});

// Auto-build if dist/ has not been generated yet
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.log('Static site distribution (dist/) not detected. Automatically generating build...');
  const { build } = require('./scripts/build');
  build();
}

function startServer(port, maxAttempts = 10) {
  const srv = server.listen(port, '127.0.0.1', () => {
    console.log('\n======================================================');
    console.log(`  🚀 Kiln File Processing Platform`);
    console.log(`  🔒 100% Private Client-Side Processing Engine`);
    console.log(`  🌐 Web App: http://127.0.0.1:${port}/`);
    console.log('======================================================\n');
  });

  srv.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (maxAttempts > 0) {
        console.warn(`[Port ${port} in use] Trying port ${port + 1}...`);
        startServer(port + 1, maxAttempts - 1);
      } else {
        console.error(`Error: Could not find an open port after 10 attempts.`);
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer(Number(PORT));
