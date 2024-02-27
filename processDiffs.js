const fs = require('fs')
const orderIds = Object.keys(JSON.parse(fs.readFileSync('./orders.json').toString()))
const resultsByUser = ['Order #, Picker, Comments, Missing items']
const resultsByItm = {}
let skipped = 0
orderIds.forEach(id => {
  const diff = [id]
  if (fs.existsSync(`orders/${id}.csv`)) {
    const order = fs.readFileSync(`orders/${id}.csv`).toString().split("\n").map(l => l.split(','))
    if (order[2].length < 2) {
      skipped++
      diff.push(order[1][0], order[2][0], 'ORDER WAS NOT PICKED')
    } else {
      order[0].slice(1).forEach((name, i) => {
        const ordered = Number(order[1][i + 1]) || 0
        const picked = Number(order[2][i + 1]) || 0
        if (ordered != picked) {
          diff.push(order[1][0], order[2][0], `${ordered - picked} "${name}"`)
          resultsByItm[name] = resultsByItm[name] ? [...resultsByItm[name], [`${ordered - picked} ${id}`]] : [[`${ordered - picked} ${id}`]]
        }
      })
    }
  } else {
    diff.push('', '', 'Order record does not exist')
  }
  resultsByUser.push(diff.join(','))
})
console.log(skipped, ' Orders not filled yet')
fs.writeFileSync('resultsByUser.csv', resultsByUser.join("\n"))
fs.writeFileSync('resultsByItm.csv', Object.entries(resultsByItm).map(a => a.join(',')).join("\n"))
