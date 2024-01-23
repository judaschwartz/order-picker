const fs = require('fs')
const orders = fs.readFileSync('orders/testraw.csv').toString().split("\n")

const jsonFile = {}
orders.slice(1).forEach(l => {
  l = l.split(',')
  jsonFile[l[0]] = l[1].toLocaleUpperCase()
  const ord = [l[1] + orders[0].slice(1), ',' + l.slice(2).join(','), ''].join("\n")
  fs.writeFileSync(`orders/${l[0]}.csv`, ord)
})
fs.writeFileSync('orders.json', JSON.stringify(jsonFile))
