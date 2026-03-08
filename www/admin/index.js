const url = new URL(location.href)
let autoRefresh

function toggleRefresh() {
  if (!document.querySelector('#auto-reload input').checked) {
    console.log('Refresh stopped')
    clearInterval(autoRefresh)
    const indicator = document.getElementById('refresh-indicator');
    if(indicator) indicator.classList.remove('active');
  } else {
    window.location.reload()
  }
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-theme'));
}

function trapFocus(e) {
  const menu = document.querySelector('.menu.open');
  if (menu) {
    const focusable = menu.querySelectorAll('li, button, input, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }
  }
}

window.addEventListener('load', function() {
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-theme');
  }

  const pageParam = url.searchParams.get('page');
  const menu = document.querySelector('.menu');
  if (!pageParam) {
    if (menu) menu.classList.add('open');
  }

  if (pageParam) {
    const rootPage = pageParam.split('-')[0];
    const activeItem = document.querySelector(`.menu li[data-page="${rootPage}"]`);
    if (activeItem) activeItem.classList.add('active');
    const activeTab = document.querySelector(`.desktop-tabs a[data-page="${rootPage}"]`);
    if (activeTab) activeTab.classList.add('active');
  }

  const indicator = document.getElementById('refresh-indicator');

  // Remove toasts after 3.5s, or click to dismiss
  const toasts = document.querySelectorAll('.toast');
  toasts.forEach(toast => {
    toast.addEventListener('click', () => toast.remove());
    setTimeout(() => {
      if(toast.parentElement) toast.remove();
    }, 3500);
  });

  if (pageParam && ['combo', 'print', 'vol', 'alert', 'block', 'add-vol'].some(p => pageParam.startsWith(p))) {
    document.querySelector('#auto-reload').style.display = 'none'
    if(indicator) indicator.classList.remove('active');
  } else {
    autoRefresh = setInterval(() => {window.location.reload()}, (60 * 1000))
    if(indicator && document.querySelector('#auto-reload input') && document.querySelector('#auto-reload input').checked) {
        indicator.classList.add('active');
    }
  }
  
  // Setup autocomplete if on combo, print or block page
  if (pageParam && ['combo', 'print', 'block'].some(p => pageParam.startsWith(p))) {
    const inputs = document.querySelectorAll('input[name="id1"], input[name="id2"], input[name="printId"], input[name="block"]');
    if (inputs.length > 0) {
      fetch('/api.html?api=orders').then(res => res.json()).then(data => {
        const ordersList = Object.entries(data).map(([id, name]) => ({ id, name }));
        inputs.forEach(inp => {
          inp.type = "text";
          inp.setAttribute("autocomplete", "off");
          inp.parentElement.classList.add("autocomplete");
          
          let currentFocus;
          inp.addEventListener("input", function(e) {
            let a, b, val = this.value;
            closeAllLists();
            if (!val) { return false;}
            currentFocus = -1;
            a = document.createElement("DIV");
            a.setAttribute("id", this.id + "autocomplete-list");
            a.setAttribute("class", "autocomplete-items");
            this.parentNode.appendChild(a);
            
            for (let i = 0; i < ordersList.length; i++) {
              let name = ordersList[i].name || '';
              let id = ordersList[i].id;
              if (name.toUpperCase().includes(val.toUpperCase()) || id.includes(val)) {
                b = document.createElement("DIV");
                b.innerHTML = `<strong>${id}</strong> - ${name}`;
                b.innerHTML += "<input type='hidden' value='" + id + "'>";
                b.addEventListener("click", function(e) {
                    inp.value = this.getElementsByTagName("input")[0].value;
                    closeAllLists();
                });
                a.appendChild(b);
              }
            }
          });
          inp.addEventListener("keydown", function(e) {
              let x = document.getElementById(this.id + "autocomplete-list");
              if (x) x = x.getElementsByTagName("div");
              if (e.keyCode == 40) { // down
                currentFocus++;
                addActive(x);
              } else if (e.keyCode == 38) { // up
                currentFocus--;
                addActive(x);
              } else if (e.keyCode == 13) { // enter
                e.preventDefault();
                if (currentFocus > -1) {
                  if (x) x[currentFocus].click();
                }
              }
          });
          function addActive(x) {
            if (!x) return false;
            removeActive(x);
            if (currentFocus >= x.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (x.length - 1);
            x[currentFocus].classList.add("autocomplete-active");
            if (x[currentFocus].scrollIntoViewIfNeeded) {
              x[currentFocus].scrollIntoViewIfNeeded(false);
            } else {
              x[currentFocus].scrollIntoView({ block: "nearest" });
            }
          }
          function removeActive(x) {
            for (let i = 0; i < x.length; i++) {
              x[i].classList.remove("autocomplete-active");
            }
          }
          function closeAllLists(elmnt) {
            let x = document.getElementsByClassName("autocomplete-items");
            for (let i = 0; i < x.length; i++) {
              if (elmnt != x[i] && elmnt != inp) {
                x[i].parentNode.removeChild(x[i]);
              }
            }
          }
          document.addEventListener("click", function (e) {
              closeAllLists(e.target);
          });
        });
      });
    }
  }

  console.log('Refreshed at', new Date().toTimeString().slice(0, 8))
  
  // Skeleton loader effect
  document.querySelectorAll('.table-container table').forEach(t => {
    t.classList.add('skeleton');
    setTimeout(() => t.classList.remove('skeleton'), 400);
  });

  // Button loading states
  document.querySelectorAll('form button, .btn-primary').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const form = this.closest('form');
      if (!form || form.checkValidity()) {
        const originalText = this.innerHTML;
        if(!this.dataset.loading) {
          this.dataset.loading = "true";
          this.innerHTML = 'Processing...';
          this.style.opacity = '0.7';
          setTimeout(() => {
            this.innerHTML = originalText;
            this.style.opacity = '1';
            delete this.dataset.loading;
          }, 3000);
        }
      }
    });
  });

  document.querySelectorAll('.adminTable').forEach(divTable => {
    const divId = divTable.id
    const collapseBtn = divTable.querySelector('.collapse-btn')
    if (url.searchParams.get(`hide${divId}`)) {
      divTable.querySelector(`.table-wrapper`).style.display = 'none'
      if(collapseBtn) collapseBtn.classList.add('collapsed');
    }
    
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        const wrapper = divTable.querySelector(`.table-wrapper`)
        if (wrapper.style.display === 'none') {
          wrapper.style.display = 'block'
          collapseBtn.classList.remove('collapsed');
          url.searchParams.delete(`hide${divId}`)
        } else {
          wrapper.style.display = 'none'
          collapseBtn.classList.add('collapsed');
          url.searchParams.set(`hide${divId}`, '1')
        }
        window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString())
      })
    }
    
    const currentSort = url.searchParams.get(divId) || '';
    divTable.querySelectorAll("th").forEach(cell => {
      const cellTextRaw = cell.textContent.replace(' ▲', '').replace(' ▼', '').trim();
      
      if (currentSort === cellTextRaw) {
        cell.textContent = cellTextRaw + ' ▲';
      } else if (currentSort === `A-${cellTextRaw}`) {
        cell.textContent = cellTextRaw + ' ▼';
      }

      cell.addEventListener("click", (event) => {
        const cellText = event.target.textContent.replace(' ▲', '').replace(' ▼', '').trim()
        const currentUrl = new URL(window.location)
        if (currentUrl.searchParams.get(divId) === cellText) {
          currentUrl.searchParams.set(divId, `A-${cellText}`)
        } else {
          currentUrl.searchParams.set(divId, cellText)
        }
        window.location.href = currentUrl.href
      })
    })
  });
  ['name', 'phone', 'email', 'printer', 'age', 'hasOrder', 'volId', 'block', 'unblock', 'separate', 'printId', 'prodId', 'itmAlert', 'itmKey', 'qty', 'remove', 'id1', 'id2', 'checkinId', 'editVolId', 'editName', 'editPhone', 'editEmail', 'editAge', 'editHasOrder'].forEach(param => url.searchParams.delete(param))
  window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString())
})
function filterTable(input, tableId) {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    const filter = input.value.toUpperCase();
    const table = document.getElementById('table-' + tableId);
    if(!table) return;
    const tr = table.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) {
      const tds = tr[i].getElementsByTagName("td");
      let match = false;
      
      for (let j = 0; j < tds.length; j++) {
        if (tds[j]) {
          // Reset previously highlighted text
          if (tds[j].dataset.originalHTML) {
            tds[j].innerHTML = tds[j].dataset.originalHTML;
          } else {
            tds[j].dataset.originalHTML = tds[j].innerHTML;
          }

          const cellText = tds[j].textContent || tds[j].innerText;
          
          if (cellText.toUpperCase().indexOf(filter) > -1) {
            match = true;
            // Apply highlight if there is a search term and it's a simple text cell (no buttons inside)
            if (filter.length > 0 && !tds[j].querySelector('button') && !tds[j].querySelector('input')) {
              const regex = new RegExp('('+filter+')', 'gi');
              tds[j].innerHTML = tds[j].innerHTML.replace(regex, '<mark class="highlight">$1</mark>');
            }
          }
        }
      }
      tr[i].style.display = match ? "" : "none";
    }
  }, 250); // 250ms debounce
}

