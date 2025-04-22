const logger = require('./event-logger');

const http = require('http');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'notes.json');

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/notes') {
    const notes = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(notes);
  }
  else if (req.method === 'POST' && req.url === '/notes') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const newNote = JSON.parse(body);
      const notes = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      notes.push(newNote);
      logger.emit('log', `Yeni not eklendi: ${newNote.title}`);
      fs.writeFileSync(filePath, JSON.stringify(notes, null, 2));
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Note added' }));
    });
  }
  else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3001, () => {
  console.log('Notes server running at http://localhost:3001');
});
