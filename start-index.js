function validateForm(event) {
  const orders = JSON.parse(`ORDERS`)
  const user = document.getElementById('user').value
  const last = document.getElementById('last').value.toLocaleUpperCase()
  if (orders[user] !== last) {
    event.preventDefault()
    alert(`Order #${user} does not match the name "${last}"
    the correct last name is "${orders[user]}"`)
  }
}
let params = (new URL(document.location)).searchParams
document.getElementById('picker').value = params.get('picker')
