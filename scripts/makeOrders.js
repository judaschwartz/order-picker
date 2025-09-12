const fs = require('fs')
const today = new Date().toLocaleDateString().split('/')
const orderIdPrefix = process.env.ORDER_PREFIX || (Number(today[0]) > 6 ? 'S' : 'P') + (today[2].slice(-2))
const path = `orders/${orderIdPrefix}/`
if (!fs.existsSync(`${path}gen`)) {
  fs.mkdirSync(`${path}gen`, { recursive: true })
}
if (process.argv[2] === 'fresh' || !fs.existsSync(`${path}completed-orders.csv`)) {
  fs.writeFileSync(`${path}completed-orders.csv`, 'name,orderId,picker,qty,start,end,minutes,aisle')
}
if (process.argv[2] === 'fresh' || !fs.existsSync(`${path}volunteers.csv`)) {
  fs.writeFileSync(`${path}volunteers.csv`, 'ID,Name,Phone,Email,Age,Own,Start,End,[picked]\n998,Admin,,,,,,,[]')
}
if (process.argv[2] === 'fresh' || !fs.existsSync(`${path}pickLine.csv`)) {
  fs.writeFileSync(`${path}pickLine.csv`, 'Name,ID,picker,ttl,Start,Aisle')
}
if (process.argv[2] === 'fresh' || !fs.existsSync(`${path}alerts.json`)) {
  fs.writeFileSync(`${path}alerts.json`, JSON.stringify({}))
}
if (!fs.existsSync(`${path}blocked.txt`)) fs.writeFileSync(`${path}blocked.txt`, '')
const orders = fs.readFileSync(`${path}allOrders.csv`).toString().trim().split("\n").filter(o => Number(o.split(',').slice(3, -2).join('')))
const names = fs.readFileSync(`${path}nameSlot.csv`).toString().split("\n").slice(1).map(n => {
  const row = n.split(',')
// when side slots are added odd are side
  return [row[0], `${row[1]}`, row[2].trim(), ''/* , !(row[1] % 2) ? 'SS' : '', row[3] */]
})

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
  const itms = l.slice(3, -1 + ((orderIdPrefix === 'P') * -1)) // -2 on pesach
  if (orderIdPrefix === 'P') {
    if (l.at(-2).trim() === 'Y') itms.push(4,2,3,4,3,1)
    else itms.push(0,0,0,0,0,0)
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
      const key = `${names[i][1]}-${names[i][2]}`
      if (l.at(-1) !== '998') { // don't count test order
        itmTotals[key] ? itmTotals[key] += qty : itmTotals[key] = qty
      }
      ttl += qty
    }
    return [names[i][0], names[i][2], qty, , names[i][1], names[i][3]]
  }).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(l => l.slice(1).join(','))
  fs.writeFileSync(`${path}gen/${parseInt(l.at(-1))}.csv`, ['name,ordered,picked,slot,ss', `${name},,,${ttl},`, ...order].join("\n"))
})
fs.writeFileSync(`${path}orders.json`, JSON.stringify(jsonFile, null, 2))
// console.log('QTY Sanity Check')
// names.forEach((n) => {
//   const ttl = itmTotals[n[0]]
//   if (ttl && n[4] && Number(n[4]) !== ttl[2]) console.log('totals for ', ttl[1], ' are NOT the same ', n[4], ttl[2])
//     else console.log('totals for ', n[2], ' are the same ', n[4])
// })
// fs.writeFileSync(`${path}itmTotals.csv`, [
//   'id,name,ordered,picked,col5,col4,col3,col2,col1',
//   ...Object.values(itmTotals).map(r => [...r.slice(0, 2), ...r.slice(2).map(v => Math.round(v))])
// ].join('\n'))
fs.writeFileSync(`${path}itmTotals.json`, JSON.stringify(itmTotals, null, 2))
console.log(`${orders.length} Orders Created`)
