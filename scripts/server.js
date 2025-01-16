const { createServer } = require('http')
const fs = require('fs')
const { parse } = require('url')
const { networkInterfaces } = require('os')
const puppeteer = require('puppeteer')
const { print } = require("unix-print")

const path = 'orders/gen/'
const pickLine = [[], [], []]
const sides = ['left', 'right', 'noCar']
if (!fs.existsSync('orders/orders.json')) {
  return console.log('orders.json file not found you need to execute the "npm run init" command to create the orders')
}
if (!fs.existsSync('orders/completed-orders.csv')) {
  fs.writeFileSync('orders/completed-orders.csv', 'name,orderId,picker,qty,start,end,minutes,side')
}
if (!fs.existsSync('orders/volunteers.csv')) {
  fs.writeFileSync('orders/volunteers.csv', 'ID,Name,Phone,Email\n990,Admin,555-555-5555,')
}
const rawOrders = fs.readFileSync('orders/orders.json').toString()
const prodAlerts = fs.existsSync('orders/alerts.json') ? JSON.parse(fs.readFileSync('orders/alerts.json').toString()) : {}
const itmTotals = fs.existsSync('orders/itmTotals.json') ? JSON.parse(fs.readFileSync('orders/itmTotals.json').toString()) : {}
const ordersJson = JSON.parse(rawOrders)
const volunteers = fs.readFileSync('orders/volunteers.csv').toString().split("\n").map(l => l.split(','))
let rawVolunteers = volunteers.slice(1).map(l => `"${l[0]}": "${l[1]}"`).join(',')
let volunteersJson = JSON.parse(`{${rawVolunteers}}`)
const totalOrders = Object.keys(ordersJson).length

const pickDuration = (completed, side) => {
  const endTime = new Date().toTimeString().slice(0, 8)
  const start = completed[4].split(':').map(Number)
  const end = endTime.split(':').map(Number)
  return [...completed, endTime, end[1] - start[1] + ((end[0] - start[0]) * 60), side]
}

const adminTable = (headers, data, name, col, id) => {
  let asc = col.slice(0, 2) === 'A-'
  col = headers.findIndex(h => h === col.replace(/^A-/,''))
  if (col < 0) col = 0
  data = [headers, ...data.sort((a, b) => {
    [a, b] = asc ? [b, a] : [a, b]
    if (Number(a[col])) {
      return Number(a[col]) - Number(b[col])
    } else if (Number(a[col].replaceAll(':', ''))) {
      return Number(a[col].replaceAll(':', '')) - Number(b[col].replaceAll(':', ''))
    } else if (Number(a[col]?.split(' ')?.[0]?.replace(/^A/, ''))) {
      return Number(a[col].split(' ')[0].replace(/^A/,'')) - Number(b[col].split(' ')[0].replace(/^A/,''))
    } else {
      return a[col].toLowerCase() > b[col].toLowerCase() ? 1 : -1
    }
  })]
  return `<div class="adminTable" id="${id}"><h2>${name}</h2><table><tr><td>${data.map(l => l.join('</td><td>')).join("</td></tr><tr><td>")}</td></tr></table></div>`
}

async function printOrder(id, picker, order) {
  try {
    let  html = `<h1>Order #${id} for ${order[1][0]}</h1><h2>${order[1][3]} items, Picked by ${picker}</h2>`
    const headers = '<tr><th width="60px">ID</th><th>Item Name</th><th width="80px"># ordered</th></tr>'
    const next = order.slice(2).filter(r => Number(r[1])).map(r => `<tr><td>${r[3]}</td><td>${r[0]}</td><td>${r[1]}</td></tr>`)
    html += `<table>${headers}${next.join('')}</table><style>${fs.readFileSync('./www/style-admin.css').toString()}</style>`
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.setContent(html)
    const pdfPath = `./orders/printed/print-${id}.pdf`
    await page.pdf({path: pdfPath, format: 'A4', printBackground: true, margin: {top: '2cm', right: '2cm', bottom: '2cm', left: '2cm'}})
    await browser.close()
    // await print(pdfPath)
    console.log(`Order #${id} printed successfully`)
  } catch (error) {
    console.error(`Error printing PDF for order #${id}:`, error)
  }
}

