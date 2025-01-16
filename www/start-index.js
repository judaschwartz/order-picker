const url = new URL(location.href)
const params = url.searchParams
const loc = location.href.split("?")
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

document.addEventListener('DOMContentLoaded', function () {
  document.querySelector('#user').addEventListener('change', function () {
    const user = parseInt(this.value.trim())
    if (orders[user]) {
      document.getElementById('name').value = orders[user]
      document.getElementById('picker').focus()
    } else {
      alert('Order #' + user + ' is not in our system')
      document.getElementById('name').value = ''
    }
  })
  document.querySelector('#picker').addEventListener('change', function () {
    const vol = parseInt(this.value.trim())
    if (volunteers[vol]) {
      document.querySelector('#p-name span').innerText = volunteers[vol]
    } else {
      alert('volunteer #' + vol + ' is not registered')
    }
  })
  const pickerId = params.get('picker')?.split('# ')?.at(-1)?.slice(0, -1)
  if (pickerId) {
    document.getElementById('picker').value = pickerId
    document.getElementById('picker').dispatchEvent(new Event('change', { bubbles: true }))
  }
  window.history.replaceState(null, '', loc[0])
})
