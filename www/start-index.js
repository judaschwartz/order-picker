const url = new URL(location.href)
const deleteUser = Number(url.searchParams.get('deleteUser'))
const pickerId = Number(url.searchParams.get('picker')) 
const assists = url.searchParams.get('assist')
window.history.replaceState(null, '', url.pathname)
const orders = JSON.parse(`ORDERS`)
const blocked = `BLOCKED`.split(',').map(Number)
const volunteers = JSON.parse(`VOLUNTEERS`)
let checkedOut;
try {
  checkedOut = JSON.parse(`CHECKED_OUT_VOLS`);
} catch (e) {
  checkedOut = [];
}
function validateForm(event) {
  const user = parseInt(document.getElementById('user').value.trim())
  const name = document.getElementById('name').value.trim().toUpperCase()
  const pickerIdInput = document.getElementById('picker').value.trim()
  
  document.getElementById('user').value = user
  document.getElementById('name').value = name
  
  if (!user || !orders[user]) {
    customAlert('Invalid order ID.', 'danger')
    refreshPage()
    event.preventDefault()
    return
  } 
  
  if (user && blocked.includes(user)) {
    customAlert('This order # is blocked. Please ask driver to pull to side and wait for management to unblock this order.', 'danger')
    event.preventDefault()
    return
  }

  // Validate main picker
  if (pickerIdInput && !volunteers[pickerIdInput]) {
    customAlert(`Volunteer #${pickerIdInput} is not registered. Please register first.`, 'danger')
    event.preventDefault()
    return
  }
  if (pickerIdInput && checkedOut.includes(pickerIdInput)) {
    customAlert(`Volunteer #${pickerIdInput} has been checked out. Please speak to Shalom Karr to get checked back in.`, 'danger')
    event.preventDefault()
    return
  }

  // Validate assistants
  const assistants = [...document.querySelectorAll('.assist')]
  for (let i = 0; i < assistants.length; i++) {
    const astId = assistants[i].value.trim()
    if (astId && !volunteers[astId]) {
      customAlert(`Assistant Volunteer #${astId} is not registered. Please register first.`, 'danger')
      event.preventDefault()
      return
    }
    if (astId && checkedOut.includes(astId)) {
      customAlert(`Assistant Volunteer #${astId} has been checked out. Please speak to Shalom Karr to get checked back in.`, 'danger')
      event.preventDefault()
      return
    }
  }

  document.getElementById('assist-box').insertAdjacentHTML('beforeEnd', `<input type="hidden" name="assist" value="${assistants.map(i => i.value).filter(Boolean).join(',')}">`)
  document.querySelectorAll('.assist').forEach(e => e.parentElement.remove())
}
function addAssist() {
  const html = `<div><b onclick="this.parentElement.remove();">X</b><input onchange="const v = this.value.trim(); this.nextElementSibling.innerText = checkedOut.includes(v) ? (volunteers[v] + ' (Checked Out)') : (volunteers[v] || 'Not registered'); this.nextElementSibling.style.color = (checkedOut.includes(v) || !volunteers[v]) && v ? 'red' : 'unset';" type="number" class="assist" value=""><span></span></div>`
  document.getElementById('assist-box').insertAdjacentHTML('beforeEnd', html)
}
function refreshPage() {
  const assist = [...document.querySelectorAll('.assist')].map(i => i.value).filter(Boolean).join(',')
  const refreshUrl = `/?deleteUser=${document.querySelector('#user').value}&picker=${document.querySelector('#picker').value}&assist=${assist}"`
  document.getElementById('start-page').innerHTML = `<p>Timed out</p><a href="${refreshUrl}">Back to START an order</a>`
}

function openRegisterModal() {
  document.getElementById('register-modal').style.display = 'flex';
}

function closeRegisterModal() {
  document.getElementById('register-modal').style.display = 'none';
  document.getElementById('register-success').style.display = 'none';
  document.getElementById('register-form').reset();
}

function submitRegister(event) {
  event.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.replace(/\D/g, '');
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const age = document.getElementById('reg-age').value;
  
  // Create volunteer via the api signup endpoint so we get the ID back immediately
  fetch(`/api/signup?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}&age=${encodeURIComponent(age)}`)
    .then(res => res.text())
    .then(volId => {
      const successDiv = document.getElementById('register-success');
      successDiv.style.display = 'block';
      successDiv.innerHTML = `Registration Complete!<br><br>Your Picker ID is <strong style="font-size: 24px; padding: 4px 8px; background: rgba(0,0,0,0.1); border-radius: 4px; display: inline-block; margin: 8px 0;">${volId}</strong><br><br><small style="color: #333; font-weight: normal;">Please speak to Shalom Karr if you need any help.</small>`;
      
      document.getElementById('register-form').style.display = 'none';
      
      // We don't automatically close/reload so the user has time to write down their number or read the message.
      // We'll hook the close button to reload instead.
      document.querySelector('.close').onclick = () => {
         window.location.reload();
      };
    })
    .catch(err => customAlert("Error registering volunteer", "danger"));
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
      customAlert('This order # is blocked. Please ask driver to pull to side and wait for management to speak to them.', 'danger')
    }
  })
  document.querySelector('#user').insertAdjacentHTML('beforeBegin', '<b>PREFIX-</b>')
  document.querySelector('#picker').addEventListener('change', function () {
    const vol = this.value.trim()
    if (checkedOut.includes(vol)) {
      document.querySelector('#p-name span').innerText = volunteers[vol] + ' (Checked Out)'
      document.querySelector('#p-name span').style.color = 'red'
    } else if (volunteers[vol]) {
      document.querySelector('#p-name span').innerText = volunteers[vol]
      document.querySelector('#p-name span').style.color = 'unset'
    } else if (vol) {
      document.querySelector('#p-name span').innerText = 'volunteer is not registered'
      document.querySelector('#p-name span').style.color = 'red'
    } else {
      document.querySelector('#p-name span').innerText = ''
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

window.alert = function(msg) {
  window.customAlert(msg, 'warning');
};