function toggleMenu() {
  const menu = document.querySelector('.menu');
  if (menu) {
    menu.classList.toggle('open');
    if (menu.classList.contains('open')) {
      document.addEventListener('keydown', trapFocus);
    } else {
      document.removeEventListener('keydown', trapFocus);
    }
  }
}

function page(page) {
  url.searchParams.set('page', page)
  window.location.href = url.href
}

/* NEW UI ENHANCEMENTS JAVASCRIPT */
window.addEventListener('load', function() {
  // 5. Toast Stacking
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  const toasts = document.querySelectorAll('.toast');
  toasts.forEach(toast => {
    toastContainer.appendChild(toast);
  });

  // 15. Search Clear Button setup
  document.querySelectorAll('.table-search').forEach(input => {
    const wrapper = document.createElement('div');
    wrapper.className = 'search-wrapper';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    
    const clearBtn = document.createElement('button');
    clearBtn.className = 'search-clear';
    clearBtn.innerHTML = '&times;';
    clearBtn.style.display = 'none';
    clearBtn.onclick = () => {
      input.value = '';
      filterTable(input, input.getAttribute('onkeyup').match(/'([^']+)'/)[1]);
      clearBtn.style.display = 'none';
    };
    wrapper.appendChild(clearBtn);

    input.addEventListener('input', () => {
      clearBtn.style.display = input.value.length > 0 ? 'block' : 'none';
    });
  });

  // 21. Collapse Persistence & 23. Offline Warning
  const offlineBanner = document.createElement('div');
  offlineBanner.id = 'offline-banner';
  offlineBanner.innerHTML = '?? You are currently offline. Changes may not be saved.';
  document.body.prepend(offlineBanner);

  window.addEventListener('offline', () => offlineBanner.classList.add('active'));
  window.addEventListener('online', () => offlineBanner.classList.remove('active'));
  if (!navigator.onLine) offlineBanner.classList.add('active');

  // Override collapse button logic to use localStorage
  document.querySelectorAll('.adminTable').forEach(divTable => {
    const divId = divTable.id;
    const collapseBtn = divTable.querySelector('.collapse-btn');
    const wrapper = divTable.querySelector('.table-wrapper');
    
    if (localStorage.getItem('hide-' + divId) === 'true') {
      if(wrapper) wrapper.style.display = 'none';
      if(collapseBtn) collapseBtn.classList.add('collapsed');
    }
    
    if (collapseBtn) {
      // Remove old listener and add new
      const newBtn = collapseBtn.cloneNode(true);
      collapseBtn.parentNode.replaceChild(newBtn, collapseBtn);
      newBtn.addEventListener('click', () => {
        if (wrapper.style.display === 'none') {
          wrapper.style.display = 'block';
          newBtn.classList.remove('collapsed');
          localStorage.setItem('hide-' + divId, 'false');
        } else {
          wrapper.style.display = 'none';
          newBtn.classList.add('collapsed');
          localStorage.setItem('hide-' + divId, 'true');
        }
      });
    }
  });
});

