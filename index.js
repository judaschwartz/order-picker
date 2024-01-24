function validateForm(event) {
  const qty = Number(document.getElementById('qty').value)
  document.getElementById('qty').value = qty > 0 ? qty : 0
  document.getElementById('comment').value = document.getElementById('comment').value.replace(/,/g, ' ').replace(/[\n\r]/g, '&#010;')
  const excepted = Number(document.getElementById('excepted').innerText)
  if (qty !== excepted) {
    if (!confirm(`They have ${qty} but they ordered ${excepted}, do you still want to continue to the next item?`)) {
      console.log(qty, excepted)
      event.preventDefault()
    }
  }
}
document.addEventListener('DOMContentLoaded', function () {
  const URL = location.href.split("&")
  if (URL.at(-1).split('=')[0] === 'picker') {
    window.history.replaceState(null, '', URL.slice(0, -1).join('&'))
  }
  if (URL.at(-1).split('=')[0] === 'showAll') {
    document.getElementById('showAll').checked = true
  }
})
function increment() {
  const input = document.getElementById('qty')
  input.value = Number(input.value) + 1
}

function decrement() {
  const input = document.getElementById('qty')
  if (input.value > 0) {
    input.value = Number(input.value) - 1
  }
}