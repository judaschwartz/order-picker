const { createServer } = require('http')
const fs = require('fs')
const { parse } = require('url')
const { networkInterfaces } = require('os')

const pickLine = [[], []]
const outOfLine = []
const prodInfo = fs.existsSync('alerts.json') ? JSON.parse(fs.readFileSync('alerts.json').toString()) : {}
const rawOrders = fs.readFileSync('orders.json').toString()
const totalOrders = Object.keys(JSON.parse(rawOrders)).length
const sides = ['right', 'left', 'no-car']
const pickDuration = (start, end) => {
  start = start.split(':').map(Number)
  end = end.split(':').map(Number)
  return end[1] - start[1] + ((end[0] - start[0]) * 60)
}

const adminTable = (headers, data, name, col) => {
  col = headers.findIndex(h => h.trim() === (col || 'start'))
  data = [headers, ...data.sort((a, b) => {
    if (!Number(a[col].split(' ')[0])) {
      return a[col].toLowerCase() > b[col].toLowerCase() ? 1 : -1
    } else {
      return Number(a[col].split(' ')[0]) - Number(b[col].split(' ')[0])
    }
  })]
  return `<h2>${name}</h2><table><tr><td>${data.map(l => l.join('</td><td>')).join("</td></tr><tr><td>")}</td></tr></table>`
}

