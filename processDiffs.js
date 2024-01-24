const fs = require('fs')
const orderIds = Object.keys(JSON.parse(fs.readFileSync('./orders.json').toString()))
const resultsByUser = ['Order #, Picker, Comments, Missing items']
const resultsByItm = {}
let skipped = 0
orderIds.forEach(id => {
  const order = fs.readFileSync(`orders/${id}.csv`).toString().split("\n").map(l => l.split(','))
  const diff = [id, order[1][0], order[2][0]]
  if (order[2].length < 2) {
    skipped++
    diff.push('ORDER WAS NOT PICKED')
  } else {
    order[0].slice(1).forEach((name, i) => {
      const ordered = Number(order[1][i + 1]) || 0
      const picked = Number(order[2][i + 1]) || 0
      if (ordered != picked) {
        diff.push(`${ordered - picked} "${name}"`)
        resultsByItm[name] = resultsByItm[name] ? [...resultsByItm[name], [`${ordered - picked} ${id}`]] : [[`${ordered - picked} ${id}`]]
      }
    })
  }
  resultsByUser.push(diff.join(','))
})
console.log(skipped, ' Orders not filled yet')
fs.writeFileSync('resultsByUser.csv', resultsByUser.join("\n"))
fs.writeFileSync('resultsByItm.csv', Object.entries(resultsByItm).map(a => a.join(',')).join("\n"))
