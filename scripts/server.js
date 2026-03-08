const { createServer } = require('http')
const fs = require('fs')
const { parse } = require('url')
const { networkInterfaces } = require('os')
const { launch } = require('puppeteer')
const { print } = require("unix-print")

const soulName = `<p style="width: 600px; text-align: center; margin: 8px auto 0;font-size: 14px;">Kemach this year is dedicated L'ilui Nishmas<br>ר' יחזקאל בן ר' יחיאל אריה הכהן<br>ישראל מרדכי בן ר' יצחק</p>`
const today = new Date().toLocaleDateString().split('/')
const orderIdPrefix = process.env.ORDER_PREFIX || (Number(today[0]) > 6 ? 'S' : 'P') + (today[2].slice(-2))
const path = `orders/${orderIdPrefix}/`
if (!fs.existsSync(`${path}orders.json`)) {
  return console.log('orders.json file not found you need to execute the "npm run init" command to create the orders')
}
if (!fs.existsSync(`${path}printed`)) fs.mkdirSync(`${path}printed`)
const blocked = fs.readFileSync(`${path}blocked.txt`).toString().split(',').filter(Boolean)
const combined = fs.readFileSync(`${path}combined.txt`).toString().split(',').filter(Boolean)
const pickLine = fs.readFileSync(`${path}pickLine.csv`).toString().split('\n').map(l => l.split(','))
const prodAlerts = JSON.parse(fs.readFileSync(`${path}alerts.json`).toString())
// commented code is for 3 lane csv for itmTotals
// const itmTotals = fs.existsSync(`${path}itmTotals.csv`) ? fs.readFileSync(`${path}itmTotals.csv`).toString().split('\n').map(l => l.split(',')) : []
// const itmsIndex = JSON.parse(`{${itmTotals.map((l, i) => `"${l[0]}": "${i}"`).join(',')}}`)
let rawOrders = fs.readFileSync(`${path}orders.json`).toString()
const ordersJson = JSON.parse(rawOrders)
const itmsJson = JSON.parse(fs.readFileSync(`${path}itmTotals.json`).toString())
const startTotals = JSON.parse(fs.readFileSync(`${path}itmTotals.json`).toString())
let numOrders = Object.keys(ordersJson).length - blocked.length - combined.length
let numPicked = 0
const volunteers = fs.readFileSync(`${path}volunteers.csv`).toString().split('\n').map(l => l.split(','))

let rawVolunteers = volunteers.slice(1).map(l => `"${l[0]}": "${l[1]}"`).join(',')
let volunteersJson = JSON.parse(`{${rawVolunteers}}`)

const volDbPath = './orders/volunteer-db.csv'
if (!fs.existsSync(volDbPath)) fs.writeFileSync(volDbPath, 'Name,Phone,Email,Age\n')
let masterVolunteers = fs.readFileSync(volDbPath, 'utf8').split('\n').filter(Boolean).map(l => l.split(',')).slice(1)

function addToMasterDb(name, phone, email, age) {
  if (name && !masterVolunteers.find(v => v[0].toLowerCase() === name.toLowerCase())) {
    const row = [name, phone, email, age].join(',')
    fs.appendFileSync(volDbPath, row + '\n')
    masterVolunteers.push([name, phone, email, age])
  }
}

function combineOrders (id1, id2) {
  try {
    if (blocked.includes(id1) || blocked.includes(id2)) return `one of the orders ${id1} or ${id2} is blocked`
    if (combined.includes(id1) || combined.includes(id2)) return `one of the orders ${id1} or ${id2} is already combined`
    const ord1 = readOrderFile(id1)
    const ord2 = readOrderFile(id2) 
    if (!ord1 || !ord2) return console.error('could not find orders to combine')
    const newOrder = ord1.slice(2).map((l, i) => {
      const ordered = (Number(l[1]) || 0) + (Number(ord2[i + 2]?.[1]) || 0)
      const picked = (Number(l[2]) || 0) + (Number(ord2[i + 2]?.[2]) || 0)
      // for produce when not in warehouse
      // if (l[1]  === 'YES' || ord2[i + 2]?.[1] === 'YES') return [l[0], 'YES', , l[3], l[4]]
      return [l[0], ordered, picked, l[3], l[4]]
    })
    const ttl = Number(ord1[1][3]) + Number(ord2[1][3])
    const name = `${ord1[1][0]} & ${ord2[1][0]}`.trim()
    const comboId = id1 + id2.padStart(3 * Math.ceil(id2.length / 3), '0')
    fs.writeFileSync(`${path}gen/${comboId}.csv`, [ord1[0], [name,,,ttl,], ...newOrder].map(l => l.join(',')).join("\n"))
    ordersJson[comboId] = name
    rawOrders = JSON.stringify(ordersJson, null, 2)
    combined.push(id1, id2)
    numOrders--
    fs.writeFileSync(`${path}combined.txt`, combined.join(','))
    fs.writeFileSync(`${path}orders.json`, rawOrders)
    fs.renameSync(`${path}gen/${id1}.csv`, `${path}gen/${id1}-combo.csv`)
    fs.renameSync(`${path}gen/${id2}.csv`, `${path}gen/${id2}-combo.csv`)
    console.log(`combined orders ${id1} and ${id2} new order ID is ${comboId}`)
    return `combined orders ${id1} and ${id2} new order ID is ${comboId}`
  } catch (error) {
    console.error('error combining orders', error)
    return `error combining orders ${error}`
  }
}

