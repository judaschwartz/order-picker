const fs = require('fs')
const today = new Date().toLocaleDateString().split('/')
const orderIdPrefix = process.env.ORDER_PREFIX || (Number(today[0]) > 6 ? 'S' : 'P') + (today[2].slice(-2))
const path = `orders/${orderIdPrefix}/`
if (!fs.existsSync(`${path}gen`)) {
  fs.mkdirSync(`${path}gen`, { recursive: true })
}
const orders = fs.readFileSync(`${path}allOrders.csv`).toString().split("\n").filter(o => Number(o.split(',').slice(3, -2).join('')))
const names = fs.readFileSync(`${path}nameSlot.csv`).toString().split("\n").slice(1).map(l => l.split(','))
// add test orders
// orders.push(['test2', 'name', ...orders[0].split(',').slice(3, -1).map((n, i) => i),'Yes', '999'].join(','))
// orders.push(['test1','first','wife', ...orders[0].split(',').slice(3, -2).map(n => 1), 'No','998'].join(','))
const jsonFile = {}
const itmTotals = {}
orders.forEach(l => {
  l = l.trim().split(',')
  const name = [l[0], l[1], l[2]].join(' ').toUpperCase().trim()
  jsonFile[l.at(-1)] = name
  let ttl = 0
  const order = l.slice(3, -1).map((n, i) => {
    const qty = parseInt(n) ? parseInt(n) : 0
    if (qty) {
      const itmKey = `${names[i][1]}-${names[i][2]}`
      if (itmTotals[itmKey]) {
        itmTotals[itmKey][0] += qty
        itmTotals[itmKey][2] += qty
      } else {
        itmTotals[itmKey] = [qty, 0, qty]
      }
      ttl += qty
    }
    return [names[i][0], names[i][2]?.trim(), n.toUpperCase(), , names[i][1], names[i][3]?.trim()]
  }).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(l => l.slice(1).join(','))
  if (names[0].length === 3) { // if no produce add another line at end
    order.push(',,,,')
  }
  fs.writeFileSync(`${path}gen/${l.at(-1)}.csv`, ['name,ordered,picked,slot,ss', `${name},,,${ttl},`, ...order].join("\n"))
})
fs.writeFileSync(`${path}orders.json`, JSON.stringify(jsonFile, null, 2))
fs.writeFileSync(`${path}itmTotals.json`, JSON.stringify(itmTotals, null, 2))
console.log(`${orders.length} Orders Created`)
// create unpaid.json file
// const up = fs.readFileSync(`${path}unpaid.csv`).toString().split("\n").map(l => l.split(','))
// unpaid = {}
// up[0].forEach((l, i) => {
//   if (up[1][i] > 2) {
//     unpaid[l] = up[1][i]
//   }
// })

// fs.writeFileSync(`${path}unpaid.json`, JSON.stringify(unpaid, null, 2))