// 24. Search Highlighting Override with Debounce
let filterTimeout;
window.filterTable = function(input, tableId) {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    const filter = input.value.toUpperCase();
    const table = document.getElementById('table-' + tableId);
    if(!table) return;
    const tr = table.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) {
      const tds = tr[i].getElementsByTagName("td");
      let match = false;
      
      for (let j = 0; j < tds.length; j++) {
        if (tds[j]) {
          // Reset previously highlighted text
          if (tds[j].dataset.originalHTML) {
            tds[j].innerHTML = tds[j].dataset.originalHTML;
          } else {
            tds[j].dataset.originalHTML = tds[j].innerHTML;
          }

          const cellText = tds[j].textContent || tds[j].innerText;
          
          if (cellText.toUpperCase().indexOf(filter) > -1) {
            match = true;
            // Apply highlight if there is a search term and it's a simple text cell (no buttons inside)
            if (filter.length > 0 && !tds[j].querySelector('button') && !tds[j].querySelector('input')) {
              const regex = new RegExp('('+filter+')', 'gi');
              tds[j].innerHTML = tds[j].innerHTML.replace(regex, '<mark class="highlight">$1</mark>');
            }
          }
        }
      }
      tr[i].style.display = match ? "" : "none";
    }
  }, 250); // 250ms debounce
};