function pickDuration (completed) {
  const endTime = new Date().toTimeString().slice(0, 8)
  const end = endTime.split(':').map(Number)
  const start = completed[4] ? completed[4].split(':').map(Number) : end
  return [...completed.slice(0, -1), endTime, end[1] - start[1] + ((end[0] - start[0]) * 60), completed.at(-1)]
}

function adminTableOld (headers, data, name, col, id) {
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
  return `<div class="adminTable" id="${id}"><h2>${name}</h2><i>collapse</i><table><tr><td>${data}</td></tr></table></div>`
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

  const isEmpty = data.length === 0;
  let tableContent = '';
  if (isEmpty) {
    tableContent = `<div style="padding: 40px 20px; text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center;">
      <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="64" height="64" style="margin-bottom: 12px; opacity: 0.6;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
      <span style="font-weight: 500; font-size: 16px;">No records found</span>
    </div>`;
  } else {
    const headerHtml = `<tr><th>${headers.join('</th><th>')}</th></tr>`;
    const dataHtml = (col.slice(0, 2) === 'A-' ? [...data].reverse() : data)
      .map(row => `<tr>${row.map((cell, i) => `<td data-label="${headers[i]}">${cell}</td>`).join('')}</tr>`).join("");

    tableContent = `
      <div class="table-search-container">
        <input type="text" class="table-search" placeholder="Search this table..." onkeyup="filterTable(this, '${id}')">
      </div>
      <table id="table-${id}">${headerHtml}${dataHtml}</table>
    `;
  }

  return `<div class="adminTable table-container" id="${id}">
    <div class="table-header">
      <h2>${name}</h2>
      <i class="collapse-btn">collapse</i>
    </div>
    <div class="table-wrapper">
      ${tableContent}
    </div>
  </div>`
}
function readOrderFile (id) {
  try {
    return fs.readFileSync(`${path}gen/${id}.csv`).toString().split('\n').map(l => l.split(',').map(c => c.trim()))
  } catch (error) { console.error(`Error reading order file ${id}:`, error) }
}

