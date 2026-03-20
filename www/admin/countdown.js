window.addEventListener('load', function() {
  let picks, changer = 0
  setInterval(async () => {
    clearInterval(changer)
    document.body.innerHTML = await fetch(location.href).then(r => r.text())
    document.querySelector('h3').innerText = new Date().toLocaleTimeString().split(':').slice(0, 2).join(':')
    picks = document.querySelectorAll('ul li')
    picks.forEach(itm => itm.innerText = `🎉 ${itm.innerText} completed an order! 🎉`)
    picks[0]?.classList?.add('active')
    let activeIndex = 0
    changer = setInterval(() => {
      activeIndex++
      picks.forEach((itm, i) => itm.classList.toggle('active', i === activeIndex))
    }, 30 * 1000 / picks.length)
  }, 30 * 1000)
})
