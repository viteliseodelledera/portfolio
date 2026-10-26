(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  /* ---------- Header ---------- */
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');

  function onScroll() {
    header.classList.toggle('is-solid', window.scrollY > 40);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  toggle.addEventListener('click', function () {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  /* ---------- Reveal on scroll ---------- */
  var items = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Audio players ---------- */
  function fmt(s) {
    s = Math.max(0, Math.floor(s || 0));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  var players = [];

  document.querySelectorAll('.player').forEach(function (el) {
    var btn = el.querySelector('.player__btn');
    var wave = el.querySelector('.player__wave');
    var time = el.querySelector('.player__time');
    var peaks = (window.PEAKS && window.PEAKS[el.dataset.peaks]) || [];
    var duration = parseFloat(el.dataset.duration) || 0;
    var audio = null;

    var bars = peaks.map(function (p) {
      var b = document.createElement('span');
      b.className = 'player__bar';
      b.style.height = Math.max(8, Math.round(p * 100)) + '%';
      wave.appendChild(b);
      return b;
    });

    function ensureAudio() {
      if (audio) return audio;
      audio = new Audio(el.dataset.src);
      audio.preload = 'metadata';
      audio.addEventListener('loadedmetadata', function () {
        if (isFinite(audio.duration)) duration = audio.duration;
        render();
      });
      audio.addEventListener('timeupdate', render);
      audio.addEventListener('play', function () {
        players.forEach(function (p) { if (p.el !== el) p.pause(); });
        el.classList.add('is-playing');
        btn.setAttribute('aria-label', 'Metti in pausa: ' + el.dataset.title);
      });
      audio.addEventListener('pause', function () {
        el.classList.remove('is-playing');
        btn.setAttribute('aria-label', 'Riproduci: ' + el.dataset.title);
      });
      audio.addEventListener('ended', function () {
        audio.currentTime = 0;
        render();
      });
      return audio;
    }

    function render() {
      var cur = audio ? audio.currentTime : 0;
      var ratio = duration ? cur / duration : 0;
      var n = Math.round(ratio * bars.length);
      bars.forEach(function (b, i) { b.classList.toggle('is-played', i < n); });
      time.textContent = fmt(cur) + ' / ' + fmt(duration);
      wave.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
      wave.setAttribute('aria-valuetext', fmt(cur) + ' di ' + fmt(duration));
    }

    function seekTo(ratio) {
      var a = ensureAudio();
      ratio = Math.min(1, Math.max(0, ratio));
      if (duration) a.currentTime = ratio * duration;
      render();
    }

    btn.addEventListener('click', function () {
      var a = ensureAudio();
      if (a.paused) a.play().catch(function () {}); else a.pause();
    });

    function ratioFromEvent(e) {
      var r = wave.getBoundingClientRect();
      return (e.clientX - r.left) / r.width;
    }
    var dragging = false;
    wave.addEventListener('pointerdown', function (e) {
      dragging = true;
      wave.setPointerCapture(e.pointerId);
      seekTo(ratioFromEvent(e));
    });
    wave.addEventListener('pointermove', function (e) { if (dragging) seekTo(ratioFromEvent(e)); });
    wave.addEventListener('pointerup', function () { dragging = false; });
    wave.addEventListener('pointercancel', function () { dragging = false; });
    wave.addEventListener('keydown', function (e) {
      var a = ensureAudio();
      var cur = a.currentTime || 0;
      var handled = true;
      if (e.key === 'ArrowRight') a.currentTime = Math.min(duration, cur + 5);
      else if (e.key === 'ArrowLeft') a.currentTime = Math.max(0, cur - 5);
      else if (e.key === 'Home') a.currentTime = 0;
      else if (e.key === 'End') a.currentTime = Math.max(0, duration - 0.1);
      else if (e.key === ' ' || e.key === 'Enter') { if (a.paused) a.play().catch(function () {}); else a.pause(); }
      else handled = false;
      if (handled) { e.preventDefault(); render(); }
    });

    players.push({ el: el, pause: function () { if (audio && !audio.paused) audio.pause(); } });
    render();
  });

  /* ---------- Video facades ---------- */
  document.querySelectorAll('.video').forEach(function (box) {
    var start = box.querySelector('.video__start');
    start.addEventListener('click', function () {
      players.forEach(function (p) { p.pause(); });
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(box.dataset.yt) + '?autoplay=1&rel=0';
      f.title = box.dataset.title || 'Video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.setAttribute('allowfullscreen', '');
      box.replaceChildren(f);
    });
  });

  /* ---------- Lightbox ---------- */
  var dlg = document.querySelector('.lightbox');
  if (dlg && typeof dlg.showModal === 'function') {
    var img = dlg.querySelector('img');
    var cap = dlg.querySelector('figcaption');
    document.querySelectorAll('.shot__btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var thumb = b.querySelector('img');
        img.src = b.dataset.full;
        img.alt = thumb ? thumb.alt : '';
        cap.textContent = b.dataset.cap || '';
        dlg.showModal();
      });
    });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.tagName === 'FIGURE') dlg.close();
    });
  } else {
    document.querySelectorAll('.shot__btn').forEach(function (b) { b.style.cursor = 'default'; });
  }
})();
