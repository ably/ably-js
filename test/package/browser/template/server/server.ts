import express from 'express';
import path from 'node:path';

async function startWebServer(listenPort: number) {
  const server = express();
  server.use(express.static(path.join(__dirname, '/resources')));
  server.use('/index.js', express.static(path.join(__dirname, '..', 'dist', 'index.js')));

  server.listen(listenPort);
}

startWebServer(4567);
