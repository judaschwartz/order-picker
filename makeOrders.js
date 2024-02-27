const fs = require('fs')
const orders = fs.readFileSync('orders/allOrders.csv').toString().split("\n")
const jsonFile = {}
const itms = orders[0].trim().split(',').slice(2)
orders.slice(1).forEach(l => {
  l = l.trim().split(',')
  jsonFile[l[0]] = l[1].toLocaleUpperCase()
  const ord = ['name,ordered,picked', `${l[1]},,`, ...itms.map((n, i) => `${n},${l[i + 2]},`)]
  fs.writeFileSync(`orders/${l[0]}.csv`, ord.join("\n"))
})
fs.writeFileSync('orders.json', JSON.stringify(jsonFile))
