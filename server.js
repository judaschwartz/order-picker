const http = require('http')
const fs = require('fs')
const url = require('url')
const path = require('path')
const { networkInterfaces } = require('os')

const server = http.createServer((req, res) => {
  const { pathname, query } = url.parse(req.url, true)
  if (req.method === 'GET') {
    let warn = ''
    let filePath = '.' + pathname
    const user = query.user
    try {
      if (filePath === './' && !fs.existsSync(`orders/${user}.csv`)) {
        if (query.lastUser && typeof query.comment !== 'undefined' ) {
          var order = fs.readFileSync(`orders/${query.lastUser}.csv`).toString().split("\n").map(l => l.split(',').map(c => c.trim()))
          if (query.comment !== order[2][0]) {
            order[2][0] = query.comment.replace(/,/g, ' ').replace(/[\n\r]/g, '&#010;')
            fs.writeFileSync(`orders/${query.lastUser}.csv`, order.map(l => l.join(',')).join("\n"))
          }
        }
        if (user) {
          warn = `could not find a record for order #${user}`
        }
        filePath = './start-index.html'
      } else if (filePath === './') {
        filePath = './index.html'
        var order = fs.readFileSync(`orders/${user}.csv`).toString().split("\n").map(l => l.split(',').map(c => c.trim()))
        var lastItm = Number(query.itm) || 0
        let changed = false
        var cmt = typeof query.comment !== 'undefined' ? query.comment : order[2][0]
        if (query.picker) {
          changed = true
          if (order[1][0]) {
            order[1][0] += ':' + query.picker.replace(',', '')
          } else {
            order[1][0] = query.picker.replace(',', '')
          }
        }
        if (typeof query.comment !== 'undefined' && cmt !== order[2][0]) {
          changed = true
          order[2][0] = cmt && cmt.replace(/,/g, ' ').replace(/[\n\r]/g, '&#010;')
        }
        if (lastItm && query.qty !== order[2][lastItm]) {
          changed = true
          order[2][lastItm] = query.qty
        }
        if (changed) {
          fs.writeFileSync(`orders/${user}.csv`, order.map(l => l.join(',')).join("\n"))
        }
        if (order[1][0].includes(':')) {
          warn = 'THIS ORDER HAS BEEN PICKED<br>(at least partially)<br><small>Inputs default number is the qty already picked</small><br>'
        }
        var userName = order[0][0]
        var itm = query.showAll ? 0 : order[1].slice(lastItm + 1).findIndex((n, i) => Number(n) || Number(order[2][i + lastItm + 1]))
        var done = order[0].slice(0, lastItm +1).map((name, i) => {
          const ordered = Number(order[1][i]) || 0
          const got = Number(order[2][i]) || 0
          const klass = ordered !== got ? ' class="yellow"' : ''
          return ordered || got ? `<tr${klass}><td>${ordered}</td><td>${name}</td><td>A-${i}</td><td>${got}</td></tr>` : ''
        }).filter(Boolean)
        var next = order[1][0]
        const headers = '<tr><th width="30px">#</th><th>Item Name</th><th width="40px">ID</th><th width="30px">Got</th></tr>'
        if (itm === -1 || lastItm === order[0].length - 1) {
          done = `<table>${headers}${done.join('')}</table>`
          filePath = './end-index.html'
        } else {
          done = `<table>${headers}${done.reverse().join('')}</table>`
          itm = itm + lastItm + 1
          next = order[0].slice(itm + 1).map((name, i) => {
            const id = i + itm + 1
            const pick = (Number(order[1][id]) || 0) - (Number(order[2][id]) || 0)
            return Number(order[1][id]) ? `<tr><td width="40px">A-${id}</td><td>${name}</td><td width="30px">${pick}</td></tr>` : ''
          }).filter(Boolean)
          next = `<table>${next.join('')}</table>`
        }
      }
    } catch (error) {
      warn = error
      filePath = './error.html'
    }
    const extname = String(path.extname(filePath)).toLowerCase()
    const contentType = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
    }[extname] || 'application/octet-stream'

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/html' })
          res.end('<h1>404 Not Found</h1>')
        } else {
          res.writeHead(500, { 'Content-Type': 'text/html' })
          res.end(`Internal Server Error: ${error.code}`)
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType })
        content = content.toString().replace('WARN', warn)
        if (filePath === './index.html' || filePath === './end-index.html') {
          content = content
            .replace(/USER/g, user)
            .replace('DONE_LIST', done)
            .replace('NEXT_LIST', next)
            .replace('CMT', cmt)
            .replace('QTY', order[1][itm] || '0')
            .replace('FILLED', order[2][itm] !== '0' ? order[2][itm] : '')
            .replace(/ITM/g, itm)
            .replace('ULAST', userName)
            .replace('NAME', order[0][itm])
        } else if (filePath === './start-index.js') {
          content = content.replace('ORDERS', fs.readFileSync('orders.json').toString())
        }
        res.end(content, 'utf-8')
      }
    })
  }
})

// Use the local IP obtained from ifconfig
const LOCAL_IP = process.env.LOCAL_IP || Object.values(networkInterfaces()).flat().find(({ family, internal, address }) => family === "IPv4" && !internal && address.startsWith('192.168.')).address
const PORT = 3000 // Choose a port (e.g., 3000)

server.listen(PORT, LOCAL_IP, () => {
  console.log(`Server is running.\nAny device on this wifi network can access the application in their browser at:\nhttp://${LOCAL_IP}:${PORT}/`)
})

