const url = new URL(location.href)
const user = url.searchParams.get('user')
const aisle = url.searchParams.get('aisle')
const picker = url.searchParams.get('picker')
const assist = url.searchParams.get('assist')
if (picker) {
  url.searchParams.delete('picker')
  window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString())
}
if (assist) {
  url.searchParams.delete('assist')
  window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString())
}
function validateForm(event) {
  const qty = parseInt(document.getElementById('qty').value || 0)
  document.getElementById('qty').value = qty
  const excepted = parseInt(document.getElementById('excepted').innerText || 0)
  
  if (qty < excepted) {
    event.preventDefault(); // Pause form submission to wait for user choice
    customAlert(`Received ${qty} but they ordered ${excepted}.<br>Press OK if you still want to continue to the next item.`, 'warning', () => {
      // On confirm, programmatically submit the form
      event.target.submit();
    });
  } else if (qty > excepted && qty !== 998) {
    customAlert(`Received ${qty} but they ordered ${excepted}.<br>You must remove extra items.`, 'danger');
    event.preventDefault();
  }
}
window.addEventListener('load', function() {
  [...document.querySelectorAll('.next tr')].slice(1, 2).forEach(tr => tr.onclick = () => pickAhead(tr, user))
  const aisleInput = document.querySelector('#aisle')
  if (aisleInput) {
    aisleInput.value = aisle || '0'
  }
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
    numberDisplay.value = Number(tr.getAttribute('data-n')) - Number(tr.querySelector('td:last-child').innerText)
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
    tr.insertAdjacentElement('afterend', td)
    tr.insertAdjacentHTML('afterend', '<tr class="qty-box" style="height: 0;"></tr>')
  }
}
let change
function sendChange(elem, tr) {
  clearTimeout(change)
  change = setTimeout(() => {
    fetch(`/?api=1&user=${user}&itm=${tr.getAttribute('data-itm')}&qty=${elem.value}`).then(() => {
      tr.querySelector('td:last-child').innerText = Number(tr.getAttribute('data-n')) - elem.value
    }).catch((e) => {
      console.error('error sending change', e)
      elem.value = Number(tr.getAttribute('data-n')) - Number(tr.querySelector('td:last-child').innerText)
    })
  }, 400)
}

window.customAlert = function(message, type = 'info', onConfirm = null) {
  let container = document.getElementById('picker-alert-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'picker-alert-container';
    document.body.appendChild(container);
  }
  
  const alertBox = document.createElement('div');
  alertBox.className = 'picker-alert ' + type;
  
  let headerText = 'Information';
  if (type === 'warning') headerText = '⚠️ Warning';
  if (type === 'danger') headerText = '🚨 Important Alert';

  const isConfirm = onConfirm !== null;
  
  alertBox.innerHTML = `
    <div class="picker-alert-header">${headerText}</div>
    <div class="picker-alert-body">${message.replace(/\n/g, '<br>')}</div>
    <div class="picker-alert-footer">
      ${isConfirm ? '<button class="btn-alert-cancel">Cancel</button>' : ''}
      <button class="btn-alert-ok">${isConfirm ? 'OK' : 'Got it'}</button>
    </div>
  `;
  
  container.appendChild(alertBox);
  
  const okBtn = alertBox.querySelector('.btn-alert-ok');
  okBtn.onclick = () => {
    alertBox.remove();
    if(isConfirm) onConfirm();
  };
  
  if (isConfirm) {
    alertBox.querySelector('.btn-alert-cancel').onclick = () => alertBox.remove();
  }
};

// Override native alert globally for any inline scripts
window.alert = function(msg) {
  window.customAlert(msg, 'warning');
};
