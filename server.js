const { createServer } = require('http')
const fs = require('fs')
const { parse } = require('url')
const { networkInterfaces } = require('os')

const pickLine = [[], []]
const outOfLine = []
const server = createServer((req, res) => {
  const { pathname, query } = parse(req.url, true)
  if (req.method === 'GET') {
    let warn = ''
    let filePath = '.' + pathname
    const user = query.user
    let comment = query.comment
    let order
    try {
      if (filePath === './' && !fs.existsSync(`orders/${user}.csv`)) {
        if (user) {
          warn = `could not find a record for order #${user}`
        }
        if (query.lastUser) {
          if (typeof comment !== 'undefined') {
            order = fs.readFileSync(`orders/${query.lastUser}.csv`).toString().split("\n").map(l => l.split(',').map(c => c.trim()))
            if (comment !== order[2][0]) {
              order[2][0] = comment.replace(/,/g, ' ').replace(/[\n\r]/g, '&#010;')
              fs.writeFileSync(`orders/${query.lastUser}.csv`, order.map(l => l.join(',')).join("\n"))
            }
          }
          const side = pickLine.findIndex(s => s.some(c => c[0] === query.lastUser))
          if (side > -1) {
            const completed = pickLine[side].findIndex(c => c[0] === query.lastUser)
            fs.appendFileSync('./completed-orders.csv', `\n${[...pickLine[side][completed], new Date().toTimeString().slice(0, 8), 0].join(',')}`)
            outOfLine.push(...pickLine[side].slice(0, completed))
            pickLine[side] = pickLine[side].slice(completed + 1)
          } else {
            const completed = outOfLine.findIndex(c => c[0] === query.lastUser)
            if (completed > -1) {
              fs.appendFileSync('./completed-orders.csv', `\n${[...outOfLine[completed], new Date().toTimeString().slice(0, 8), 1].join(',')}`)
              outOfLine.splice(completed, 1)
            }
          }
        }
        filePath = './start-index.html'
      } else if (filePath === './') {
        filePath = './index.html'
        order = fs.readFileSync(`orders/${user}.csv`).toString().split("\n").map(l => l.split(',').map(c => c.trim()))
        const lastItm = Number(query.itm) || 0
        let changed = false
        comment = typeof comment !== 'undefined' ? comment : order[2][0]
        if (query.picker) {
          console.info(`${query.picker} started picking order #${user}`)
          changed = true
          if (order[1][0]) {
            console.warn(`DUPLICATE: this is pick #${order[1][0].split(':').length + 1} for this order`)
            order[1][0] += ':' + query.picker.replace(',', '')
          } else {
            order[1][0] = query.picker.replace(',', '')
          }
          pickLine[query.side].push([user, query.picker, query.side, new Date().toTimeString().slice(0, 8)])
        }
        if (typeof comment !== 'undefined' && comment !== order[2][0]) {
          changed = true
          order[2][0] = comment && comment.replace(/,/g, ' ').replace(/[\n\r]/g, '&#010;')
        }
        const qty = parseInt(query.qty || 0)
        if (lastItm && qty !== order[2][lastItm]) {
          changed = true
          process.env.DEBUG && console.debug(`picked ${qty} ${order[0][lastItm]} for order #${user}`)
          if (parseInt(order[1][lastItm] || 0) !== qty) {
            console.warn(`DEVIATION: picked ${qty} ${order[0][lastItm]} for order #${user} but they ordered ${parseInt(order[1][lastItm] || 0)}`)
          }
          order[2][lastItm] = qty
        }
        if (changed) {
          fs.writeFileSync(`orders/${user}.csv`, order.map(l => l.join(',')).join("\n"))
          process.env.DEBUG && console.debug(`order #${user} was updated`)
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
          console.info(`${order[1][0]} finished picking order #${user}`)
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
    const extname = filePath.split('.').slice(-1)[0].toLowerCase()
    const contentType = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'text/javascript',
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
            .replace(/NEXT_LIST/g, next)
            .replace('CMT', comment)
            .replace('QTY', order[1][itm] || '0')
            .replace('FILLED', order[2][itm] !== '0' ? order[2][itm] : '')
            .replace(/ITM/g, itm)
            .replace('ULAST', userName)
            .replace('NAME', order[0][itm])
        } else if (filePath === './start-index.js') {
          content = content.replace('ORDERS', fs.readFileSync('orders.json').toString())
        } else if (filePath === './admin.html') {
          content += `Right:<br>${pickLine[1].join('<br>')}<br><br>`
          content += `Left:<br>${pickLine[0].join('<br>')}<br><br>`
          content += `Out of Line:<br>${outOfLine.join('<br>')}`
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

