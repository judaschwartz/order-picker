const url = new URL(location.href)
const deleteUser = Number(url.searchParams.get('deleteUser'))
const pickerId = Number(url.searchParams.get('picker')) 
const assists = url.searchParams.get('assist')
window.history.replaceState(null, '', url.pathname)
const orders = JSON.parse(`ORDERS`)
const blocked = `BLOCKED`.split(',').map(Number)
const volunteers = JSON.parse(`VOLUNTEERS`)
function validateForm(event) {
  const user = parseInt(document.getElementById('user').value.trim())
  const name = document.getElementById('name').value.trim().toUpperCase()
  document.getElementById('user').value = user
  document.getElementById('name').value = name
  if (!user || !orders[user]) {
    alert('Invalid order ID.')
    refreshPage()
    event.preventDefault()
  } else if (user && blocked.includes(user)) {
    alert('This order # is blocked. Please ask driver to pull to side and wait for management to unblock this order.')
    event.preventDefault()
  } else {
    document.getElementById('assist-box').insertAdjacentHTML('beforeEnd', `<input type="hidden" name="assist" value="${[...document.querySelectorAll('.assist')].map(i => i.value).filter(Boolean).join(',')}">`)
    document.querySelectorAll('.assist').forEach(e => e.parentElement.remove())
  }
}
function addAssist() {
  const html = `<div><b onclick="this.parentElement.remove();">X</b><input onchange="this.nextElementSibling.innerText = volunteers[this.value] || 'Not registered';" type="number" class="assist" value=""><span></span></div>`
  document.getElementById('assist-box').insertAdjacentHTML('beforeEnd', html)
}
function refreshPage() {
  const assist = [...document.querySelectorAll('.assist')].map(i => i.value).filter(Boolean).join(',')
  const refreshUrl = `/?deleteUser=${document.querySelector('#user').value}&picker=${document.querySelector('#picker').value}&assist=${assist}"`
  document.getElementById('start-page').innerHTML = `<p>Timed out</p><a href="${refreshUrl}">Back to START an order</a>`
}
window.addEventListener('load', function() {
  setTimeout(() => refreshPage(), 90000)
  document.querySelector('#user').addEventListener('change', function () {
    const user = parseInt(this.value.trim())
    if (orders[user]) {
      document.getElementById('name').value = orders[user]
      document.getElementById('name').style.color = 'unset'
      document.getElementById('name').style.background = 'unset'
      document.getElementById('picker').focus()
    } else if (user) {
      document.getElementById('name').value = 'NO ORDER FOR THAT ID'
      document.getElementById('name').style.color = 'red'
      document.getElementById('name').style.background = '#e8ffc9'
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
      document.querySelector('#p-name span').style.color = 'unset'
    } else if (vol) {
      document.querySelector('#p-name span').innerText = 'volunteer is not registered'
      document.querySelector('#p-name span').style.color = 'red'
    }
  })
  if (pickerId) {
    document.querySelector('#picker').value = pickerId
    document.querySelector('#picker').dispatchEvent(new Event('change', { bubbles: true }))
  }
  if (assists) {
    assists.split(',').forEach((assist, index) => {
      addAssist()
      const assistInput = document.querySelectorAll('.assist')[index]
      assistInput.value = assist
      assistInput.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }
  if (deleteUser) {
    document.querySelector('#user').value = deleteUser
    document.querySelector('#user').dispatchEvent(new Event('change', { bubbles: true }))
  }
})
