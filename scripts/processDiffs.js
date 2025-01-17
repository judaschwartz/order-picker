const fs = require('fs')
const orderIds = Object.keys(JSON.parse(fs.readFileSync('./orders/orders.json').toString()))
const resultsByUser = ['Order #, Picker, Comments, Missing items']
const resultsByItm = {}
let skipped = []
orderIds.forEach(id => {
  const diff = [id]
  if (fs.existsSync(`orders/gen/${id}.csv`)) {
    const order = fs.readFileSync(`orders/gen/${id}.csv`).toString().split("\n").map(l => l.split(','))
    if (order.filter(i => i[2]).length < 3) {
      skipped.push(order[1][0] + ' - ' + id)
      diff.push(order[1][2], order[1][1], 'ORDER WAS NOT PICKED')
    } else {
      diff.push(order[1][2], order[1][1])
      order.slice(2).forEach((r, i) => {
        const ordered = Number(r[1]) || 0
        const picked = Number(r[2]) || 0
        const name = r[0]
        if (ordered != picked) {
          diff.push(`${ordered - picked} ${name} (${r[3]})`)
          resultsByItm[name] = resultsByItm[name] ? [...resultsByItm[name], [`${ordered - picked} ${id}`]] : [[`${r[3]}`, `${ordered - picked} ${id}`]]
        }
      })
    }
  } else {
    diff.push('', '', 'Order record does not exist')
  }
  resultsByUser.push(diff.join(','))
})
console.log(skipped, skipped.length, ' Orders not filled yet')
fs.writeFileSync('orders/resultsByUser.csv', resultsByUser.join("\n"))
fs.writeFileSync('orders/resultsByItm.csv', Object.entries(resultsByItm).map(a => a.join(',')).join("\n"))
