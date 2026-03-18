const url = new URL(location.href)
let autoRefresh
const rows =[]
function toggleRefresh() {
  if (!document.querySelector('#auto-reload input').checked) {
    console.log('Refresh stopped')
    clearInterval(autoRefresh)
  } else {
    window.location.reload()
  }
}
window.addEventListener('load', function() {
  if (['combo', 'print', 'vol', 'alert', 'block'].some(p => url.searchParams.get('page')?.startsWith(p))) {
    document.querySelector('#auto-reload').style.display = 'none'
  } else {
    autoRefresh = setInterval(() => {window.location.reload()}, (60 * 1000))
  }
  console.log('Refreshed at', new Date().toTimeString().slice(0, 8))
  document.querySelectorAll('.adminTable').forEach(divTable => {
    const divId = divTable.id
    if (url.searchParams.get(`hide${divId}`)) {
      divTable.querySelector(`#${divId} table`).style.display = 'none'
    }
    divTable.querySelector('i').addEventListener('click', () => {
      const table = document.querySelector(`#${divId} table`)
      if (table.style.display === 'none') {
        table.style.display = 'table'
        url.searchParams.delete(`hide${divId}`)
      } else {
        table.style.display = 'none'
        url.searchParams.set(`hide${divId}`, '1')
      }
      window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString())
    })
    divTable.querySelectorAll("tbody tr:first-child td").forEach(cell => {
      cell.addEventListener("click", (event) => {
        const cellText = event.target.textContent
        const url = new URL(window.location)
        if (url.searchParams.get(divId) === cellText) {
          url.searchParams.set(divId, `A-${cellText}`)
        } else {
          url.searchParams.set(divId, cellText)
        }
        window.location.href = url.href
      })
    })
  });
  ['name', 'phone', 'email', 'printer', 'age', 'hasOrder', 'volId', 'block', 'unblock', 'separate', 'printId', 'prodId', 'itmAlert', 'itmKey', 'qty', 'remove', 'id1', 'id2'].forEach(param => url.searchParams.delete(param))
  window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString())
  document.querySelectorAll('.adminTable table').forEach(t => t.querySelectorAll('tr').forEach((r, i) => i && rows.push(r)))
})
function page(page) {
  url.searchParams.set('page', page)
  window.location.href = url.href
}
function updateTables(value) {
  document.querySelector('#auto-reload input').checked = false || clearInterval(autoRefresh)
  rows.forEach(t => {
    let text = t.innerText.toUpperCase().replaceAll("\t", ' ')
    value.length < 4 && (text = text.replace(/\b\d{10}\b/g, ''))
    t.style.display = text.includes(value) ? 'table-row' : 'none'
  })
}
