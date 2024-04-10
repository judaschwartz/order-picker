function validateForm(event) {
  var orders = JSON.parse('ORDERS')
  var user = parseInt(document.getElementById('user').value.trim())
  var last = document.getElementById('last').value.trim().toUpperCase()
  var picker = document.getElementById('picker').value.trim()
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

function getParameterByName(name) {
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)")
  var results = regex.exec(window.location.href)
  if (!results || !results[2]) return ''
  return decodeURIComponent(results[2].trim())
}

var picker = getParameterByName('picker').split(':')
if (picker.length) {
  document.getElementById('picker').value = picker[picker.length - 1]
}
