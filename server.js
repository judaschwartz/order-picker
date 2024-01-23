const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');

const server = http.createServer((req, res) => {
  const { pathname, query } = url.parse(req.url, true);
  if (req.method === 'GET') {
    let warn = ''
    let filePath = '.' + pathname;
    const user = query.user && fs.existsSync(`orders/${query.user}.csv`) ? query.user : ''
    if (filePath === './' && !user) {
      if (query.lastUser && query.comment) {
        var order = fs.readFileSync(`orders/${query.lastUser}.csv`).toString().split("\n").map(l => l.split(',').map(c => c.trim()))
        if (query.comment !== order[2][0]) {
          order[2][0] = query.comment.replace(',', '').replace(/[\n\r]/g, ' ');
          fs.writeFileSync(`orders/${query.lastUser}.csv`, order.map(l => l.join(',')).join("\n"));
        }
      }
      if (query.user) {
        warn = `could not find a record for order #${query.user}`
      }
      filePath = './start-index.html';
    } else if (filePath === './') {
      filePath = './index.html';
      var order = fs.readFileSync(`orders/${user}.csv`).toString().split("\n").map(l => l.split(',').map(c => c.trim()))
      var lastItm = Number(query.itm) || 0;
      var cmt = typeof query.comment != 'undefined' ? query.comment : order[2][0] || '';
      if ((lastItm && query.qty !== order[2][lastItm]) || cmt !== order[2][0] || query.picker) {
        if (query.picker) {
          if (order[1][0]) {
            order[1][0] += ':' + query.picker?.replace(',', '');
          } else {
            order[1][0] = query.picker?.replace(',', '');
          }
        }
        order[2][0] = cmt?.replace(',', '')?.replace(/[\n\r]/g, ' ');
        order[2][lastItm] = query.qty;
        fs.writeFileSync(`orders/${user}.csv`, order.map(l => l.join(',')).join("\n"));
      }
      if (order[1][0].includes(':')) {
        warn = 'This order has already been worked on by a prior person and the input default values reflect what has already been given'
      }
      var userName = order[0][0]
      var itm = query.showAll ? 0 : order[1].slice(lastItm + 1).findIndex((n, i) => Number(n) || Number(order[2][i + lastItm + 1]))
      var done = order[0].slice(0, lastItm +1).map((c, i) => {
        const ordered = Number(order[1][i]) 
        const got = Number(order[2][i])
        const klass = ordered !== got ? ' class="yellow"' : ''
        return ordered || got ? `<tr${klass}><td>${ordered}</td><td>${c}</td><td>A-${i}</td><td>${got}</td></tr>` : ''
      }).filter(Boolean)
      var next = order[1][0]
      const headers = '<tr><th width="30px">#</th><th>Item Name</th><th width="40px">ID</th><th width="30px">Got</th></tr>'
      if (itm === -1 || lastItm === order[0].length - 1) {
        done = `<table>${headers}${done.join('')}</table>`
        filePath = './end-index.html';
      } else {
        done = `<table>${headers}${done.reverse().join('')}</table>`
        itm = itm + lastItm + 1
        next = order[0].slice(itm + 1).map((v, i) => {
          const c = i + itm + 1
          return Number(order[1][c]) ? `<tr><td width="40px">A-${c}</td><td>${v}</td><td width="30px">${order[1][c] - order[2][c]}</td></tr>` : ''
        }).filter(Boolean)
        next = `<table>${next.join('')}</table>`
      }
      
    }
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
    }[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end('<h1>404 Not Found</h1>');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`Internal Server Error: ${error.code}`);
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        content = content.toString().replace('WARN', warn)
        if (user) {
          content = content
            .replaceAll('USER', user)
            .replace('DONE_LIST', done)
            .replace('NEXT_LIST', next)
            .replace('CMT', cmt)
            .replace('QTY', order[1][itm])
            .replace('FILLED', order[2][itm] !== '0' ? order[2][itm] : '')
            .replaceAll('ITM', itm).replace('ULAST', userName)
            .replace('NAME', order[0][itm])
        } else if (filePath === './start-index.html') {
          content = content.replace('ORDERS', fs.readFileSync('orders.json').toString())
        }
        res.end(content, 'utf-8');
      }
    });
  }
});

const PORT = 3000; // Choose a port (e.g., 3000)
const LOCAL_IP = '192.168.1.22'; // Use the local IP obtained from ifconfig

server.listen(PORT, LOCAL_IP, () => {
  console.log(`Server is running on http://${LOCAL_IP}:${PORT}/`);
});

