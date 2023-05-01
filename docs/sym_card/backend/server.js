const express = require('express')
const app = express()
const port = 3001
const fs = require('fs');
const path = require('path');

const server = require('https').createServer({
    key: fs.readFileSync(path.join(__dirname, './ssl/privatekey.pem')),
    cert: fs.readFileSync(path.join(__dirname, './ssl/cert.pem')),
}, app)
const public_path = path.join(__dirname, '../frontend/public');

app.get('/', (req, res) => {
  fs.readFile(public_path + '/index.html', (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Internal Server Error');
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(data);
    }
  });
});

app.get('/setting', (req, res) => {
  fs.readFile(public_path + '/settings.html', (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Internal Server Error');
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(data);
    }
  });
});

app.get('/payment', (req, res) => {
  fs.readFile(public_path + '/payment.html', (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Internal Server Error');
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(data);
    }
  });
});

server.listen(port, () => console.log(`Listening on port ${port}!`))