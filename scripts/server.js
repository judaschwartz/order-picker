const { createServer } = require('http')
const fs = require('fs')
const { parse } = require('url')
const { networkInterfaces } = require('os')
const { launch } = require('puppeteer')
const { print } = require("unix-print")

const today = new Date().toLocaleDateString().split('/')
const orderIdPrefix = process.env.ORDER_PREFIX || (Number(today[0]) > 6 ? 'S' : 'P') + (today[2].slice(-2))
const path = `orders/${orderIdPrefix}/`
if (!fs.existsSync(`${path}orders.json`)) {
  return console.log('orders.json file not found you need to execute the "npm run init" command to create the orders')
}
if (!fs.existsSync(`${path}printed`)) {fs.mkdirSync(`${path}printed`)}
if (!fs.existsSync(`${path}completed-orders.csv`)) {
  fs.writeFileSync(`${path}completed-orders.csv`, 'name,orderId,picker,qty,start,end,minutes,aisle')
}
if (!fs.existsSync(`${path}volunteers.csv`)) {
  fs.writeFileSync(`${path}volunteers.csv`, 'ID,Name,Phone,Email,Age,Own,Start,End,[OrdId]\n998,Admin,,,,,,,[]')
}
if (!fs.existsSync(`${path}pickLine.csv`)) {
  fs.writeFileSync(`${path}pickLine.csv`, 'Name,ID,picker,ttl,Start,Aisle')
}
const blocked = fs.existsSync(`${path}blocked.txt`) ? fs.readFileSync(`${path}blocked.txt`).toString().split(',').filter(Boolean) : []
const pickLine = fs.readFileSync(`${path}pickLine.csv`).toString().split('\n').map(l => l.split(','))
const prodAlerts = fs.existsSync(`${path}alerts.json`) ? JSON.parse(fs.readFileSync(`${path}alerts.json`).toString()) : {}
const itmTotals = fs.existsSync(`${path}itmTotals.csv`) ? fs.readFileSync(`${path}itmTotals.csv`).toString().split('\n').map(l => l.split(',')) : []
const itmsIndex = JSON.parse(`{${itmTotals.map((l, i) => `"${l[0]}": "${i}"`).join(',')}}`)
let rawOrders = fs.readFileSync(`${path}orders.json`).toString()
const ordersJson = JSON.parse(rawOrders)
let totalOrders = Object.keys(ordersJson).length
const volunteers = fs.readFileSync(`${path}volunteers.csv`).toString().split('\n').map(l => {
  const row = l.replace(/[\[\]"]/g, '').split(',')
  return [...row.slice(0, 8), [...row.slice(8).filter(Boolean)]]
})

let rawVolunteers = volunteers.slice(1).map(l => `"${l[0]}": "${l[1]}"`).join(',')
let volunteersJson = JSON.parse(`{${rawVolunteers}}`)

function combineOrders (id1, id2) {
  try {
    const ord1 = readOrderFile(id1)
    const ord2 = readOrderFile(id2) 
    if (!ord1 || !ord2) return console.error('could not find orders to combine')
    const newOrder = ord1.slice(2).map((l, i) => {
      const ordered = (Number(l[1]) || 0) + (Number(ord2[i + 2]?.[1]) || 0)
      const picked = (Number(l[2]) || 0) + (Number(ord2[i + 2]?.[2]) || 0)
      //if (l[1]  === 'YES' || ord2[i + 2]?.[1] === 'YES') return [l[0], 'YES', , l[3], l[4]]
      return [l[0], ordered, picked, l[3], l[4]]
    })
    const ttl = Number(ord1[1][3]) + Number(ord2[1][3])
    const name = `${ord1[1][0]} & ${ord2[1][0]}`.trim()
    const comboId = id1 + id2.padStart(3 * Math.ceil(id2.length / 3), '0')
    fs.writeFileSync(`${path}gen/${comboId}.csv`, [ord1[0], [name,,,ttl,], ...newOrder].map(l => l.join(',')).join("\n"))
    blocked.push(id1, id2)
    ordersJson[comboId] = name
    rawOrders = JSON.stringify(ordersJson, null, 2)
    totalOrders--
    fs.writeFileSync(`${path}orders.json`, rawOrders)
    fs.renameSync(`${path}gen/${id1}.csv`, `${path}gen/${id1}-combo.csv`)
    fs.renameSync(`${path}gen/${id2}.csv`, `${path}gen/${id2}-combo.csv`)
    console.log(`combined orders ${id1} and ${id2} new order ID is ${comboId}`)
    return `combined orders ${id1} and ${id2} new order ID is ${comboId}`
  } catch (error) {
    console.error('error combining orders', error)
    return 'error combining orders'
  }
}

function pickDuration (completed) {
  const endTime = new Date().toTimeString().slice(0, 8)
  const end = endTime.split(':').map(Number)
  const start = completed[4] ? completed[4].split(':').map(Number) : end
  return [...completed.slice(0, -1), endTime, end[1] - start[1] + ((end[0] - start[0]) * 60), completed.at(-1)]
}

function adminTable (headers, data, name, col, id) {
  try {
    const index = headers.findIndex(h => h === col.replace(/^A-/,''))
    if (index > -1) {
      data = data.sort((a, b) => {
        const aValue = Number(String(a[index] || '').split(' ')[0].replace(/[:^A]/g, ''))
        const bValue = Number(String(b[index] || '').split(' ')[0].replace(/[:^A]/g, ''))
        if (!isNaN(aValue) && !isNaN(bValue)) return aValue - bValue
        return a[index]?.toLowerCase() > b[index]?.toLowerCase() ? 1 : -1
      })
    }
  } catch (e) {console.error('error sorting table', e)}
  data = [headers, ...(col.slice(0, 2) === 'A-' ? data.reverse() : data)].map(l => l.join('</td><td>')).join("</td></tr><tr><td>")
  return `<div class="adminTable" id="${id}"><h2>${name}</h2><table><tr><td>${data}</td></tr></table></div>`
}

function readOrderFile (id) {
  try {
    return fs.readFileSync(`${path}gen/${id}.csv`).toString().split('\n').map(l => l.split(',').map(c => c.trim()))
  } catch (error) { console.error(`Error reading order file ${id}:`, error) }
}

async function printOrder (id, order, printer = '') {
  try {
    if (id.length > 3) {
      console.log(`${id} is a combo order printing original orders`);
      [id.slice(0, id.length % 3), ...id.slice(id.length % 3).match(/.../g)].forEach(o => {
        printOrder(o.replace(/^(.0)/, ''), readOrderFile(`${o.replace(/^(.0)/, '')}-combo`))
      })
    }
    const picked = ['<tr><th width="90px">qty picked</th><th width="60px">ID</th><th>Item Name</th></tr>']
    const missing = ['<tr><th width="90px">qty missing</th><th width="60px">ID</th><th>Item Name</th></tr>']
    let ttl = Number(order[1][3])
    order.slice(2).forEach(r => {
      const missed = (Number(r[1]) || 0) - (Number(r[2]) || 0)
      if (Number(r[2])) picked.push(`<tr><td>${r[2]}</td><td>${r[3]}</td><td>${r[0]}</td></tr>`)
      if (missed) {
        missing.push(`<tr><td>${missed}</td><td>${r[3]}</td><td>${r[0]}</td></tr>`)
        ttl -= missed
      }
    })
    const pickerId = order[1]?.[2]?.split(':')?.at(-1) || '998'
    let html = `<style>${fs.readFileSync('./www/style-pdf.css').toString()}</style>`
    html += `<h4>${ttl} items, Picked by ${volunteersJson[pickerId]} (# ${pickerId})</h4><table>${picked.join('')}</table>`
    if (missing.length > 1) html += `<h4>${Number(order[1][3]) - ttl} Items not filled from order:</h4><table>${missing.join('')}</table>`
    if (order[1][1]) html += `<h4>Comments for this order:</h4><p>${order[1][1].replaceAll('&#010;', "<br>")}</p>`
    const browser = await launch()
    const page = await browser.newPage()
    await page.setContent(html)
    const pdfPath = `${path}printed/print-${id}-${new Date().toLocaleTimeString().replaceAll(':', '_')}.pdf`
    await page.pdf({
      path: pdfPath,
      displayHeaderFooter: true,
      headerTemplate: `<p style="width: 680px; margin: 8px auto 0;font-size: 22px;"># ${orderIdPrefix}-${id} for ${order[1][0]}</p>`,
      footerTemplate: `<div style="margin: 0 auto 20px; width: 620px;"><p style="font-size: 13px; margin: 3px;"><span class="date"></span> Check the other side of this sheet for more information about your Kemach order<b style="float: right;margin: 0; font-size: 16px;"><span class="pageNumber"></span> of <span class="totalPages"></span><b/></p></div>`,
      format: 'Letter',
      waitForFonts: false,
      printBackground: true,
      margin: { top: '2cm', right: '2.5cm', bottom: '1.8cm', left: '2.5cm' }
    })
    await browser.close()
    if (process.env.SKIP_PRINT !== 'true') await print(pdfPath, printer, ['-o sides=one-sided', '-o fit-to-page'])
    console.log(`Order ${id} printed successfully`)
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
    let prdName, prdQty, prdPicked, slot, side, aisle
    try {
      if (filePath === './' && (!fs.existsSync(`${path}gen/${user}.csv`) || blocked.includes(user))) {
        filePath = './start-index.html'
        if (user) warn = `could not find a record for order #${user} or order is blocked`
        if (query.lastUser) { // lastUser is the last order that was picked
          const order = readOrderFile(query.lastUser)
          const pickerId = order[1]?.[2]?.split(':')?.at(-1) || '998'
          const volunteerIndex = volunteers.findIndex(v => String(v[0]) === pickerId)
          if (volunteerIndex > -1) volunteers[volunteerIndex][8].push(query.lastUser)
          if (typeof comment !== 'undefined' && comment.replace(/[,\n\r]/g, '') !== order[1][1]?.replaceAll("&#44;", '')?.replaceAll(/&#010;/g, '')) {
            order[1][1] = comment && comment.replace(/,/g, '&#44;').replace(/\n/g, '&#010;').replace(/\r/g, '')
            console.info(`comment for order #${query.lastUser}: ${comment}`)
            fs.writeFileSync(`${path}gen/${query.lastUser}.csv`, order.map(l => l.join(',')).join('\n'))
          }
          if (query.print) printOrder(query.lastUser, order)
          const pickIndex = pickLine.findIndex(p => p[1] === query.lastUser)
          if (pickIndex > -1) {
            const completed = pickLine.splice(pickIndex, 1)[0]
            fs.appendFileSync(`${path}completed-orders.csv`, `\n${pickDuration(completed)}`)
            console.log(`moved #${query.lastUser} from picking line to completed orders`)
          } else {
            fs.appendFileSync(`${path}completed-orders.csv`, `\n${pickDuration([ordersJson[query.lastUser],query.lastUser,query.picker,,,'offList'])}`)
            console.error(`could not find order #${query.lastUser} in the picking line`)
          }
        }
        if (query.deleteUser) {
          console.info(`canceling picking of order #${query.deleteUser}`)
          const pickIndex = pickLine.findIndex(p => p[1] === query.deleteUser)
          if (pickIndex > -1) {
            pickLine.splice(pickIndex, 1)
            const order = readOrderFile(query.deleteUser)
            order[1][2] = order[1][2].split(':').slice(0, -1).join(':')
            fs.writeFileSync(`${path}gen/${query.deleteUser}.csv`, order.join('\n'))
          }
        }
      } else if (filePath === './') {
        filePath = './index.html'
        const order = readOrderFile(user)
        var userName = order[1][0]
        let lastItm = Number(query.itm) || 1
        let changed = false
        comment = typeof comment !== 'undefined' ? comment : order[1][1]
        if (query.picker) { //first itm when starting an order
          const picker = `${volunteersJson[query.picker]} (#${query.picker})`
          console.info(`${picker} started picking order #${user}`)
          warn += `THERE ARE A TOTAL OF ${order[1][3]} ITEMS IN THIS ORDER<br>`
          warn += order[1][3] > 50 ? `<script>alert('This is a large order (${order[1][3]} items) use a larger team to pick')</script>` : ''
          changed = true
          if (order[1][2]) {
            order[1][2] += `:${query.picker}`
            const leftOff = order.slice(2).findIndex(r => Number(r[1]) && Number(r[1]) !== Number(r[2]))
            lastItm = leftOff > 1 ? leftOff + 1 : 1
            console.warn(`DUPLICATE: This is pick #${order[1][2].split(':').length + 1} for this order starting from after item ${order[lastItm][0]}`)
          } else {
            order[1][2] = query.picker
          }
          if (pickLine.find(o => o[1].includes(String(user)))) {
            console.error(`order #${user} is already in the picking line`)
          } else {
            pickLine.push([ordersJson[String(user)], user, query.picker, order[1][3], new Date().toTimeString().slice(0, 8), query.aisle])
            fs.writeFileSync(`${path}pickLine.csv`, pickLine.join('\n'))
          }
        }
        if (typeof comment !== 'undefined' && comment.replace(/[,\n\r]/g, '') !== order[1][1]?.replaceAll("&#44;", '')?.replaceAll(/&#010;/g, '')) {
          changed = true
          console.info(`comment for order #${user}: ${comment}`)
          order[1][1] = comment && comment.replace(/,/g, '&#44;').replace(/[\n\r]/g, '&#010;')
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
          itmTotals[lastItm - 1][3] -= -(qty - lstQty)
          const even = Number(order[lastItm][3].replace('A', '')) % 2
          itmTotals[lastItm - 1][(query.aisle * 2) + even + ((query.aisle < 3 || !even) * 2)] -= (qty - lstQty)
        }
        if (changed) {
          fs.writeFileSync(`${path}gen/${user}.csv`, order.map(l => l.join(',')).join('\n'))
          process.env.DEBUG && console.debug(`order #${user} was updated`)
        }
        if (order[1][2].includes(':')) {
          warn += 'THIS ORDER HAS BEEN <small>(at least partially) </small>PICKED<br><small>the quantity received box includes the number already picked last time</small><br>'
        }
        var itm = order.slice(lastItm + 1).findIndex(r => Number(r[1]) || Number(r[2]))
        if (qty === 998) lastItm = order.length - 2
        var done = order.slice(2, lastItm +1).map((r, i) => {
          const ordered = Number(r[1]) || 0
          const got = Number(r[2]) || 0
          const klass = ordered !== got ? ' class="discrepancy"' : ''
          return ordered || got ? `<tr${klass} onclick="window.location='/?user=${user}&itm=${i + 1}';"><td>${r[3]}</td><td>${r[0]}</td><td>${ordered}</td><td>${got}</td></tr>` : ''
        }).filter(Boolean)
        var next
        let headers = '<tr><th width="40px">ID</th><th>Item Name</th><th width="30px">#</th><th width="30px">Got</th></tr>'
        if (query.api) { // api pick
          filePath = './api.html'
        } else if (itm === -1 || lastItm === order.length - 2) { // after all items picked confirmation page
          const pickerId = order[1]?.[2]?.split(':')?.at(-1) || '998'
          var next = `${volunteersJson[pickerId]} (# ${pickerId})`
          itm = order.length - 1
          console.info(`Picker ${next} on confirmation page for order #${user}`)
          warn += done.length ? '' : 'This order has no items to pick'
          done = `<table>${headers}${done.join('')}</table>`
          filePath = './end-index.html'
          fs.writeFileSync(`${path}itmTotals.csv`, itmTotals.join('\n'))
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
      } else if (filePath === './kadmin') {filePath = './admin/index.html'}
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
        let cache = extname === 'html' ? 'no-store' : 'public, max-age=3153600'
        try {
          content = content.toString().replace('WARNN', warn)
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
            cache = 'no-store'
            content = content.replace('ORDERS', rawOrders).replace('VOLUNTEERS', `{${rawVolunteers}}`).replace('PREFIX', orderIdPrefix).replace('BLOCKED', blocked)
          } else if (filePath === './admin/index.html') {
            try {
              if (query.page?.startsWith('alert')) {
                if (query.remove) {
                  delete prodAlerts[query.remove]
                  content += `removed alert for ${query.remove}`
                  console.log('removed alert for', query.remove)
                  fs.writeFileSync(`${path}alerts.json`, JSON.stringify(prodAlerts, null, 2))
                }
                if (query.prodId && query.itmAlert) {
                  prodAlerts[query.prodId] = query.itmAlert
                  content += `added alert for ${query.prodId}`
                  console.log('added alert for', query.prodId)
                  fs.writeFileSync(`${path}alerts.json`, JSON.stringify(prodAlerts, null, 2))
                }
                content += fs.readFileSync('./www/admin/alerts.html').toString()
                content += adminTable(['delete','ID','alert'], Object.entries(prodAlerts).map(a => ['&#10060;', ...a]), '', query.alerts || '', 'alerts')
              } else if (query.page?.startsWith('block')) {
                if (query.block && !blocked.includes(query.block)) {
                  blocked.push(query.block)
                  content += `added ${query.block} to blocked list`
                  console.log('added', query.block, 'to blocked list')
                  fs.writeFileSync(`${path}blocked.txt`, blocked.join(','))
                }
                if (query.unblock && blocked.includes(query.unblock)) {
                  blocked.splice(blocked.indexOf(query.unblock), 1)
                  content += `removed ${query.unblock} from blocked list`
                  console.log('removed', query.unblock, 'from blocked list')
                  fs.writeFileSync(`${path}blocked.txt`, blocked.join(','))
                }
                content += fs.readFileSync('./www/admin/block.html').toString()
                content += adminTable(['unblock','ID'], blocked.map(b => [`<a href="/kadmin?page=block&unblock=${b}">&#10060;</a>`, b]), '', 'ID', 'blocked')
              } else if (query.page?.startsWith('car')) {
                content += adminTable(['name','orderId','picker','qty','start'], pickLine.filter(l => l[5] === '1').map(l => l.slice(0, -1)), 'Row 1:', query.row1 || '', 'row1')
                content += adminTable(['name','orderId','picker','qty','start'], pickLine.filter(l => l[5] === '2').map(l => l.slice(0, -1)), 'Row 2:', query.row2 || '', 'row2')
                content += adminTable(['name','orderId','picker','qty','start'], pickLine.filter(l => l[5] === '3').map(l => l.slice(0, -1)), 'Row 3:', query.row3 || '', 'row3')
              } else if (query.page?.startsWith('order')) {
                const completed = fs.readFileSync(`${path}completed-orders.csv`, 'utf8').split('\n').map(r => r.split(','))
                const unqIds = [...new Set(completed.map(o => o[1]))]
                content += adminTable(completed[0], completed.slice(1), `Picked Orders: ${unqIds.length - 1} of ${totalOrders}`, query.orders || '', 'orders')
                const coming = Object.entries(ordersJson).filter(k => k[0] && ![...blocked, ...unqIds].includes(k[0]))
                content += adminTable(['orderID','name'], coming, `Un-filled Orders: ${coming.length} of ${totalOrders}`, query.waiting || 'orderID', 'waiting')
              } else if (query.page?.startsWith('item')) {
                content += fs.readFileSync('./www/admin/items.html').toString()
                if (query.itmKey && Number(query.qty)) {
                  const split = query.itmKey.split('-')
                  itmTotals[itmsIndex[split[0]]][Number(split[1]) + 4] -= -parseInt(query.qty)
                  content += `changed qty for "${query.itmKey}" by ${query.qty}`
                  console.log(`changed qty for "${query.itmKey}" by ${query.qty}`)
                  fs.writeFileSync(`${path}itmTotals.csv`, itmTotals.join('\n'))
                }
                content += adminTable(itmTotals[0], itmTotals.slice(1).map(p => {
                  const floor = p.slice(4).map((t, i) => {
                    if (i % 2 === p[0].replace('A', '') % 2) {
                      return `${t} <button ${t < 10 ? `class="alert"` : ''} onclick="adjust('${p[0]}', '${i}')">change</button>`
                    }
                  })
                  return [...p.slice(0, 4), ...floor]
                }), 'Totals picked by Item:', query.itms || 'id', 'itms')
              } else if (query.page?.startsWith('volunteer')) {
                if (query.name) {
                  const id = volunteers.length
                  console.log('adding volunteer ', query.name, ' with id ', id)
                  volunteers.push([id, query.name.replace(/,/g, ' '), query.phone, query.email, query.age, query.hasOrder, new Date().toTimeString().slice(0, 5),,[]])
                  rawVolunteers = volunteers.slice(1).map(l => `"${l[0]}": "${l[1]}"`).join(',')
                  volunteersJson = JSON.parse(`{${rawVolunteers}}`)
                  fs.writeFileSync(`${path}volunteers.csv`, volunteers.map(v => [...v.slice(0, 8), `[${v.slice(8).join(',')}]`]).join('\n'))
                  content += `Added volunteer ${query.name} with ID ${id}`
                } else if (query.volId) {
                  content += `Checked out volunteer with ID ${query.volId}`
                  const volunteerIndex = volunteers.findIndex(v => String(v[0]) === query.volId)
                  console.log('checking out volunteer ', query.volId, volunteerIndex)
                  volunteers[volunteerIndex][7] = new Date().toTimeString().slice(0, 5)
                  fs.writeFileSync(`${path}volunteers.csv`, volunteers.map(v => [...v.slice(0, 8), `[${v.slice(8).join(',')}]`]).join('\n'))
                }
                const active = volunteers.slice(2).filter(v => !v[7])
                  .map(v => [...v.slice(0, 7), `<button onclick="checkout('${v[0]}')">Checkout</button>`, v[8].length])
                const inactive = volunteers.slice(2).filter(v => v[7]).map(v => {
                  const start = v[6].split(':').map(Number)
                  const end = v[7].split(':').map(Number)
                  const duration = `${end[0] - (end[1] < start[1] ? 1 : 0) - start[0]}:${String(end[1] + (end[1] < start[1] ? 60 : 0) - start[1]).padStart(2, '0')}`
                  return [...v.slice(0, -1), v.at(-1).length, duration]
                })
                content += fs.readFileSync('./www/admin/volunteers.html').toString()
                content += adminTable(volunteers[0], active, `${active.length} Active Volunteers`, query.active || 'A-ID', 'active')
                content += adminTable([...volunteers[0], 'Time'], inactive, `${inactive.length} Finished Volunteers`, query.done || 'A-ID', 'done')
              } else if (query.page?.startsWith('combo')) {
                if (query.id1 && query.id2) {
                  content += combineOrders(Math.min(query.id1, query.id2).toString(), Math.max(query.id1, query.id2).toString())
                }
                content += fs.readFileSync('./www/admin/combo.html').toString()
              } else if (query.page?.startsWith('print')) {
                content += fs.readFileSync('./www/admin/print.html').toString()
                let orderId = query.printId || query.viewId
                if (orderId) {
                  if (!fs.existsSync(`${path}gen/${orderId}.csv`)) {
                    if (fs.existsSync(`${path}gen/${orderId}-combo.csv`)) {
                      content += `order was moved to a combo order ${orderId}`
                      orderId = `${orderId}-combo`
                    } else {
                      orderId = ''
                      content += `could not find order # ${orderId}`
                    }
                  }
                  if (orderId) {
                    const order = readOrderFile(orderId)
                    if (query.printId) {
                     content += `attempting to print order # ${orderId}`
                     printOrder(orderId, order, query.printer)
                    } else {
                      content += adminTable(['seq', ...order[0]], order.slice(2).map((o, i) => [i + 1, ...o]), `#${orderId} ${order[1][0]}`, query.print || '', 'print')
                    }
                  }
                }
              } else content += fs.readFileSync('./www/admin/menu.html').toString()
            } catch (e) {
              content += `THERE WAS AN ERROR RENDERING ADMIN PAGE ${query.page}<br>` + e.stack.replaceAll('\n', '<br>')
            }
          }
        } catch (err) {
          content += `THERE WAS AN ERROR RENDERING THE PAGE<br>${err.stack.replaceAll('\n', '<br>')}`
        }
        res.writeHead(200, { 'Content-Type': contentType,  'Cache-Control': cache })
        res.end(content, 'utf-8')
      }
    })
  }
})

// Use the local IP obtained from ifconfig
const LOCAL_IP = process.env.LOCAL_IP || Object.values(networkInterfaces()).flat().find(({ family, internal, address }) => family === "IPv4" && !internal && address.startsWith('192.168.')).address
const PORT = 3000 // Choose a port (e.g., 3000)

server.listen(PORT, LOCAL_IP, () => {
  process.env.DEBUG && console.debug('Debugging is enabled')
  console.log(`Server is running. There are ${totalOrders} orders to pick\nAny device on this wifi network can access the application in their browser at:\nhttp://${LOCAL_IP}:${PORT}/`)
})