async function printOrder (id, order, printer = '') {
  try {
    let isCombo = false
    if (id.length > 3) {
      isCombo = true
      console.log(`${id} is a combo order printing original orders`);
      [id.slice(0, id.length % 3), ...id.slice(id.length % 3).match(/.../g)].forEach(o => {
        if (o) printOrder(o.replace(/^(0*)/, ''), readOrderFile(`${o.replace(/^(0*)/, '')}-combo`), printer)
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
    const pickerId = order[1]?.[2]?.split(':')?.at(-1)?.split('-')?.[0] || '998'
    let html = `<style>${fs.readFileSync('./www/style-pdf.css').toString()}</style>`
    html += `<h4>${ttl} items, Picked by ${volunteersJson[pickerId]} (# ${pickerId})</h4><table>${picked.join('')}</table>`
    if (isCombo) html += `<p>This order was picked as a combo, you must count to confirm all items were received BEFORE splitting the order apart</p>`
    if (missing.length > 1) html += `<h4>${Number(order[1][3]) - ttl} Items not filled from order:</h4><table>${missing.join('')}</table>`
    if (order[1][1]) html += `<h4>Comments for this order:</h4><p>${order[1][1].replaceAll('&#010;', "<br>")}</p>`
    const browser = await launch()
    const page = await browser.newPage()
    await page.setContent(html)
    const pdfPath = `${path}printed/print-${id}-${new Date().toLocaleTimeString().replaceAll(':', '_')}.pdf`
    await page.pdf({
      path: pdfPath,
      displayHeaderFooter: true,
      headerTemplate: `<p style="width: 650px; padding-left: 30px; margin: 8px auto;font-size: 20px;"># ${orderIdPrefix}-${id} for ${order[1][0]}</p>${soulName}`,
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
          const pickerIds = order[1]?.[2]?.split(':')?.at(-1)?.split('-') || ['998']
          pickerIds.forEach(pickerId => {
            const volInd = volunteers.findIndex(v => String(v[0]) === pickerId)
            if (volInd > -1 && !volunteers[volInd].slice(8)?.includes(query.lastUser)) volunteers[volInd].push(query.lastUser)
          })
          if (typeof comment !== 'undefined' && comment.replace(/[,\n\r]/g, '') !== order[1][1]?.replaceAll("&#44;", '')?.replaceAll(/&#010;/g, '')) {
            order[1][1] = comment && comment.replace(/,/g, '&#44;').replace(/\n/g, '&#010;').replace(/\r/g, '')
            console.info(`comment for order #${query.lastUser}: ${comment}`)
            fs.writeFileSync(`${path}gen/${query.lastUser}.csv`, order.map(l => l.join(',')).join('\n'))
          }
          if (query.print) printOrder(query.lastUser, order)
          const pickIndex = pickLine.findIndex(p => p[1] === query.lastUser)
          if (pickIndex > -1) {
            const completed = pickLine.splice(pickIndex, 1)[0]
            const allCompleted = fs.readFileSync(`${path}completed-orders.csv`, 'utf8')
            numPicked = [...new Set(allCompleted.split('\n').map(o => o.split(',')[1]))].length + 1
            fs.writeFileSync(`${path}completed-orders.csv`, `${allCompleted}\n${pickDuration(completed)}`)
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
          const pickerName = volunteersJson[query.picker] || 'Unknown Volunteer'
          const picker = `${pickerName} (#${query.picker})`
          console.info(`${picker} started picking order #${user}`)
          warn += `THERE ARE A TOTAL OF ${order[1][3]} ITEMS IN THIS ORDER<br>`
          warn += order[1][3] > 50 ? `<script>customAlert('This is a large order (${order[1][3]} items) use a larger team to pick', 'danger')</script>` : ''
          changed = true
          const assist = query.assist ? `,${query.assist}`.replaceAll(',', '-') : ''
          if (order[1][2]) {
            order[1][2] += `:${query.picker}${assist}`
            const leftOff = order.slice(2).findIndex(r => Number(r[1]) && Number(r[1]) !== Number(r[2]))
            lastItm = leftOff > -1 ? leftOff + 1 : 1
            console.warn(`DUPLICATE: This is pick #${order[1][2].split(':').length + 1} for this order starting from after item ${order[lastItm][0]}`)
          } else {
            order[1][2] = query.picker + assist
          }
          if (pickLine.find(o => o[1].includes(String(user)))) {
            console.error(`order #${user} is already in the picking line`)
          } else {
            pickLine.push([ordersJson[String(user)], user, query.picker, order[1][3], new Date().toTimeString().slice(0, 8), query.aisle || '3'])
            fs.writeFileSync(`${path}pickLine.csv`, pickLine.join('\n'))
          }
        }
        if (typeof comment !== 'undefined' && comment.replace(/[,\n\r]/g, '') !== order[1][1]?.replaceAll("&#44;", '')?.replaceAll(/&#010;/g, '')) {
          changed = true
          console.info(`comment for order #${user}: ${comment}`)
          order[1][1] = comment && comment.replace(/,/g, '&#44;').replace(/[\n\r]/g, '&#010;')
        }
        const qty = parseInt(query.qty || 0)
        const lstQty = parseInt(order[lastItm]?.[2] || 0)
        if (query.qty !== undefined && lastItm > 1 && qty !== lstQty && qty !== 998) {
          changed = true
          process.env.DEBUG && console.debug(`picked ${qty} ${order[lastItm][0]} for order #${user}`)
          if (parseInt(order[lastItm][1] || 0) !== qty && !query.api) {
            console.warn(`DEVIATION: picked ${qty} ${order[lastItm][0]} for order #${user} but they ordered ${parseInt(order[lastItm][1] || 0)}`)
          }
          order[lastItm][2] = qty
          itmsJson[`${order[lastItm][3]}-${order[lastItm][0]}`] -= (qty - lstQty)
//  commented code is for 3 lane csv for itmTotals
//  itmTotals[lastItm - 1][3] -= -(qty - lstQty)
//  const even = Number(order[lastItm][3].replace('A', '')) % 2
//  itmTotals[lastItm - 1][(query.aisle * 2) + even + ((query.aisle < 3 || !even) * 2)] -= (qty - lstQty)
        }
        if (changed) {
          fs.writeFileSync(`${path}gen/${user}.csv`, order.map(l => l.join(',')).join('\n'))
          process.env.DEBUG && console.debug(`order #${user} was updated`)
        }
        if (order[1][2].includes(':')) {
          warn += 'THIS ORDER HAS BEEN <small>(at least partially) </small>PICKED<br><small>the quantity received box includes the number already picked last time</small><br>'
        }
        var itm = order.slice(lastItm + 1).findIndex(r => Number(r[1]) || Number(r[2]))
        if (qty === 998) {
          lastItm = order.length - 1
          itm = -1
        }
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
        } else if (itm === -1 || lastItm === order.length - 1) { // after all items picked confirmation page
          const pickers = order[1]?.[2]?.split(':')?.at(-1)?.split('-')
          next = `${pickers?.reduce((acc, id) => acc + (volunteersJson[id] || '') + ', ', '')} (# ${pickers?.join(',')})`
          itm = order.length - 1
          console.info(`Picker ${next} on confirmation page for order #${user}`)
          warn += done.length ? '' : 'This order has no items to pick'
          done = `<table>${headers}${done.join('')}</table>`
          filePath = './end-index.html'
          fs.writeFileSync(`${path}itmTotals.json`, JSON.stringify(itmsJson, null, 2))
        } else {
          done = `<table>${headers}${done.reverse().join('')}</table>`
          itm = itm + lastItm + 1
          warn += prodAlerts['POP ' + order[itm][3]] ? `<script>customAlert('${ prodAlerts['POP ' + order[itm][3]]}', 'danger')</script>` : ''
          next = order.slice(itm + 1).map((r, i) => {
            const pick = (Number(r[1]) || 0) - (Number(r[2]) || 0)
            return Number(r[1]) ? `<tr data-itm="${i+itm+1}" data-n="${r[1]}"><td>${r[3]}</td><td>${r[0]}</td><td>${pick}</td></tr>` : ''
          }).filter(Boolean)
          headers = '<tr><th width="40px">ID</th><th>Item Name</th><th width="30px">Needed</th></tr>'
          next = `<table>${headers}${next.join('')}</table>`
        }
        slot = order[itm]?.[3] || ''
        prdName = order[itm][0] + (prodAlerts[slot] ? `<i>${prodAlerts[slot]}</i>` : '')
        side = order[itm][4] ? 'side' : ''
        prdQty = order[itm][1] || '0'
        prdPicked = order[itm][2] !== '0' ? order[itm][2] : ''
      } else if (filePath === './kadmin') {filePath = './admin/index.html'
      } else if (filePath === './kadmin-old') {filePath = './admin-old/index.html'
      } else if (filePath === './signup' || filePath === './new') {filePath = './signup.html'
      } else if (filePath === './api/signup') {
        addToMasterDb(query.name, query.phone, query.email, query.age)
        
        const id = volunteers.length + 8
        console.log('API sign up: adding volunteer ', query.name, ' with id ', id)
        volunteers.push([id, (query.name || '').replace(/,/g, ' '), query.phone || '', query.email || '', query.age || '', 'No', new Date().toTimeString().slice(0, 5),,])
        rawVolunteers = volunteers.slice(1).map(l => `"${l[0]}": "${l[1]}"`).join(',')
        volunteersJson = JSON.parse(`{${rawVolunteers}}`)
        fs.writeFileSync(`${path}volunteers.csv`, volunteers.join('\n'))
        
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        return res.end(String(id))
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
        let cache = extname === 'html' ? 'no-store' : 'public, max-age=3153600'
        try {
          if (warn) {
            content = content.toString().replace('WARNN', warn)
          } else {
            content = content.toString().replace('<div class="inline-warn">WARNN</div>', '')
          }
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
            const checkedOutIds = volunteers.slice(2).filter(v => v[7]).map(v => String(v[0]))
            content = content.replace('ORDERS', rawOrders).replace('VOLUNTEERS', `{${rawVolunteers}}`).replace('PREFIX', orderIdPrefix).replace('BLOCKED', blocked).replace('CHECKED_OUT_VOLS', JSON.stringify(checkedOutIds) || '[]')
          } else if (filePath === './admin-old/index.html') {
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
                content += fs.readFileSync('./www/admin-old/alerts.html').toString()
                content += adminTableOld(['delete','ID','alert'], Object.entries(prodAlerts).map(a => ['&#10060;', ...a]), '', query.alerts || '', 'alerts')
              } else if (query.page?.startsWith('block')) {
                if (query.block) {
                  const comboInd = combined.indexOf(query.block)
                  if (comboInd > -1) {
                    content += `order ${query.block} is already combined in ${combined[comboInd]}${combined[comboInd + 1]} and cannot be blocked`
                  } else if (blocked.includes(query.block)) {
                    content += `order ${query.block} is already blocked`
                  } else {
                    blocked.push(query.block)
                    numOrders--
                    content += `added ${query.block} to blocked list`
                    console.log('added', query.block, 'to blocked list')
                    fs.writeFileSync(`${path}blocked.txt`, blocked.join(','))
                  }
                }
                if (query.unblock && blocked.includes(query.unblock)) {
                  blocked.splice(blocked.indexOf(query.unblock), 1)
                  numOrders++
                  content += `removed ${query.unblock} from blocked list`
                  console.log('removed', query.unblock, 'from blocked list')
                  fs.writeFileSync(`${path}blocked.txt`, blocked.join(','))
                } else if (query.separate && combined.includes(query.separate)) {
                  const id1 = query.separate
                  const comboInd = combined.indexOf(id1)
                  const id2 = combined[comboInd + 1]
                  const comboId = combined.splice(comboInd, 2).join('')
                  delete ordersJson[comboId]
                  rawOrders = JSON.stringify(ordersJson, null, 2)
                  numOrders++
                  fs.writeFileSync(`${path}combined.txt`, combined.join(','))
                  fs.writeFileSync(`${path}orders.json`, rawOrders)
                  fs.renameSync(`${path}gen/${comboId}.csv`,  `${path}gen/${comboId}-separated.csv`)
                  fs.renameSync(`${path}gen/${id1}-combo.csv`, `${path}gen/${id1}.csv`)
                  fs.renameSync(`${path}gen/${id2}-combo.csv`, `${path}gen/${id2}.csv`)
                  content += `Separated ${comboId} back into ${id1} and ${id2}`
                }
                content += fs.readFileSync('./www/admin-old/block.html').toString()
                content += adminTableOld(['Unblock','ID'], blocked.map(b => [`<a href="/kadmin-old?page=block&unblock=${b}">&#10060;</a>`, b]), 'Blocked', 'ID', 'blocked')
                content += adminTableOld(['Separate', 'ID1', 'ID2', 'ID'], combined.map((b, i) => {
                  if (i % 2 === 0) {
                    return [
                      `<a href="/kadmin-old?page=block&separate=${b}">&#10060;</a>`,
                      b,
                      combined[i + 1],
                      b + combined[i + 1]
                    ]
                  }
                }).filter(Boolean), 'Combined', query.combined || 'ID', 'combined')
              } else if (query.page?.startsWith('combo')) {
                if (query.id1 && query.id2) {
                  content += combineOrders(Math.min(query.id1, query.id2).toString(), Math.max(query.id1, query.id2).toString())
                }
                content += fs.readFileSync('./www/admin-old/combo.html').toString()
                content += adminTableOld(['ID1', 'ID2', 'ID'], combined.map((b, i) => {
                  if (i % 2 === 0) {
                    return [
// only allow separating on block page `<a href="/kadmin-old?page=block&separate=${b}">&#10060;</a>`,
                      b,
                      combined[i + 1],
                      b + combined[i + 1]
                    ]
                  }
                }).filter(Boolean), 'Combined', query.combined || 'ID', 'combined')
              } else if (query.page?.startsWith('count')) {
                const bb = pickLine.length - 1
                content = fs.readFileSync('./www/admin-old/countdown.html').toString().replace('AA', numPicked).replace('BB', bb).replace('CC', numOrders - numPicked - bb)
              } else if (query.page?.startsWith('item')) {
                content += adminTableOld(['id','name', 'qtyOrdered','qtyPicked', 'qtyLeft'], Object.entries(itmsJson).map(i => [
                  ...i[0].split('-'),
                  startTotals[i[0]],
                  startTotals[i[0]] - i[1],
                  i[1]
                ]), 'Totals by Item:', query.itms || 'id', 'itms')
              } else if (query.page?.startsWith('order')) {
                const completed = fs.readFileSync(`${path}completed-orders.csv`, 'utf8').split('\n').map(r => r.split(','))
                const unqIds = [...new Set(completed.map(o => o[1]))]
                content += adminTableOld(completed[0], completed.slice(1), `Picked Orders: ${unqIds.length - 1} of ${numOrders}`, query.orders || 'A-end', 'orders')
                content += adminTableOld(['name','orderId','picker','qty','start','row'], pickLine.slice(1), `In Progress: ${pickLine.length - 1}`, query.progress || 'start', 'progress')
                const coming = Object.entries(ordersJson).filter(k => k[0] && ![...blocked, ...unqIds, ...combined, ...pickLine.map(o => o[1])].includes(k[0]))
                content += adminTableOld(['orderID','name'], coming, `Un-filled Orders: ${coming.length} of ${numOrders}`, query.waiting || 'orderID', 'waiting')
              } else if (query.page?.startsWith('print')) {
                content += fs.readFileSync('./www/admin-old/print.html').toString()
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
                      content += adminTableOld(['seq', ...order[0]], order.slice(2).filter(o => o[1] || o[2]).map((o, i) => [i + 1, ...o]), `#${orderId} ${order[1][0]}, (${order[1][3]} items)`, query.print || '', 'print')
                    }
                  }
                }
              } else if (query.page?.startsWith('volunteer')) {
                if (query.name) {
                  const id = volunteers.length + 8
                  console.log('adding volunteer ', query.name, ' with id ', id)
                  volunteers.push([id, query.name.replace(/,/g, ' '), query.phone, query.email, query.age, query.hasOrder, new Date().toTimeString().slice(0, 5),,])
                  rawVolunteers = volunteers.slice(1).map(l => `"${l[0]}": "${l[1]}"`).join(',')
                  volunteersJson = JSON.parse(`{${rawVolunteers}}`)
                  fs.writeFileSync(`${path}volunteers.csv`, volunteers.join('\n'))
                  content += `Added volunteer ${query.name} with ID ${id}`
                } else if (query.volId) {
                  content += `Checked out volunteer with ID ${query.volId}`
                  const volunteerIndex = volunteers.findIndex(v => String(v[0]) === query.volId)
                  console.log('checking out volunteer ', query.volId, volunteerIndex)
                  volunteers[volunteerIndex][7] = new Date().toTimeString().slice(0, 5)
                  fs.writeFileSync(`${path}volunteers.csv`, volunteers.join('\n'))
                }
                const active = volunteers.slice(2).filter(v => !v[7])
                  .map(v => [...v.slice(0, 7), `<button onclick="checkout('${v[0]}')">Checkout</button>`, v.length - 8])
                const inactive = volunteers.slice(2).filter(v => v[7]).map(v => {
                  const start = v[6].split(':').map(Number)
                  const end = v[7].split(':').map(Number)
                  const duration = `${end[0] - (end[1] < start[1] ? 1 : 0) - start[0]}:${String(end[1] + (end[1] < start[1] ? 60 : 0) - start[1]).padStart(2, '0')}`
                  return [...v.slice(0, 8), v.length - 8, duration]
                })
                content += fs.readFileSync('./www/admin-old/volunteers.html').toString()
                content += adminTableOld(volunteers[0], active, `${active.length} Active Volunteers`, query.active || 'A-ID', 'active')
                content += adminTableOld([...volunteers[0], 'Time'], inactive, `${inactive.length} Finished Volunteers`, query.done || 'A-ID', 'done')
              } else content += fs.readFileSync('./www/admin-old/menu.html').toString()
            } catch (e) {
              content += `THERE WAS AN ERROR RENDERING ADMIN PAGE ${query.page}<br>` + e.stack.replaceAll('\n', '<br>')
            }
          } else if (filePath === './admin/index.html') {
            content += '<div class="container" style="margin-top: 30px;">'
            try {
              if (query.page?.startsWith('alert')) {                if (query.remove) {
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
              } else if (query.page?.startsWith('analytic')) {
                const completed = fs.readFileSync(`${path}completed-orders.csv`, 'utf8').split('\n').filter(Boolean).map(r => r.split(','))
                const volStats = {}
                completed.slice(1).forEach(row => {
                  if (!row[1]) return
                  const pickerStr = row[2] || ''
                  const qty = Number(row[3]) || 0
                  const duration = Number(row[6]) || 0
                  const pickerIds = pickerStr.split(':').map(p => p.split('-')[0]).filter(Boolean)
                  pickerIds.forEach(pid => {
                    if (!volStats[pid]) volStats[pid] = { orders: 0, items: 0, totalTime: 0 }
                    volStats[pid].orders += 1
                    volStats[pid].items += qty
                    volStats[pid].totalTime += duration
                  })
                })
                
                const maxItems = Math.max(...Object.values(volStats).map(s => s.items), 1);
                const formatTime = (mins) => {
                  const h = Math.floor(mins / 60);
                  const m = Math.floor(mins % 60);
                  return h > 0 ? `${h}h ${m}m` : `${m}m`;
                };

                const analyticsData = Object.entries(volStats).map(([pid, stats]) => {
                  const volName = volunteersJson[pid] || `Unknown (#${pid})`
                  const avgTimePerOrder = stats.orders ? (stats.totalTime / stats.orders) : 0
                  const itemsPerMin = stats.totalTime ? (stats.items / stats.totalTime).toFixed(1) : stats.items
                  const itemsBar = `${stats.items} <div class="progress-bar-container"><div class="progress-bar-fill" style="width: ${(stats.items / maxItems) * 100}%"></div></div>`;
                  return [pid, volName, stats.orders, itemsBar, formatTime(stats.totalTime), formatTime(avgTimePerOrder) + '/ord', itemsPerMin + ' itm/min', `<button class="btn-secondary" onclick="alert('Detailed analytics for ${volName} coming soon!')">View Details</button>`]
                })
                const uniqueOrders = new Set(completed.slice(1).map(r => r[1]))
                const trueTotalOrders = uniqueOrders.size
                const trueTotalItems = completed.slice(1).reduce((acc, row) => acc + (Number(row[3]) || 0), 0)
                const trueTotalTime = completed.slice(1).reduce((acc, row) => acc + (Number(row[6]) || 0), 0)
                
                content += `
                <div class="stats-cards">
                  <div class="stat-card">
                    <div class="stat-title">Total Orders Picked</div>
                    <div class="stat-value">${trueTotalOrders}</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-title">Total Items Picked</div>
                    <div class="stat-value">${trueTotalItems}</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-title">Avg Time / Order</div>
                    <div class="stat-value">${trueTotalOrders ? formatTime(trueTotalTime / trueTotalOrders) : '0m'} <span class="stat-total"></span></div>
                  </div>
                </div>`
                content += adminTable(['ID', 'Volunteer', 'Orders Picked', 'Items Picked', 'Total Time', 'Avg Time/Order', 'Items/Minute', 'Actions'], analyticsData, 'Volunteer Performance', query.analytics || 'A-Items Picked', 'analytics')
              } else if (query.page?.startsWith('block')) {
                if (query.block) {
                  const comboInd = combined.indexOf(query.block)
                  if (comboInd > -1) {
                    content += `<div class="toast error">Order ${query.block} is already combined in ${combined[comboInd]}${combined[comboInd + 1]} and cannot be blocked</div>`
                  } else if (blocked.includes(query.block)) {
                    content += `<div class="toast info">Order ${query.block} is already blocked</div>`
                  } else {
                    blocked.push(query.block)
                    numOrders--
                    content += `<div class="toast success">Added order ${query.block} to blocked list</div>`
                    console.log('added', query.block, 'to blocked list')
                    fs.writeFileSync(`${path}blocked.txt`, blocked.join(','))
                  }
                }
                if (query.unblock && blocked.includes(query.unblock)) {
                  blocked.splice(blocked.indexOf(query.unblock), 1)
                  numOrders++
                  content += `<div class="toast success">Removed order ${query.unblock} from blocked list</div>`
                  console.log('removed', query.unblock, 'from blocked list')
                  fs.writeFileSync(`${path}blocked.txt`, blocked.join(','))
                } else if (query.separate && combined.includes(query.separate)) {
                  const id1 = query.separate
                  const comboInd = combined.indexOf(id1)
                  const id2 = combined[comboInd + 1]
                  const comboId = combined.splice(comboInd, 2).join('')
                  delete ordersJson[comboId]
                  rawOrders = JSON.stringify(ordersJson, null, 2)
                  numOrders++
                  fs.writeFileSync(`${path}combined.txt`, combined.join(','))
                  fs.writeFileSync(`${path}orders.json`, rawOrders)
                  fs.renameSync(`${path}gen/${comboId}.csv`,  `${path}gen/${comboId}-separated.csv`)
                  fs.renameSync(`${path}gen/${id1}-combo.csv`, `${path}gen/${id1}.csv`)
                  fs.renameSync(`${path}gen/${id2}-combo.csv`, `${path}gen/${id2}.csv`)
                  content += `<div class="toast success">Separated combo ${comboId} back into orders ${id1} and ${id2}</div>`
                }
                content += fs.readFileSync('./www/admin/block.html').toString()
                content += adminTable(['unblock','ID'], blocked.map(b => [`<span style="cursor: pointer; color: var(--danger); font-size: 18px;" title="Unblock ${b}" onclick="customConfirm('Are you sure you want to unblock order ${b}?', () => window.location.href='/kadmin?page=block&unblock=${b}')">🗑️</span>`, b]), 'Blocked', 'ID', 'blocked')
                content += adminTable(['Separate', 'ID1', 'ID2', 'ID'], combined.map((b, i) => {
                  if (i % 2 === 0) {
                    return [
                      `<span style="cursor: pointer; color: var(--danger); font-size: 18px;" title="Separate Combo ${b}${combined[i + 1]}" onclick="customConfirm('Are you sure you want to permanently split combo order ${b}${combined[i + 1]}?', () => window.location.href='/kadmin?page=block&separate=${b}')">🗑️</span>`,
                      b,
                      combined[i + 1],
                      b + combined[i + 1]
                    ]
                  }
                }).filter(Boolean), 'Combined', query.combined || 'ID', 'combined')              } else if (query.page?.startsWith('combo')) {
                if (query.id1 && query.id2) {
                  content += combineOrders(Math.min(query.id1, query.id2).toString(), Math.max(query.id1, query.id2).toString())
                }
                content += fs.readFileSync('./www/admin/combo.html').toString()
                content += adminTable(['ID1', 'ID2', 'ID'], combined.map((b, i) => {
                  if (i % 2 === 0) {
                    return [
// only allow separating on block page `<a href="/kadmin?page=block&separate=${b}">&#10060;</a>`,
                      b,
                      combined[i + 1],
                      b + combined[i + 1]
                    ]
                  }
                }).filter(Boolean), 'Combined', query.combined || 'ID', 'combined')
              } else if (query.page?.startsWith('count')) {
                const bb = pickLine.length - 1
                content = fs.readFileSync('./www/admin/countdown.html').toString().replace('AA', numPicked).replace('BB', bb).replace('CC', numOrders - numPicked - bb)
              } else if (query.page?.startsWith('item')) {
//   commented code is for 3 lane csv for itmTotals
// content += fs.readFileSync('./www/admin/items.html').toString()
// if (query.itmKey && Number(query.qty)) {
//   const split = query.itmKey.split('-')
//   itmTotals[itmsIndex[split[0]]][Number(split[1]) + 4] -= -parseInt(query.qty)
//   content += `changed qty for "${query.itmKey}" by ${query.qty}`
//   console.log(`changed qty for "${query.itmKey}" by ${query.qty}`)
//   fs.writeFileSync(`${path}itmTotals.csv`, itmTotals.join('\n'))
// }
// content += adminTable(itmTotals[0], itmTotals.slice(1).map(p => {
//   const floor = p.slice(4).map((t, i) => {
//     if (i % 2 === p[0].replace('A', '') % 2) {
//       return `${t} <button ${t < 10 ? `class="alert"` : ''} onclick="adjust('${p[0]}', '${i}')">change</button>`
//     }
//   })
//   return [...p.slice(0, 4), ...floor]
// }), 'Totals picked by Item:', query.itms || 'id', 'itms')
                content += adminTable(['id','name', 'qtyOrdered','qtyPicked', 'qtyLeft'], Object.entries(itmsJson).map(i => [
                  ...i[0].split('-'),
                  startTotals[i[0]],
                  startTotals[i[0]] - i[1],
                  i[1]
                ]), 'Totals by Item:', query.itms || 'id', 'itms')
              } else if (query.page?.startsWith('order')) {
                const completed = fs.readFileSync(`${path}completed-orders.csv`, 'utf8').split('\n').map(r => r.split(','))
                const unqIds = [...new Set(completed.map(o => o[1]))]
                const coming = Object.entries(ordersJson).filter(k => k[0] && ![...blocked, ...unqIds, ...combined, ...pickLine.map(o => o[1])].includes(k[0]))
                
                content += `
                <div class="stats-cards">
                  <div class="stat-card">
                    <div class="stat-title">Picked</div>
                    <div class="stat-value">${unqIds.length - 1} <span class="stat-total">/ ${numOrders}</span></div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-title">In Progress</div>
                    <div class="stat-value">${pickLine.length - 1}</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-title">Un-filled</div>
                    <div class="stat-value">${coming.length}</div>
                  </div>
                </div>`

                content += adminTable(['name','orderId','picker','qty','start','row'], pickLine.slice(1), `<span class="status-badge progress">In Progress</span>`, query.progress || 'start', 'progress')
                content += adminTable(completed[0], completed.slice(1), `<span class="status-badge picked">Picked Orders</span>`, query.orders || 'A-end', 'orders')
                content += adminTable(['orderID','name'], coming, `<span class="status-badge waiting">Un-filled Orders</span>`, query.waiting || 'orderID', 'waiting')
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
                      content += adminTable(['seq', ...order[0]], order.slice(2).filter(o => o[1] || o[2]).map((o, i) => [i + 1, ...o]), `#${orderId} ${order[1][0]}, (${order[1][3]} items)`, query.print || '', 'print')
                    }
                  }
                }
              } else if (query.page?.startsWith('add-vol')) {
                const htmlAddVolTemplate = fs.readFileSync('./www/admin/add-vol.html').toString()
                content += htmlAddVolTemplate.replace('MASTER_VOLUNTEERS', JSON.stringify(masterVolunteers))
              } else if (query.page?.startsWith('volunteer')) {
                if (query.name) {
                  const id = volunteers.length + 8
                  console.log('adding volunteer ', query.name, ' with id ', id)
                  volunteers.push([id, query.name.replace(/,/g, ' '), query.phone, query.email, query.age, query.hasOrder, new Date().toTimeString().slice(0, 5),,])
                  rawVolunteers = volunteers.slice(1).map(l => `"${l[0]}": "${l[1]}"`).join(',')
                  volunteersJson = JSON.parse(`{${rawVolunteers}}`)
                  fs.writeFileSync(`${path}volunteers.csv`, volunteers.join('\n'))
                  addToMasterDb(query.name, query.phone, query.email, query.age)
                  content += `<div class="toast success">Added volunteer ${query.name} with ID ${id}</div>`
                } else if (query.volId) {
                  content += `<div class="toast">Checked out volunteer with ID ${query.volId}</div>`
                  const volunteerIndex = volunteers.findIndex(v => String(v[0]) === query.volId)
                  console.log('checking out volunteer ', query.volId, volunteerIndex)
                  volunteers[volunteerIndex][7] = new Date().toTimeString().slice(0, 5)
                  fs.writeFileSync(`${path}volunteers.csv`, volunteers.join('\n'))
                } else if (query.checkinId) {
                  content += `<div class="toast success">Checked in volunteer with ID ${query.checkinId}</div>`
                  const volunteerIndex = volunteers.findIndex(v => String(v[0]) === query.checkinId)
                  console.log('checking in volunteer ', query.checkinId, volunteerIndex)
                  if (volunteerIndex > -1) {
                    volunteers[volunteerIndex][7] = ''
                    fs.writeFileSync(`${path}volunteers.csv`, volunteers.join('\n'))
                  }
                } else if (query.editVolId) {
                  content += `<div class="toast success">Updated volunteer ${query.editName}</div>`
                  const volunteerIndex = volunteers.findIndex(v => String(v[0]) === query.editVolId)
                  if (volunteerIndex > -1) {
                    volunteers[volunteerIndex][1] = query.editName.replace(/,/g, ' ')
                    volunteers[volunteerIndex][2] = query.editPhone.replace(/\D/g, '')
                    volunteers[volunteerIndex][3] = query.editEmail.trim().toLowerCase()
                    volunteers[volunteerIndex][4] = query.editAge
                    volunteers[volunteerIndex][5] = query.editHasOrder
                    fs.writeFileSync(`${path}volunteers.csv`, volunteers.join('\n'))
                    addToMasterDb(query.editName, query.editPhone, query.editEmail, query.editAge)
                    rawVolunteers = volunteers.slice(1).map(l => `"${l[0]}": "${l[1]}"`).join(',')
                    volunteersJson = JSON.parse(`{${rawVolunteers}}`)
                  }
                }
                
                const active = volunteers.slice(2).filter(v => !v[7])
                  .map(v => [
                    v[0], v[1] + (v[5] === 'Yes' ? ' 📦' : ''),
                    `<div class="vol-actions"><button onclick="viewVol('${v[0]}', '${(v[1]||'').replace(/'/g,"\\'")}', '${v[2]}', '${v[3]}', '${v[4]}', '${v[5]}')">View</button><button class="danger-btn" onclick="checkout('${v[0]}')">Checkout</button></div>`
                  ])
                const inactive = volunteers.slice(2).filter(v => v[7]).map(v => {
                  return [
                    v[0], v[1] + (v[5] === 'Yes' ? ' 📦' : ''),
                    `<div class="vol-actions"><button onclick="viewVol('${v[0]}', '${(v[1]||'').replace(/'/g,"\\'")}', '${v[2]}', '${v[3]}', '${v[4]}', '${v[5]}')">View</button><button class="checkin-btn" onclick="checkin('${v[0]}')">Check In</button></div>`
                  ]
                })
                
                const htmlVolTemplate = fs.readFileSync('./www/admin/volunteers.html').toString()
                content += htmlVolTemplate.replace('MASTER_VOLUNTEERS', JSON.stringify(masterVolunteers))
                const headers = ['ID', 'Name', 'Actions']
                content += adminTable(headers, active, `${active.length} Active Volunteers`, query.active || 'A-ID', 'active')
                content += adminTable(headers, inactive, `${inactive.length} Finished Volunteers`, query.done || 'A-ID', 'done')
              }
              } catch (e) {
              content += `THERE WAS AN ERROR RENDERING ADMIN PAGE ${query.page}<br>` + e.stack.replaceAll('\n', '<br>')            }
          } else if (filePath === './api.html' && query.api === 'orders') {
            content += rawOrders
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
  console.log(`Server is running. There are ${numOrders} orders to pick\nAny device on this wifi network can access the application in their browser at:\nhttp://${LOCAL_IP}:${PORT}/`)
})
