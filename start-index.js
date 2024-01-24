function validateForm(event) {
  const orders = JSON.parse(`ORDERS`)
  const user = document.getElementById('user').value
  const last = document.getElementById('last').value.toLocaleUpperCase()
  if (orders[user] !== last) {
    event.preventDefault()
    if (orders[user]) {
      alert(`Order #${user} does not match the name "${last}"
      the correct last name is "${orders[user]}"`)
    } else {
      alert(`Order #${user} is not on our list in orders.json`)
    }
  }
}
let params = (new URL(document.location)).searchParams
document.getElementById('picker').value = params.get('picker')
