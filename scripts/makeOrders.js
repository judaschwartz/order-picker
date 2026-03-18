import fs from 'fs-extra'
const today = new Date().toLocaleDateString().split('/')
const orderIdPrefix = process.env.ORDER_PREFIX || (Number(today[0]) > 6 ? 'S' : 'P') + (today[2].slice(-2))
const path = `orders/${orderIdPrefix}/`
if (!fs.existsSync(`${path}allOrders.csv`) || !fs.existsSync(`${path}nameSlot.csv`)) {
  console.log('Missing allOrders.csv or nameSlot.csv in ', path, ' please add and try again')
  process.exit()
}
if (process.env.WIPE) {
  const oldPath = `${path}old/${new Date().toISOString().replace(/[:.]/g, '-')}/`
  fs.mkdirSync(oldPath, { recursive: true })
  fs.readdirSync(path).forEach(i => i !== 'old' && fs.moveSync(`${path}${i}`, `${oldPath}${i}`))
  fs.copyFileSync(`${oldPath}allOrders.csv`, `${path}allOrders.csv`)
  fs.copyFileSync(`${oldPath}nameSlot.csv`, `${path}nameSlot.csv`)
  fs.writeFileSync(`${path}completed-orders.csv`, 'name,orderId,picker,qty,start,end,minutes,aisle')
  fs.writeFileSync(`${path}volunteers.csv`, 'ID,Name,Phone,Email,Age,Own,Start,End,ttl\n998,Admin,,,,,,,0')
  fs.writeFileSync(`${path}pickLine.csv`, 'Name,ID,picker,ttl,Start,Aisle')
  fs.writeFileSync(`${path}alerts.json`, JSON.stringify({}))
  fs.writeFileSync(`${path}blocked.txt`, '')
  fs.writeFileSync(`${path}combined.txt`, '')
}
if (!fs.existsSync(`${path}old`)) {
  console.log('You must run init-fresh on first attempt')
  process.exit()
}
fs.existsSync(`${path}gen`) && fs.moveSync(`${path}gen`, `${path}/old/gen`, { overwrite: true })
fs.mkdirSync(`${path}gen`, { recursive: true })
const orders = fs.readFileSync(`${path}allOrders.csv`).toString().trim().split("\n").filter(o => Number(o.split(',').slice(3, -2).join('')))
const names = fs.readFileSync(`${path}nameSlot.csv`).toString().split("\n").slice(1).map(n => n.split(',').map(i => i.trim()))

// add test orders
// orders.push(['test2', 'name', ...orders[0].split(',').slice(3, -1).map((n, i) => i),'Yes', '999'].join(','))
// orders.push(['test1','first','wife', ...orders[0].split(',').slice(3, -2).map(n => 1), 'No','998'].join(','))
const jsonFile = {}
const itmTotals = {}
orders.forEach(l => {
  l = l.trim().split(',')
  const name = [l[0], l[1], l[2]].join(' ').toUpperCase().trim().replace(/ +/g, ' ')
  jsonFile[parseInt(l.at(-1))] = name
  let ttl = 0
  const itms = l.slice(3, -1 + ((orderIdPrefix[0] === 'P'|| process.env.PRODUCE === 'true') * -1)) // -2 on pesach
  if (orderIdPrefix[0] === 'P' || process.env.PRODUCE === 'true') {
    if (l.at(-2).trim() === 'Y') itms.push('4', '2', '4', '3', '1') // apple, carrot, onion, orange, potato
    else itms.push(0,0,0,0,0)
  }

  const order = itms.map((n, i) => {
    const qty = parseInt(n) ? parseInt(n) : ''
    if (qty) {
// commented code is for 3 lane csv for itmTotals
      // const third = qty * .333
      // if (itmTotals[names[i][0]]) {
      //   itmTotals[names[i][0]][2] += qty
      //   if (names[i][3]) {
      //     itmTotals[names[i][0]][4] += third
      //     itmTotals[names[i][0]][6] += third
      //     itmTotals[names[i][0]][8] += third
      //   } else {
      //     itmTotals[names[i][0]][5] += third * 2
      //     itmTotals[names[i][0]][7] += third
      //   }
      // } else {
      //   if (names[i][3]) {
      //     itmTotals[names[i][0]] = [names[i][1], names[i][2], qty, 0, third, 0, third, 0, third]
      //   } else {
      //     itmTotals[names[i][0]] = [names[i][1], names[i][2], qty, 0, 0, third, 0, third * 2, 0]
      //   }
      // }
      const key = `A${names[i][1]}-${names[i][2]}`
      if (Number(l.at(-1)) < 990) { // don't count test order items
        if (itmTotals[key]) {
          itmTotals[key] += qty
        } else {
          itmTotals[key] = qty
        }
      }
      ttl += qty
    }
    return [names[i][0], names[i][2], qty, , 'A' + names[i][1],]
  }).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(l => l.slice(1).join(','))
  fs.writeFileSync(`${path}gen/${parseInt(l.at(-1))}.csv`, ['name,ordered,picked,slot,ss', `${name},,,${ttl},`, ...order].join("\n"))
})
fs.writeFileSync(`${path}orders.json`, JSON.stringify(jsonFile, null, 2))
console.log('QTY Sanity Check')
names.forEach((n) => {
  const key = `A${n[1]}-${n[2]}`
  const ttl = itmTotals[key]
  if (ttl && n[3] && Number(n[3]) !== ttl) console.log('totals for', n[2], 'are NOT the same', n[3], ttl)
    else if (n[3] && ttl) console.log('totals for', n[2], 'are the same', n[3])
    else console.log('no totals for', key)
})
// fs.writeFileSync(`${path}itmTotals.csv`, [
//   'id,name,ordered,picked,col5,col4,col3,col2,col1',
//   ...Object.values(itmTotals).map(r => [...r.slice(0, 2), ...r.slice(2).map(v => Math.round(v))])
// ].join('\n'))
fs.writeFileSync(`${path}itmTotals.json`, JSON.stringify(itmTotals, null, 2))
console.log(`${orders.length} Orders Created`)
if (process.env.WIPE) console.log(`WIPE MODE ENABLED - ALL DATA IN ORDERS ${orderIdPrefix} FOLDER WAS DELETED`)