// Phone Formatting Utility
window.formatPhoneNumber = function(value) {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 7) {
    return "(" + phoneNumber.slice(0, 3) + ") " + phoneNumber.slice(3);
  }
  return "(" + phoneNumber.slice(0, 3) + ") " + phoneNumber.slice(3, 6) + "-" + phoneNumber.slice(6, 10);
};

window.addEventListener('load', function() {
  // 2. Date/Time Relative Formatting
  function formatRelativeTime(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return timeStr;
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const now = new Date();
    const past = new Date();
    past.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), parts[2] ? parseInt(parts[2], 10) : 0, 0);
    const diffMs = now - past;
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 0) return timeStr; // In the future
    if (diffMins === 0) return 'Just now';
    if (diffMins < 60) return diffMins + ' min' + (diffMins !== 1 ? 's' : '') + ' ago';
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return diffHrs + ' hr' + (diffHrs !== 1 ? 's' : '') + ' ago';
    return timeStr;
  }

  document.querySelectorAll('td').forEach(td => {
    const label = (td.getAttribute('data-label') || '').toLowerCase();
    if (label === 'start' || label === 'end' || label === 'start/time' || label === 'a-end') {
      const timeStr = td.textContent.trim();
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr)) {
        td.title = timeStr; // Tooltip on hover
        td.textContent = formatRelativeTime(timeStr);
      }
    }
  });

  // 4. Row Clickability (Orders Tables)
  ['orders', 'waiting', 'progress'].forEach(tableId => {
    const table = document.getElementById('table-' + tableId);
    if (table) {
      table.querySelectorAll('tr').forEach(tr => {
        if (tr.querySelector('th')) return; // Skip header rows
        tr.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.tagName === 'INPUT') return;
          const orderIdCell = Array.from(tr.querySelectorAll('td')).find(td => 
            (td.getAttribute('data-label') || '').toLowerCase().includes('orderid')
          );
          if (orderIdCell) {
            window.location.href = '/kadmin?page=print&viewId=' + orderIdCell.textContent.trim();
          }
        });
      });
    }
  });

  // 11. FAB Scroll Logic
  const fab = document.getElementById('back-to-top');
  if (fab) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 250) {
        fab.classList.add('visible');
      } else {
        fab.classList.remove('visible');
      }
    });
  }
});

// 14. Custom HTML Confirmation Modal logic
window.customConfirm = function(message, onConfirm) {
  let modal = document.getElementById('custom-confirm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'custom-confirm-modal';
    modal.innerHTML = `
      <div class="confirm-box">
        <p id="custom-confirm-msg"></p>
        <div class="confirm-actions">
          <button id="custom-confirm-cancel" class="btn-cancel" style="flex: 1;">Cancel</button>
          <button id="custom-confirm-ok" class="btn-primary" style="flex: 1;">Yes</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  document.getElementById('custom-confirm-msg').textContent = message;
  modal.style.display = 'flex';
  
  const cancelBtn = document.getElementById('custom-confirm-cancel');
  const okBtn = document.getElementById('custom-confirm-ok');
  
  // Cleanup old listeners to prevent multiple fires
  const newCancel = cancelBtn.cloneNode(true);
  const newOk = okBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
  okBtn.parentNode.replaceChild(newOk, okBtn);

  newCancel.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  newOk.addEventListener('click', () => {
    modal.style.display = 'none';
    if(typeof onConfirm === 'function') onConfirm();
  });
};