const server = createServer((req, res) => {
  const { pathname, query } = parse(req.url, true)
  if (req.method === 'GET') {
    let warn = ''
    let filePath = '.' + pathname
    const user = query.user
    let comment = query.comment
    let prdName, prdQty, prdPicked, slot
    try {
      if (filePath === './' && !fs.existsSync(`orders/${user}.csv`)) {
        if (user) {
          warn = `could not find a record for order #${user}`
        }
        if (query.lastUser) {
          if (typeof comment !== 'undefined') {
            const order = fs.readFileSync(`orders/${query.lastUser}.csv`).toString().split("\n").map(l => l.split(',').map(c => c.trim()))
            if (comment !== order[1][1]) {
              order[1][1] = comment.replace(/,/g, ' ').replace(/[\n\r]/g, '&#010;')
              fs.writeFileSync(`orders/${query.lastUser}.csv`, order.map(l => l.join(',')).join("\n"))
            }
          }
          const side = pickLine.findIndex(s => s.some(c => c[0] === query.lastUser))
          const endTime = new Date().toTimeString().slice(0, 8)
          if (side > -1) {
            const completed = pickLine[side].findIndex(c => c[0] === query.lastUser)
            fs.appendFileSync('./completed-orders.csv', `\n${[
              ...pickLine[side][completed],
              endTime,
              pickDuration(pickLine[side][completed][3], endTime)
            ].join(',')}`)
            outOfLine.push(...pickLine[side].slice(0, completed))
            pickLine[side] = pickLine[side].slice(completed + 1)
          } else {
            const completed = outOfLine.findIndex(c => c[0] === query.lastUser)
            if (completed > -1) {
              fs.appendFileSync('./completed-orders.csv', `\n${[
                ...outOfLine[completed],
                endTime,
                `${pickDuration(outOfLine[completed][3], endTime)} (out of line)`
              ].join(',')}`)
              outOfLine.splice(completed, 1)
            }
          }
        }
        filePath = './start-index.html'
      } else if (filePath === './') {
        filePath = './index.html'
        const order = fs.readFileSync(`orders/${user}.csv`).toString().split("\n").map(l => l.split(',').map(c => c.trim()))
        let lastItm = Number(query.itm) || 1
        let changed = false
        comment = typeof comment !== 'undefined' ? comment : order[1][1]
        if (query.picker) {
          const picker = [query.picker, query.assistant, query.assistant2].join('|').replace(/,/g, ' ')
          console.info(`${picker} started picking order #${user}`)
          warn += `THERE ARE A TOTAL OF ${order[1][3]} ITEMS IN THIS ORDER<br>`
          warn += order[1][3] > 80 ? `<script>alert('This is a large order (${order[1][3]} items) use a larger team to pick')</script>` : ''
          changed = true
          if (order[1][2]) {
            order[1][2] += `:${picker}`
            const leftOff = order.slice(2).findIndex(r => Number(r[1]) && Number(r[1]) !== Number(r[2]))
            lastItm = leftOff > 1 ? leftOff + 1 : 1
            console.warn(`DUPLICATE: This is pick #${order[1][2].split(':').length + 1} for this order starting from after item ${order[lastItm][0]}`)
          } else {
            order[1][2] = picker
          }
          const lane = query.side == 2 ? outOfLine : pickLine[query.side]
          lane.push([user, picker, sides[query.side], new Date().toTimeString().slice(0, 8)])
        }
        if (typeof comment !== 'undefined' && comment !== order[1][1]) {
          changed = true
          order[1][1] = comment && comment.replace(/,/g, ' ').replace(/[\n\r]/g, '&#010;')
        }
        const qty = parseInt(query.qty || 0)
        if (query.qty !== undefined && lastItm > 1 && qty !== order[lastItm][2]) {
          changed = true
          process.env.DEBUG && console.debug(`picked ${qty} ${order[lastItm][0]} for order #${user}`)
          if (parseInt(order[lastItm][1] || 0) !== qty && !query.api) {
            console.warn(`DEVIATION: picked ${qty} ${order[lastItm][0]} for order #${user} but they ordered ${parseInt(order[lastItm][1] || 0)}`)
          }
          order[lastItm][2] = qty
        }
        if (changed) {
          fs.writeFileSync(`orders/${user}.csv`, order.map(l => l.join(',')).join("\n"))
          process.env.DEBUG && console.debug(`order #${user} was updated`)
        }
        if (order[1][2].includes(':')) {
          warn += 'THIS ORDER HAS BEEN PICKED<br><small>(at least partially)<br>the Input boxes number is the qty already picked</small><br>'
        }
        var userName = order[1][0]
        var itm = query.showAll ? 0 : order.slice(lastItm + 1).findIndex(r => Number(r[1]) || Number(r[2]))
        var done = order.slice(2, lastItm +1).map((r, i) => {
          const ordered = Number(r[1]) || 0
          const got = Number(r[2]) || 0
          const klass = ordered !== got ? ' class="discrepancy"' : ''
          return ordered || got ? `<tr${klass} onclick="window.location='/?user=${user}&itm=${i + 1}';"><td>${r[3]}</td><td>${r[0]}</td><td>${ordered}</td><td>${got}</td></tr>` : ''
        }).filter(Boolean)
        var next = order[1][2]
        let headers = '<tr><th width="40px">ID</th><th>Item Name</th><th width="30px">#</th><th width="30px">Got</th></tr>'
        if (query.api) {
          filePath = './api.html'
        } else if (itm === -1 || lastItm === order.length - 2) {
          itm = order.length - 1
          console.info(`${order[1][2]} finished picking order #${user}`)
          warn = done.length ? warn : 'This order has no items to pick'
          warn += order[order.length - 1][1] === 'Yes' ? '<br><b>PICKUP PRODUCE PACKAGE</b>' : ''
          done = `<table>${headers}${done.join('')}</table>`
          filePath = './end-index.html'
        } else {
          done = `<table>${headers}${done.reverse().join('')}</table>`
          itm = itm + lastItm + 1
          warn += prodInfo[order[itm][3].toUpperCase()] ? `<script>alert('${prodInfo[order[itm][3].toUpperCase()]}')</script>` : ''
          next = order.slice(itm + 1).map((r, i) => {
            const pick = (Number(r[1]) || 0) - (Number(r[2]) || 0)
            return Number(r[1]) ? `<tr data-itm="${i+itm+1}" data-n="${r[1]}"><td>${r[3]}</td><td>${r[0]}</td><td>${pick}</td></tr>` : ''
          }).filter(Boolean)
          headers = '<tr><th width="40px">ID</th><th>Item Name</th><th width="30px">Needed</th></tr>'
          next = `<table>${headers}${next.join('')}</table>`
        }
        prdName = order[itm][0]
        slot = `${order[itm][4] ? 'side' : ''}"># ${order[itm][3]}`
        prdQty = order[itm][1] || '0'
        prdPicked = order[itm][2] !== '0' ? order[itm][2] : ''
      }
    } catch (error) {
      warn = error.stack.replaceAll('\n', '<br>')
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
          content = content.replace(/USER|DONE_LIST|NEXT_LIST|CMT|QTY|FILLED|ITM|SLOT|ULAST|NAME/g, (matched) => {
            switch(matched){
              case 'USER': return user
              case 'DONE_LIST': return done
              case 'NEXT_LIST': return next
              case 'CMT': return comment
              case 'QTY': return prdQty
              case 'FILLED': return prdPicked
              case 'ITM': return itm
              case 'SLOT': return slot
              case 'ULAST': return userName
              case 'NAME': return prdName
              default: return matched
            }
          })
        } else if (filePath === './start-index.js') {
          content = content.replace('ORDERS', rawOrders)
        } else if (filePath === './admin.html') {
          if (query.remove) {
            console.log('removing alert for', query.remove.toUpperCase())
            delete prodInfo[query.remove.toUpperCase()]
          }
          if (query.prod && query.alert) {
            prodInfo[query.prod.toUpperCase()] = query.alert
            console.log('added alert for', query.prod.toUpperCase())
            fs.writeFileSync('alerts.json', JSON.stringify(prodInfo))
          }
          content = content.replace('ALERTS', Object.entries(prodInfo).map(p => `<tr><td>x</td><td>${p[0]}</td><td>${p[1]}</td></tr>`).join(''))
          content += adminTable(['orderId','picker','start'], pickLine[1].map(r => [r[0],r[1],r[3]]), 'Right Side:', query.right)
          content += adminTable(['orderId','picker','start'], pickLine[0].map(r => [r[0],r[1],r[3]]), 'Left Side:', query.left)
          content += adminTable(['orderId','picker','side','start'], outOfLine, 'Out of Line:', query.out)
          const orders = fs.readFileSync('completed-orders.csv', 'utf8').split("\n").map(r => r.split(','))
          content += adminTable(orders[0], orders.slice(1), `Completed Orders: ${orders.length - 1} of ${totalOrders}`, query.orders)
        }
        res.end(content, 'utf-8')
      }
    })
  }
})

// Use the local IP obtained from ifconfig
const LOCAL_IP = process.env.LOCAL_IP || Object.values(networkInterfaces()).flat().find(({ family, internal, address }) => family === "IPv4" && !internal && address.startsWith('192.168.')).address
const PORT = 3000 // Choose a port (e.g., 3000)

if (!fs.existsSync('completed-orders.csv')) {
  fs.writeFileSync('completed-orders.csv', 'orderId,picker,side,start,end,minutes')
}
server.listen(PORT, LOCAL_IP, () => {
  console.log(`Server is running. There are ${totalOrders} orders to pick\nAny device on this wifi network can access the application in their browser at:\nhttp://${LOCAL_IP}:${PORT}/`)
})

