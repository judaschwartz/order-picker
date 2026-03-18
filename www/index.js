const url = new URL(location.href)
const user = url.searchParams.get('user')
const picker = url.searchParams.get('picker')
const assist = url.searchParams.get('assist')
if (picker) {
  url.searchParams.delete('picker')
  url.searchParams.delete('assist')
  window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString())
}
function validateForm(event) {
  const qty = parseInt(document.getElementById('qty').value || 0)
  document.getElementById('qty').value = qty
  const excepted = parseInt(document.getElementById('excepted').innerText || 0)
  if (qty < excepted) {
    if (!confirm(`Received ${qty} but they ordered ${excepted}.\nPress OK if you still want to continue to the next item.`)) {
      event.preventDefault()
    }
  } else if (qty > excepted && qty !== 998) {
    alert(`Received ${qty} but they ordered ${excepted}.\nYou must remove extra items.`)
    event.preventDefault()
  }
}
window.addEventListener('load', function() {
  let goToNext = true;
  const qty = parseInt(document.getElementById('qty').value || 0);
  const excepted = parseInt(document.getElementById('excepted').innerText || 0);
  [...document.querySelectorAll('.next tr')].slice(1).forEach((tr, ind) => {
    if (goToNext) tr.onclick = () => ind ? location.href = `/?user=${user}&itm=${tr.dataset.itm - 1}` : pickAhead(tr)
    if (tr.querySelector('td:last-child').innerText !== '0' || qty < excepted) goToNext = false
  })
})

function increment(input = document.getElementById('qty')) {
  input.value = parseInt(input.value || 0) + 1
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

function decrement(input = document.getElementById('qty')) {
  if (input.value > 0) {
    input.value = parseInt(input.value || 0) - 1
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

function goBack() {
  if (document.referrer.includes('user=')) {
    history.go(-1)
  } else {
    location.href = url.pathname + `?deleteUser=${user}&picker=${picker}&assist=${assist}`
  }
}

function pickAhead(tr) {
  if (tr.nextElementSibling?.classList?.contains('qty-box')) {
    tr.nextElementSibling.remove()
    tr.nextElementSibling.remove()
  } else {
    document.querySelectorAll(".next .qty-box").forEach(e => e.remove())
    const box = document.createElement('div')
    const minusButton = document.createElement('button')
    minusButton.textContent = '-'
    box.appendChild(minusButton)
    const numberDisplay = document.createElement('input')
    numberDisplay.type = 'number'
    numberDisplay.value = Number(tr.dataset.n) - Number(tr.querySelector('td:last-child').innerText)
    box.appendChild(numberDisplay)
    const plusButton = document.createElement('button')
    plusButton.textContent = '+'
    box.appendChild(plusButton)
    plusButton.onclick = () => increment(numberDisplay)
    minusButton.onclick = () => decrement(numberDisplay)
    numberDisplay.onchange = (e) => sendChange(e.target, tr)
    const td = document.createElement('td')
    td.colSpan = tr.cells.length
    td.appendChild(box)
    td.className = 'qty-box'
    tr.after(td)
    tr.insertAdjacentHTML('afterend', '<tr class="qty-box" style="height: 0;"></tr>')
  }
}
let change
function sendChange(elem, tr) {
  clearTimeout(change)
  change = setTimeout(() => {
    fetch(`/?api=1&user=${user}&itm=${tr.dataset.itm}&qty=${elem.value}`).then(() => {
      tr.querySelector('td:last-child').innerText = Number(tr.dataset.n) - elem.value
    }).catch((e) => {
      console.error('error sending change', e)
      elem.value = Number(tr.dataset.n) - Number(tr.querySelector('td:last-child').innerText)
    })
  }, 400)
}
