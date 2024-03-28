const fs = require('fs')
const orders = fs.readFileSync('orders/allOrders.csv').toString().split("\n")
const names = fs.readFileSync('orders/nameSlot.csv').toString().split("\n").slice(1).map(l => l.split(','))
const jsonFile = {}
orders.slice(1).forEach(l => {
  l = l.trim().split(',')
  jsonFile[l[0]] = l[1].toLocaleUpperCase()
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
