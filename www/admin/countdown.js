  setInterval(async () => {
    document.body.innerHTML = await fetch(location.href).then(r => r.text())
    document.querySelector('h3').innerText = new Date().toLocaleTimeString().split(':').slice(0, 2).join(':')
  }, 30 * 1000)