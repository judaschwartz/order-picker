const url = new URL(location.href)
const pickerId = url.searchParams.get('picker')
const deleteUser = url.searchParams.get('deleteUser')
window.history.replaceState(null, '', url.pathname)
const orders = JSON.parse(`ORDERS`)
const volunteers = JSON.parse(`VOLUNTEERS`)
function validateForm(event) {
  const user = parseInt(document.getElementById('user').value.trim())
  const name = document.getElementById('name').value.trim().toUpperCase()
  const picker = document.getElementById('picker').value.trim()
  document.getElementById('user').value = user
  document.getElementById('name').value = name
  document.getElementById('picker').value = picker
  if (!user || !name || !picker || !document.querySelector('input[name="side"]:checked')) {
    alert('Please enter a value for all the fields.')
    event.preventDefault()
  } else if (orders[user] !== name) {
    event.preventDefault()
    if (orders[user]) {
      alert('Order #' + user + ' does not match the name "' + name + '"\n' + 'the correct last name is "' + orders[user] + '"')
      document.getElementById('name').focus()
    } else {
      alert('Order #' + user + ' is not on our list in orders.json')
    }
  }
}

window.addEventListener('load', function() {
  document.querySelector('#user').addEventListener('change', function () {
    const user = parseInt(this.value.trim())
    if (orders[user]) {
      document.getElementById('name').value = orders[user]
      document.getElementById('picker').focus()
    } else if (user) {
      alert('Order #' + user + ' is not in our system')
      document.getElementById('name').value = ''
    }
  })
  document.querySelector('#user').insertAdjacentHTML('beforeBegin', '<b>PREFIX-</b>')
  document.querySelector('#picker').addEventListener('change', function () {
    const vol = parseInt(this.value.trim())
    if (volunteers[vol]) document.querySelector('#p-name span').innerText = volunteers[vol]
    else if (vol) alert('volunteer #' + vol + ' is not registered')
  })
  if (pickerId) document.getElementById('picker').value = pickerId
  if (deleteUser) document.querySelector('#user').value = deleteUser
  document.getElementById('picker').dispatchEvent(new Event('change', { bubbles: true }))
  document.querySelector('#user').dispatchEvent(new Event('change', { bubbles: true }))
})
