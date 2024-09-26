const fs = require('fs')
const orders = fs.readFileSync('orders/allOrders.csv').toString().split("\n").slice(1)
  .filter(o => Number(o.replace(/,/g, '').match(/\d+/g)?.[1]))
const names = fs.readFileSync('orders/nameSlot.csv').toString().split("\n").slice(1).map(l => l.split(','))
// orders.push(['999', 'test2', ...names.map((n, i) => i)].join(','))
// orders.push(['998', 'test1', ...names.map((n, i) => (!i || i === names.length -1)*1)].join(','))
const jsonFile = {}
orders.forEach(l => {
  l = l.trim().split(',')
  const name = [l[1], l[2]].join(' ').toLocaleUpperCase().trim()
  jsonFile[l[0]] = name
  let ttl = 0
  const order = l.slice(3).map((n, i) => {
    ttl += parseInt(n) ? parseInt(n) : 0
    return [names[i][0], names[i][2]?.trim(), n.toUpperCase(), , names[i][1], names[i][3]?.trim()]
  }).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(l => l.slice(1).join(','))
  if (names[0].length === 3) { // if no produce add another line at end
    order.push(',,,,')
  }
  fs.writeFileSync(`orders/gen/${l[0]}.csv`, ['name,ordered,picked,slot,ss', `${name},,,${ttl},`, ...order].join("\n"))
})
fs.writeFileSync('orders/orders.json', JSON.stringify(jsonFile, null, 2))
console.log(`${orders.length} Orders Created`)
