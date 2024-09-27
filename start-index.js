const loc = location.href.split("?")
const orders = JSON.parse(`ORDERS`)
function validateForm(event) {
  const user = parseInt(document.getElementById('user').value.trim())
  const last = document.getElementById('last').value.trim().toUpperCase()
  const picker = document.getElementById('picker').value.trim()
  document.getElementById('user').value = user
  document.getElementById('last').value = last
  document.getElementById('picker').value = picker
  if (!user || !last || !picker || !document.querySelector('input[name="side"]:checked')) {
    alert('Please enter a value for all the fields.')
    event.preventDefault()
  } else if (orders[user] !== last) {
    event.preventDefault()
    if (orders[user]) {
      alert('Order #' + user + ' does not match the name "' + last + '"\n' + 'the correct last name is "' + orders[user] + '"')
      document.getElementById('last').focus()
    } else {
      alert('Order #' + user + ' is not on our list in orders.json')
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  if (loc?.[1]?.includes('picker')) {
    alert('Order is complete!\nPlease bring this tablet back to front table')
    // const params = loc[1].split('&').map(p => p.split('='))
    // let picker = decodeURIComponent(params.find(p => p[0] === 'picker')[1]).split(':').at(-1).replace(/\+/g, ' ').split('|')
    // if (confirm(`Order is complete!\nPlease bring this tablet back to front desk.\n\nPress CANCEL if the same team (${picker.join(' & ')}) will not be picking the next order`)) {
    //   document.getElementById('picker').value = picker[0] || ''
    //   document.getElementById('assistant').value = picker[1] || ''
    //   document.getElementById('assistant2').value = picker[2] || ''
    // }
  }
  window.history.replaceState(null, '', loc[0])
})

document.querySelector('#user').addEventListener('change', function () {
  const user = parseInt(this.value.trim())
  if (orders[user]) {
    document.getElementById('last').value = orders[user]
    document.getElementById('picker').focus()
  } else {
    alert('Order #' + user + ' is not on our list in orders.json')
  }
})
