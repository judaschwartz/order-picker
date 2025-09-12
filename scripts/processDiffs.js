const fs = require('fs')
const today = new Date().toLocaleDateString().split('/')
const orderIdPrefix = process.env.ORDER_PREFIX || (Number(today[0]) > 6 ? 'S' : 'P') + (today[2].slice(-2))
const path = `orders/${orderIdPrefix}/`
const orderIds = Object.keys(JSON.parse(fs.readFileSync(`./${path}/orders.json`).toString()))
const volunteers = fs.readFileSync(`${path}volunteers.csv`).toString().split('\n').map(l => {
  const row = l.replace(/[\[\]"]/g, '').split(',')
  return [...row.slice(0, 8), [...row.slice(8).filter(Boolean)]]
})
let volunteersJson = JSON.parse(`{${volunteers.slice(1).map(l => `"${l[0]}": "${l[1]}"`).join(',')}}`)
const resultsByUser = ['Order #, Picker, Comments, Missing items']
const resultsByItm = {}
let skipped = []
orderIds.forEach(id => {
  const diff = [id]
  if (fs.existsSync(`./${path}/gen/${id}.csv`)) {
    const order = fs.readFileSync(`./${path}/gen/${id}.csv`).toString().split("\n").map(l => l.split(','))
    if (order.filter(i => i[2]).length < 3) {
      skipped.push(order[1][0] + ' - ' + id)
      diff.push(order[1][2], order[1][1], 'ORDER WAS NOT PICKED')
    } else {
      diff.push(order[1][2].split(':').map(p => p.split('-').map(v => `${v} (${volunteersJson[v]})`).join(' & ')).join(' | '), order[1][1])
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
fs.writeFileSync(`${path}resultsByUser.csv`, resultsByUser.join("\n"))
fs.writeFileSync(`${path}resultsByItm.csv`, Object.entries(resultsByItm).map(a => a.join(',')).join("\n"))
