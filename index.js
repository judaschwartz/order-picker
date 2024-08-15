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
  if (URL.some(f => f.includes('picker'))) {
    window.history.replaceState(null, '', URL.slice(0, -2).join('&'))
  }
  if (URL.some(f => f.includes('showAll'))) {
    document.getElementById('showAll').checked = true
  }
  const user = URL.find(u => u.includes('user'))?.split('=')?.[1]
  document.querySelectorAll('.next tr').forEach(tr => {
    tr.onclick = () => pickAhead(tr, user)
  })
})
function increment(input = document.getElementById('qty')) {
  input.value = parseInt(input.value || 0) + 1
  input.dispatchEvent(new Event('change', { 'bubbles': true }))
}

function decrement(input = document.getElementById('qty')) {
  if (input.value > 0) {
    input.value = parseInt(input.value || 0) - 1
    input.dispatchEvent(new Event('change', { 'bubbles': true }))
  }
}

function pickAhead(tr, user) {
  if (tr.nextElementSibling?.classList?.contains('qty-box')) {
    tr.nextElementSibling.remove()
  } else {
    document.querySelectorAll(".next .qty-box").forEach(e => e.remove())
    const box = document.createElement('div')
    const minusButton = document.createElement('button')
    minusButton.textContent = '-'
    box.appendChild(minusButton)
    const numberDisplay = document.createElement('input')
    numberDisplay.type = 'number'
    numberDisplay.value = Number(tr.getAttribute('data-n')) - Number(tr.querySelector('td:last-child').innerText)
    box.appendChild(numberDisplay)
    const plusButton = document.createElement('button')
    plusButton.textContent = '+'
    box.appendChild(plusButton)
    plusButton.onclick = () => increment(numberDisplay)
    minusButton.onclick = () => decrement(numberDisplay)
    numberDisplay.onchange = (e) => sendChange(e.target, user, tr)
    const td = document.createElement('td')
    td.colSpan = tr.cells.length
    td.appendChild(box)
    td.className = 'qty-box'
    tr.insertAdjacentElement('afterend', td)
  }
}

function sendChange(elem, user, tr) {
  fetch(`/?user=${user}&itm=${tr.getAttribute('data-itm')}&qty=${elem.value}`)
  tr.querySelector('td:last-child').innerText = tr.getAttribute('data-n') - elem.value
}
