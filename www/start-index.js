const url = new URL(location.href)
const deleteUser = Number(url.searchParams.get('deleteUser'))
const pickerId = Number(url.searchParams.get('picker')) 
window.history.replaceState(null, '', url.pathname)
const orders = JSON.parse(`ORDERS`)
const blocked = `BLOCKED`.split(',').map(Number)
const volunteers = JSON.parse(`VOLUNTEERS`)
function validateForm(event) {
  const user = parseInt(document.getElementById('user').value.trim())
  const name = document.getElementById('name').value.trim().toUpperCase()
  const picker = document.getElementById('picker').value.trim()
  document.getElementById('user').value = user
  document.getElementById('name').value = name
  document.getElementById('picker').value = picker
  if (!user || !name || !picker || !document.querySelector('input[name="aisle"]:checked')) {
    alert('Please enter a value for all the fields.')
    event.preventDefault()
  } else if (user && blocked.includes(user)) {
    alert('This order # is blocked. Please ask driver to pull to side and wait for management to unblock this order.')
    event.preventDefault()
  }
}

window.addEventListener('load', function() {
  setTimeout(() => {document.getElementById('start-page').innerHTML = `<p>Timed out</p><a href="/?deleteUser=${document.querySelector('#user').value}&picker=${document.querySelector('#picker').value}">Back to START an order</a>`}, 90000)
  document.querySelector('#user').addEventListener('change', function () {
    const user = parseInt(this.value.trim())
    if (orders[user]) {
      document.getElementById('name').value = orders[user]
      document.getElementById('picker').focus()
    } else if (user) {
      document.getElementById('name').value = ''
      document.getElementById('user').focus()
    }
    if (user && blocked.includes(user)) {
      alert('This order # is blocked. Please ask driver to pull to side and wait for management to speak to them.')
    }
  })
  document.querySelector('#user').insertAdjacentHTML('beforeBegin', '<b>PREFIX-</b>')
  document.querySelector('#picker').addEventListener('change', function () {
    const vol = parseInt(this.value.trim())
    if (volunteers[vol]) {
      document.querySelector('#p-name span').innerText = volunteers[vol]
    } else if (vol) {
      alert('volunteer #' + vol + ' is not registered')
      document.querySelector('#p-name span').innerText = ''
    }
  })
  if (pickerId) {
    document.querySelector('#picker').value = pickerId
    document.querySelector('#picker').dispatchEvent(new Event('change', { bubbles: true }))
  }
  if (deleteUser) {
    document.querySelector('#user').value = deleteUser
    document.querySelector('#user').dispatchEvent(new Event('change', { bubbles: true }))
  }
})
