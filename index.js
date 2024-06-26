function validateForm(event) {
  var qty = parseInt(document.getElementById('qty').value || 0)
  document.getElementById('qty').value = qty

  document.getElementById('comment').value = document.getElementById('comment').value.replace(/,/g, ' ').replace(/[\n\r]/g, '&#010;')
  var excepted = parseInt(document.getElementById('excepted').innerText || 0)
  if (qty !== excepted) {
    if (!confirm('Received ' + qty + ' but they ordered ' + excepted + '.\nPress OK if you still want to continue to the next item.')) {
      event.preventDefault()
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  var URL = location.href.split("&")
  if (URL[URL.length - 2].split('=')[0] === 'picker') {
    window.history.replaceState(null, '', URL.slice(0, -2).join('&'))
  }
  if (URL[URL.length - 1].split('=')[0] === 'showAll') {
    document.getElementById('showAll').checked = true
  }
})
function increment() {
  var input = document.getElementById('qty')
  input.value = parseInt(input.value || 0) + 1
}

function decrement() {
  var input = document.getElementById('qty')
  if (input.value > 0) {
    input.value = parseInt(input.value || 0) - 1
  }
}
