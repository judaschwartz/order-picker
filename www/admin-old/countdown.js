  setInterval(async () => {
    document.body.innerHTML = await fetch(location.href).then(r => r.text())
    document.querySelector('h3').innerText = new Date().toLocaleTimeString().slice(0, 4)
  }, 10 * 1000)