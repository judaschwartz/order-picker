function validateForm(event) {
  const orders = JSON.parse(`ORDERS`)
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
    } else {
      alert('Order #' + user + ' is not on our list in orders.json')
    }
  }
}

function getParameterByName(paramString, name) {
  const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)")
  const results = regex.exec(window.location.href)
  return decodeURIComponent(results[2].trim())
}

document.addEventListener('DOMContentLoaded', function () {
  const URL = location.href.split("?")
  if (URL.length > 1) {
    const params = URL[1].split('&').map(p => p.split('='))
    let picker = decodeURIComponent(params.find(p => p[0] === 'picker')[1]).split(':').at(-1).replace(/\+/g, ' ').split('|')
    if (picker !== 'undefined' &&
      confirm(`Order is complete!\nPlease bring this tablet back to front desk.\n\nPress CANCEL if the same team (${picker.join(' & ')}) will not be picking the next order`)) {
      document.getElementById('picker').value = picker[0] || ''
      document.getElementById('assistant').value = picker[1] || ''
      document.getElementById('assistant2').value = picker[2] || ''
    }
  }
  window.history.replaceState(null, '', URL[0])
})
