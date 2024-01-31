function validateForm(event) {
  var orders = JSON.parse('ORDERS')
  var user = parseInt(document.getElementById('user').value.trim())
  var last = document.getElementById('last').value.trim().toUpperCase()
  var picker = document.getElementById('picker').value.trim()
  document.getElementById('user').value = user
  document.getElementById('last').value = last
  document.getElementById('picker').value = picker
  if (!user || !last || !picker) {
    alert('Please enter a value for all the fields.');
    event.preventDefault();
    return false;
  }
  if (orders[user] !== last) {
    event.preventDefault()
    if (orders[user]) {
      alert('Order #' + user + ' does not match the name "' + last + '"\n' + 'the correct last name is "' + orders[user] + '"')
    } else {
      alert('Order #' + user + ' is not on our list in orders.json')
    }
  }
}

function getParameterByName(name) {
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(window.location.href);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var picker = getParameterByName('picker').split(':')
document.getElementById('picker').value = picker[picker.length - 1]
