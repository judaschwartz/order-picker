const fs = require('fs')
const orders = fs.readFileSync('orders/allOrders.csv').toString().split("\n").slice(1)
  .filter(o => Number(o.replace(/,/g, '').match(/\d+/g)?.[1]))
const names = fs.readFileSync('orders/nameSlot.csv').toString().split("\n").slice(1).map(l => l.split(','))
// orders.push(['999', 'test2', ...names.map((n, i) => i)].join(','))
// orders.push(['998', 'test1', ...names.map((n, i) => (!i || i === names.length -1)*1)].join(','))
const jsonFile = {}
orders.forEach(l => {
  l = l.trim().split(',')
  jsonFile[l[0]] = l[1].toLocaleUpperCase().trim()
  let ttl = 0
  const order = l.slice(2)
    .map((n, i) => {
      ttl += parseInt(n) ? parseInt(n) : 0
      return [names[i][0],  names[i][2], n, ,names[i][1], names[i][3]]
    })
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(l => l.slice(1).join(','))
  fs.writeFileSync(`orders/${l[0]}.csv`, ['name,ordered,picked,slot,ss', `${l[1]},,,${ttl},`, ...order].join("\n"))
})
fs.writeFileSync('orders.json', JSON.stringify(jsonFile))
console.log(`${orders.length} Orders Created`)
