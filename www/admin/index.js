const url = new URL(location.href)
let autoRefresh
function toggleRefresh() {
  if (!document.querySelector('#auto-reload input').checked) {
    console.log('Refresh stopped')
    clearInterval(autoRefresh)
  } else {
    window.location.reload()
  }
}
window.addEventListener('load', function() {
  if (!['combo', 'print', 'volunteers', 'alerts', 'block'].includes(url.searchParams.get('page'))) {
    autoRefresh = setInterval(() => {window.location.reload()}, (30 * 1000))
  } else {
    document.querySelector('#auto-reload').style.display = 'none'
  }
  console.log('Refreshed at', new Date().toTimeString().slice(0, 8))
  document.querySelectorAll('.adminTable').forEach(divTable => {
    const divId = divTable.id
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
  ['name', 'phone', 'email', 'printer', 'age', 'hasOrder', 'volId', 'block', 'unblock', 'printId', 'prodId', 'itmAlert', 'itmKey', 'qty', 'remove', 'id1', 'id2'].forEach(param => url.searchParams.delete(param))
  window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString())
})
function page(page) {
  url.searchParams.set('page', page)
  window.location.href = url.href
}