const server = createServer((req, res) => {
  const { pathname, query } = parse(req.url, true)
  if (req.method === 'GET') {
    let warn = ''
    let filePath = '.' + pathname
    const user = query.user
    let comment = query.comment
    let prdName, prdQty, prdPicked, slot, side
    try {
      if (filePath === './' && !fs.existsSync(`${path}${user}.csv`)) {
        filePath = './start-index.html'
        if (user) {
          warn = `could not find a record for order #${user}`
        }
        if (query.lastUser) { // lastUser is the last order that was picked
          if (typeof comment !== 'undefined') {
            const order = fs.readFileSync(`${path}${query.lastUser}.csv`).toString().split("\n").map(l => l.split(',').map(c => c.trim()))
            if (comment !== order[1][1]) {
              order[1][1] = comment.replace(/,/g, ' ').replace(/[\n\r]/g, '&#010;')
              fs.writeFileSync(`${path}${query.lastUser}.csv`, order.map(l => l.join(',')).join("\n"))
            }
          }
          const side = pickLine.findIndex(s => s.some(c => c[1] === query.lastUser))
          if (side > -1) {
            const completed = pickLine[side].splice(pickLine[side].findIndex(c => c[1] === query.lastUser), 1)[0]
            fs.appendFileSync('./orders/completed-orders.csv', `\n${pickDuration(completed, sides[side])}`)
            console.log(`moved #${query.lastUser} from picking line to completed orders`)
          } else {
            console.error(`could not find order #${query.lastUser} in the picking line`)
          }
        }
        if (query.deleteUser) {
          const side = pickLine.findIndex(s => s.some(c => c[1] === query.deleteUser))
          if (side > -1) {
            pickLine[side].splice(pickLine[side].findIndex(c => c[1] === query.deleteUser), 1)
            console.info(`canceled picking order #${query.deleteUser}`)
            const order = fs.readFileSync(`${path}${query.deleteUser}.csv`).toString().split("\n").map(l => l.split(',').map(c => c.trim()))
            order[1][2] = order[1][2].split(':').slice(0, -1).join(':')
            fs.writeFileSync(`${path}${query.deleteUser}.csv`, order.map(l => l.join(',')).join("\n"))
          }
        }
      } else if (filePath === './') {
        filePath = './index.html'
        const order = fs.readFileSync(`${path}${user}.csv`).toString().split("\n").map(l => l.split(',').map(c => c.trim()))
        var userName = order[1][0]
        let lastItm = Number(query.itm) || 1
        let changed = false
        comment = typeof comment !== 'undefined' ? comment : order[1][1]
        if (query.picker) { //first itm when starting an order
          const picker = `${volunteersJson[query.picker]} (#${query.picker})`
          printOrder(user, picker, order)
          console.info(`${picker} started picking order #${user}`)
          warn += `THERE ARE A TOTAL OF ${order[1][3]} ITEMS IN THIS ORDER<br>`
          warn += order[1][3] > 35 ? `<script>alert('This is a large order (${order[1][3]} items) use a larger team to pick')</script>` : ''
          changed = true
          if (order[1][2]) {
            order[1][2] += `:${query.picker}`
            const leftOff = order.slice(2).findIndex(r => Number(r[1]) && Number(r[1]) !== Number(r[2]))
            lastItm = leftOff > 1 ? leftOff + 1 : 1
            console.warn(`DUPLICATE: This is pick #${order[1][2].split(':').length + 1} for this order starting from after item ${order[lastItm][0]}`)
          } else {
            order[1][2] = query.picker
          }
          pickLine[query.side].push([ordersJson[String(user)], user, query.picker, order[1][3], new Date().toTimeString().slice(0, 8)])
        }
        if (typeof comment !== 'undefined' && comment !== order[1][1]) {
          changed = true
          order[1][1] = comment && comment.replace(/,/g, ' ').replace(/[\n\r]/g, '&#010;')
        }
        const qty = parseInt(query.qty || 0)
        const lstQty = parseInt(order[lastItm][2] || 0)
        if (query.qty !== undefined && lastItm > 1 && qty !== lstQty && qty !== 998) {
          changed = true
          process.env.DEBUG && console.debug(`picked ${qty} ${order[lastItm][0]} for order #${user}`)
          if (parseInt(order[lastItm][1] || 0) !== qty && !query.api) {
            console.warn(`DEVIATION: picked ${qty} ${order[lastItm][0]} for order #${user} but they ordered ${parseInt(order[lastItm][1] || 0)}`)
          }
          order[lastItm][2] = qty
          const itmKey = `${order[lastItm][3]}-${order[lastItm][0]}`
          if (itmTotals[itmKey]) {
            itmTotals[itmKey] += (qty - lstQty)
          } else {
            itmTotals[itmKey] = qty
          }
        }
        if (changed) {
          fs.writeFileSync(`${path}${user}.csv`, order.map(l => l.join(',')).join("\n"))
          process.env.DEBUG && console.debug(`order #${user} was updated`)
        }
        if (order[1][2].includes(':')) {
          warn += 'THIS ORDER HAS BEEN <small>(at least partially) </small>PICKED<br><small>the quantity received box includes the number already picked last time</small><br>'
        }
        var itm = query.showAll ? 0 : order.slice(lastItm + 1).findIndex(r => Number(r[1]) || Number(r[2]))
        if (qty === 998) lastItm = order.length - 2
        var done = order.slice(2, lastItm +1).map((r, i) => {
          const ordered = Number(r[1]) || 0
          const got = Number(r[2]) || 0
          const klass = ordered !== got ? ' class="discrepancy"' : ''
          return ordered || got ? `<tr${klass} onclick="window.location='/?user=${user}&itm=${i + 1}';"><td>${r[3]}</td><td>${r[0]}</td><td>${ordered}</td><td>${got}</td></tr>` : ''
        }).filter(Boolean)
        var next = order[1][2] ? `${volunteersJson[order[1][2].split(':').at(-1)]} (# ${order[1][2].split(':').at(-1)})` : ''
        let headers = '<tr><th width="40px">ID</th><th>Item Name</th><th width="30px">#</th><th width="30px">Got</th></tr>'
        if (query.api) { // api pick
          filePath = './api.html'
        } else if (itm === -1 || lastItm === order.length - 2) { // all items have been picked
          itm = order.length - 1
          console.info(`Picker ${next} on confirmation page for order #${user}`)
          warn += done.length ? '' : 'This order has no items to pick'
          warn += order[order.length - 1][1] === 'Yes' ? '<br><b>PICKUP PRODUCE PACKAGE</b>' : ''
          done = `<table>${headers}${done.join('')}</table>`
          filePath = './end-index.html'
          fs.writeFileSync('orders/itmTotals.json', JSON.stringify(itmTotals, null, 2))
        } else {
          done = `<table>${headers}${done.reverse().join('')}</table>`
          itm = itm + lastItm + 1
          warn += prodAlerts['POP ' + order[itm][3]] ? `<script>alert('${ prodAlerts['POP ' + order[itm][3]]}')</script>` : ''
          next = order.slice(itm + 1).map((r, i) => {
            const pick = (Number(r[1]) || 0) - (Number(r[2]) || 0)
            return Number(r[1]) ? `<tr data-itm="${i+itm+1}" data-n="${r[1]}"><td>${r[3]}</td><td>${r[0]}</td><td>${pick}</td></tr>` : ''
          }).filter(Boolean)
          headers = '<tr><th width="40px">ID</th><th>Item Name</th><th width="30px">Needed</th></tr>'
          next = `<table>${headers}${next.join('')}</table>`
        }
        slot = order[itm][3]
        prdName = order[itm][0] + (prodAlerts[slot] ? `<i>${prodAlerts[slot]}</i>` : '')
        side = order[itm][4] ? 'side' : ''
        prdQty = order[itm][1] || '0'
        prdPicked = order[itm][2] !== '0' ? order[itm][2] : ''
      } else if (filePath.startsWith('./admin')) {
        if (query.remove) {
          delete prodAlerts[query.remove]
          console.log('removed alert for', query.remove)
          fs.writeFileSync('orders/alerts.json', JSON.stringify(prodAlerts, null, 2))
        }
        if (query.prodId && query.itmAlert) {
          prodAlerts[query.prodId] = query.itmAlert
          console.log('added alert for', query.prodId)
          fs.writeFileSync('orders/alerts.json', JSON.stringify(prodAlerts, null, 2))
        }
        filePath = './admin.html'
      } else if (filePath.startsWith('./vol')) {
        if (query.newId && query.name) {
          console.log('adding volunteer ', query.name, ' with id ', query.newId)
          volunteers.push([query.newId, query.name.replace(/,/g, ' '), query.phone, query.email])
          rawVolunteers = volunteers.slice(1).map(l => `"${l[0]}": "${l[1]}"`).join(',')
          volunteersJson = JSON.parse(`{${rawVolunteers}}`)
          fs.appendFileSync('./orders/volunteers.csv', `\n${volunteers.at(-1).join(',')}`)
        }
        filePath = './volunteers.html'
      }
    } catch (error) {
      warn = error.stack.replaceAll('\n', '<br>')
      filePath = './error.html'
    }
    const extname = filePath.split('.').at(-1).toLowerCase()
    const contentType = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'text/javascript',
    }[extname] || 'application/octet-stream'

    fs.readFile(`./www/${filePath}`, (error, content) => {
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
        try {
          content = content.toString().replace('WARN', warn)
          if (filePath === './index.html' || filePath === './end-index.html') {
            content = content.replace(/USER|DONE_LIST|NEXT_LIST|CMT|QTY|FILLED|ITM|SLOT|SIDE|ULAST|NAME/g, (matched) => {
              switch(matched){
                case 'USER': return user
                case 'DONE_LIST': return done
                case 'NEXT_LIST': return next
                case 'CMT': return comment
                case 'QTY': return prdQty
                case 'FILLED': return prdPicked
                case 'ITM': return itm
                case 'SLOT': return slot
                case 'SIDE': return side
                case 'ULAST': return userName
                case 'NAME': return prdName
                default: return matched
              }
            })
          } else if (filePath === './start-index.js') {
            content = content.replace('ORDERS', rawOrders)
            content = content.replace('VOLUNTEERS', `{${rawVolunteers}}`)
          } else if (filePath.startsWith('./admin.html')) {
            try {
              content += adminTable(['delete','ID','alert'], Object.entries(prodAlerts).map(a => ['&#10060;', ...a]), '', 'ID', 'alerts')
              content += adminTable(['name','orderId','picker','qty','start'], pickLine[1], 'Right Side:', query.right || 'start', 'right')
              content += adminTable(['name','orderId','picker','qty','start'], pickLine[0], 'Left Side:', query.left || 'start', 'left')
              content += adminTable(['name','orderId','picker','qty','start'], pickLine[2], 'No car:', query.noCar || 'start', 'noCar')
              const orders = fs.readFileSync('orders/completed-orders.csv', 'utf8').split("\n").map(r => r.split(','))
              const unqIds = [...new Set(orders.map(o => o[1]))]
              content += adminTable(orders[0], orders.slice(1), `Picked Orders: ${unqIds.length - 1} of ${totalOrders}`, query.orders || 'end', 'orders')
              content += adminTable(['ID','name','qtyPicked'], Object.entries(itmTotals).map(i => [...i[0].split('-'), i[1]]), 'Totals picked by Item:', query.itms || 'ID', 'itms')
              const coming = Object.entries(ordersJson).filter(k => k[0] && !unqIds.includes(k[0]))
              content += adminTable(['orderID','name'], coming, `Un-filled Orders: ${coming.length} of ${totalOrders}`, query.waiting || 'orderID', 'waiting')
            } catch (e) {
              content += 'THERE WAS AN ERROR RENDERING THE ADMIN PAGE<br>' + e.stack.replaceAll('\n', '<br>')
            }
          } else if (filePath.startsWith('./volunteers.html')) {
            try {
              content += adminTable(volunteers[0], volunteers.slice(2), 'Registered Volunteers', query.volunteers || 'A-ID', 'volunteers')
            } catch (e) {
              content += 'THERE WAS AN ERROR RENDERING THE VOLUNTEERS PAGE<br>' + e.stack.replaceAll('\n', '<br>')
            }
          }
        } catch (err) {
          content += `THERE WAS AN ERROR RENDERING THE PAGE<br>${err.stack.replaceAll('\n', '<br>')}`
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
  console.log(`Server is running. There are ${totalOrders} orders to pick\nAny device on this wifi network can access the application in their browser at:\nhttp://${LOCAL_IP}:${PORT}/`)
})
