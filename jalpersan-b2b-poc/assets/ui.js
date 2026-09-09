/* Jalpersan B2B PoC — ortak arayüz yardımcıları (kabuk, tablo, kip, bildirim) */
(function () {
  'use strict';
  var JP = window.JP;
  var UI = (JP.UI = {});

  /* ---------------------------------------------------------------- eleman */
  function h(tag, props, cocuk) {
    var parca = tag.split(/([.#])/), el = document.createElement(parca[0] || 'div');
    for (var i = 1; i < parca.length; i += 2) {
      if (parca[i] === '.') el.classList.add(parca[i + 1]); else el.id = parca[i + 1];
    }
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style') Object.assign(el.style, v);
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
      else el.setAttribute(k, v);
    });
    ekle(el, cocuk);
    return el;
  }
  function ekle(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) return c.forEach(function (x) { ekle(el, x); });
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  UI.h = h;

  /* ------------------------------------------------------------------ ikon */
  var IKON = {
    sepet: '<path d="M1.6 2.2h1.9l1.7 7.6h6.6l1.4-5.3H4.3"/><circle cx="6.4" cy="12.6" r="1.15"/><circle cx="11.2" cy="12.6" r="1.15"/>',
    zil: '<path d="M8 2.1a3.9 3.9 0 0 0-3.9 3.9v2.4L2.7 11h10.6l-1.4-2.6V6A3.9 3.9 0 0 0 8 2.1z"/><path d="M6.4 13.1a1.75 1.75 0 0 0 3.2 0"/>',
    profil: '<circle cx="8" cy="5.6" r="2.6"/><path d="M2.9 13.6a5.4 5.4 0 0 1 10.2 0"/>',
    ok: '<path d="M6 3.5 10.5 8 6 12.5"/>',
    kutu: '<path d="M2.4 5.2 8 2.3l5.6 2.9v5.6L8 13.7 2.4 10.8z"/><path d="M2.4 5.2 8 8.1l5.6-2.9M8 8.1v5.6"/>'
  };
  UI.ikon = function (ad, boy) {
    var d = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    d.setAttribute('viewBox', '0 0 16 16');
    d.setAttribute('width', boy || 16); d.setAttribute('height', boy || 16);
    d.setAttribute('fill', 'none'); d.setAttribute('stroke', 'currentColor');
    d.setAttribute('stroke-width', '1.4'); d.setAttribute('stroke-linecap', 'round');
    d.setAttribute('stroke-linejoin', 'round'); d.setAttribute('aria-hidden', 'true');
    d.innerHTML = IKON[ad] || '';
    return d;
  };

  /* -------------------------------------------------------- açılır menü */
  var acikMenu = null;
  UI.acilir = function (tetik, yap) {
    if (acikMenu) { acikMenu.kapat(); if (acikMenu.tetik === tetik) { acikMenu = null; return; } }
    var kutu = h('div.acilir', { role: 'dialog' }, yap(kapat));
    var yer = tetik.getBoundingClientRect();
    document.body.appendChild(kutu);
    var g = kutu.offsetWidth;
    kutu.style.top = (yer.bottom + 8) + 'px';
    kutu.style.left = Math.max(10, Math.min(yer.right - g, window.innerWidth - g - 10)) + 'px';
    tetik.setAttribute('aria-expanded', 'true');
    function disari(e) { if (!kutu.contains(e.target) && !tetik.contains(e.target)) kapat(); }
    function esc(e) { if (e.key === 'Escape') kapat(); }
    function kapat() {
      kutu.remove(); acikMenu = null;
      tetik.setAttribute('aria-expanded', 'false');
      document.removeEventListener('mousedown', disari); document.removeEventListener('keydown', esc);
    }
    setTimeout(function () { document.addEventListener('mousedown', disari); }, 0);
    document.addEventListener('keydown', esc);
    acikMenu = { kapat: kapat, tetik: tetik };
    return { kapat: kapat };
  };

  /* -------------------------------------------------------------- bildirim */
  var kutu = null;
  UI.toast = function (baslik, metin, tip) {
    if (!kutu) { kutu = h('div.toasts'); document.body.appendChild(kutu); }
    var t = h('div.toast' + (tip ? '.' + tip : ''), {}, [h('b', { text: baslik }), metin ? h('span', { text: metin }) : null]);
    kutu.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(function () { t.remove(); }, 320); }, 4200);
  };
  UI.hata = function (e) { UI.toast('İşlem yapılamadı', e && e.message ? e.message : String(e), 'bad'); };
  UI.dene = function (fn) { try { fn(); } catch (e) { UI.hata(e); } };

  /* ------------------------------------------------------------------- kip */
  UI.modal = function (o) {
    var arka = h('div.modal-bg', {
      onclick: function (e) { if (e.target === arka) kapat(); }
    });
    function kapat() { arka.remove(); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') kapat(); }
    document.addEventListener('keydown', esc);

    var kip = h('div.modal' + (o.genis ? '.wide' : ''), { role: 'dialog', 'aria-modal': 'true' }, [
      h('header', {}, [
        h('h2', { text: o.baslik }),
        o.etiket ? h('span.tag', { text: o.etiket }) : null,
        h('div.spacer'),
        h('button.btn.ghost.sm', { text: 'Kapat', onclick: kapat })
      ]),
      h('div.mb', {}, o.icerik),
      o.aksiyonlar ? h('footer', {}, o.aksiyonlar(kapat)) : null
    ]);
    arka.appendChild(kip);
    document.body.appendChild(arka);
    var ilk = kip.querySelector('input, select, textarea, button.primary');
    if (ilk) ilk.focus();
    return { kapat: kapat, el: kip };
  };

  UI.onay = function (baslik, metin, fn, tehlike) {
    UI.modal({
      baslik: baslik,
      icerik: h('p', { text: metin }),
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary' + (tehlike ? '.danger' : ''), {
            text: 'Onayla', onclick: function () { kapat(); UI.dene(fn); }
          })
        ];
      }
    });
  };

  /* ----------------------------------------------------------- veri dışa akt. */
  UI.tabloKopyala = function (baslik, satirlar) {
    var tsv = satirlar.map(function (r) { return r.join('\t'); }).join('\n');
    function fallback() {
      UI.modal({
        baslik: baslik, etiket: 'Excel için seçip kopyalayın',
        icerik: h('textarea', { value: tsv, rows: 16, readonly: 'readonly', style: { fontFamily: 'var(--font-mono)', fontSize: '11px' } })
      });
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsv).then(
        function () { UI.toast('Panoya kopyalandı', (satirlar.length - 1) + ' satır — Excel\'e doğrudan yapıştırabilirsiniz.', 'ok'); },
        fallback
      );
    } else { fallback(); }
  };

  /* ---------------------------------------------------------------- rozet */
  var RENK = {
    'Açık': 'warn', 'Kısmen Karşılandı': 'info', 'Karşılandı': 'acc', 'Tamamlandı': 'ok', 'İptal': '',
    'Taslak': '', "Logo'ya İletildi": 'info', 'Gönderim Hatası': 'bad', 'Faturalandı': 'acc',
    'Kesilmedi': 'warn', 'Başarılı': 'ok', 'Hata': 'bad', 'Gönderildi': 'info'
  };
  UI.rozet = function (metin, tip) {
    return h('span.badge' + (RENK[metin] || tip ? '.' + (tip || RENK[metin]) : ''), { text: metin });
  };

  /* ------------------------------------------------------------ bakiye bandı */
  UI.bant = function (b) {
    var t = Math.max(b.talep, b.rezerv + b.fatura, 0.0001);
    return h('div.bar', { title: 'Faturalanan ' + JP.fmt.miktar(b.fatura) + ' · Siparişte ' + JP.fmt.miktar(b.rezerv) + ' · Açık ' + JP.fmt.miktar(b.acik) }, [
      h('i.b-fat', { style: { width: (b.fatura / t * 100) + '%' } }),
      h('i.b-rez', { style: { width: (b.rezerv / t * 100) + '%' } }),
      h('i.b-acik', { style: { width: (Math.max(0, b.acik) / t * 100) + '%' } })
    ]);
  };
  UI.bantAciklama = function () {
    return h('div.legend', {}, [
      h('span', { html: '<i style="background:var(--ok)"></i>Faturalanan' }),
      h('span', { html: '<i style="background:var(--info)"></i>Siparişte (rezerve)' }),
      h('span', { html: '<i style="background:var(--warn)"></i>Açık talep' })
    ]);
  };

  /* ------------------------------------------------------------- kumaş kartı */
  UI.kartela = function (urun, yukseklik, genislik) {
    var st = { '--sw': urun.renk || '#B9AE99', aspectRatio: yukseklik ? 'auto' : '3 / 2', height: yukseklik || 'auto' };
    if (genislik) { st.width = genislik; st.flex = 'none'; }
    return h('div.swatch.sw-' + (urun.doku || 'diger'), { style: st, 'aria-hidden': 'true' });
  };

  /* ------------------------------------------------------------------ tablo */
  UI.tablo = function (basliklar, satirlar, bosMetin) {
    if (!satirlar.length) return h('div.empty', { text: bosMetin || 'Kayıt yok.' });
    return h('div.tbl-wrap', {}, h('table.tbl', {}, [
      h('thead', {}, h('tr', {}, basliklar.map(function (b) {
        return h('th' + (b && b.num ? '.num' : ''), { text: b && b.t !== undefined ? b.t : b });
      }))),
      h('tbody', {}, satirlar)
    ]));
  };

  /* ------------------------------------------------------------------ kabuk */
  /* İki yerleşim: varsayılan sol ray (firma, Logo) ve ustMenu (bayi portalı,
     standart web uygulaması gibi üst gezinme + sağ üstte eylem ikonları).
     Bir bölüm yan() döndürürse içerik alanı yan panel + ana alan olarak bölünür. */
  UI.kabuk = function (o) {
    document.title = o.baslik + ' · Jalpersan B2B';
    document.documentElement.classList.toggle('logo-world', !!o.karanlik);
    if (JP.aboneSifirla) JP.aboneSifirla();

    var kok = document.getElementById('app');
    var basEl = h('header.topbar' + (o.ustMenu ? '.ust-menu' : ''));
    var gezEl = h('nav.rail', { 'aria-label': 'Bölümler' });
    var kabukEl = h('div.shell');
    var anaEl = h('main.main');

    var gorunur = o.bolumler.filter(function (b) { return !b.gizli; });
    var aktif = sessionStorage.getItem('jp.bolum.' + o.rol) || gorunur[0].id;
    if (!o.bolumler.some(function (b) { return b.id === aktif; })) aktif = gorunur[0].id;

    function dugme(b, ustte) {
      var n = b.sayi ? b.sayi() : null;
      return h('button', {
        'aria-current': String(b.id === aktif),
        onclick: function () { git(b.id); }
      }, [
        h('span', { text: b.ad }),
        n ? h('span.count' + (b.sicak && b.sicak() ? '.hot' : ''), { text: String(n) }) : null
      ]);
    }

    function basCiz() {
      basEl.textContent = '';
      ekle(basEl, [
        h('div.brand', {}, [h('b', { text: 'Jalpersan' }), h('span', { text: o.altBaslik })]),
        o.ustMenu ? null : h('span.role-chip', {}, [h('span.dot'), o.rolAdi]),
        JP.rolSecici ? JP.rolSecici() : null,
        o.ustMenu ? h('nav.ust-gez', { 'aria-label': 'Bölümler' }, gorunur.map(function (b) { return dugme(b, true); })) : null,
        h('div.spacer'),
        o.ustSag ? o.ustSag({ git: git, ciz: ciz }) : null,
        o.ustMenu ? null : h('span.poc-flag', { text: 'Prototip · demo verisi', title: JP.SURUM })
      ]);
    }

    function gezCiz() {
      gezEl.textContent = '';
      gezEl.appendChild(h('div.eyebrow', { text: o.railBaslik || 'Bölümler' }));
      gorunur.forEach(function (b) { gezEl.appendChild(dugme(b)); });
    }

    function ciz() {
      var kaydirma = window.scrollY;
      var b = o.bolumler.find(function (x) { return x.id === aktif; });
      basCiz();
      kabukEl.textContent = '';
      if (o.ustMenu) {
        var yan = b.yan ? b.yan() : null;
        if (yan) kabukEl.appendChild(h('aside.yan', { 'aria-label': b.yanBaslik || 'Filtre' }, yan));
      } else {
        gezCiz();
        kabukEl.appendChild(gezEl);
      }
      kabukEl.appendChild(anaEl);

      anaEl.textContent = '';
      anaEl.appendChild(h('header', {}, [
        h('h1', { text: b.baslik || b.ad }),
        b.aciklama ? h('p', { text: b.aciklama }) : null
      ]));
      try { anaEl.appendChild(b.ciz({ git: git, ciz: ciz })); }
      catch (e) { console.error(e); anaEl.appendChild(h('div.note.bad', { text: 'Ekran çizilemedi: ' + e.message })); }
      if (kaydirma) window.scrollTo(0, kaydirma);
    }

    function git(id) {
      if (!o.bolumler.some(function (x) { return x.id === id; })) return;
      aktif = id; sessionStorage.setItem('jp.bolum.' + o.rol, id); ciz();
      window.scrollTo(0, 0);
    }

    kok.textContent = '';
    kok.appendChild(h('div.app', {}, [
      basEl,
      JP.depoEngeli ? h('div.note.warn', { style: { margin: '10px 14px 0' }, html: '<b>Tarayıcı depolaması kapalı.</b> Ekranlar arası paylaşım çalışmaz; sayfayı normal bir sekmede (veya yayındaki adreste) açın.' }) : null,
      kabukEl
    ]));

    ciz();
    JP.abone(function () { ciz(); });
    return { ciz: ciz, git: git, aktif: function () { return aktif; } };
  };

  /* ------------------------------------------------ küçük bileşen kısayolları */
  UI.kpi = function (etiket, deger, birim, alt, vurgu) {
    return h('div.kpi' + (vurgu ? '.on-accent' : ''), {}, [
      h('div.k', { text: etiket }),
      h('div.v', {}, [String(deger), birim ? h('span.u', { text: birim }) : null]),
      alt ? h('div.s', { text: alt }) : null
    ]);
  };

  UI.panel = function (baslik, aksiyonlar, govde, duz) {
    return h('div.panel', {}, [
      baslik ? h('div.panel-head', {}, [h('h2', { text: baslik }), h('div.spacer'), aksiyonlar]) : null,
      h('div.panel-body' + (duz ? '.flush' : ''), {}, govde)
    ]);
  };

  /** Adet sayacı: − [ 50 ] +  · deger() ile okunur. */
  UI.sayac = function (o) {
    o = o || {};
    var adim = o.adim || 1, enAz = o.enAz === undefined ? 0 : o.enAz;
    var girdi = h('input', {
      type: 'number', min: String(enAz), step: String(adim), value: String(o.deger === undefined ? adim : o.deger),
      'aria-label': o.etiket || 'Miktar',
      onchange: function () { duzelt(); if (o.onDegisim) o.onDegisim(oku()); }
    });
    function oku() { var v = parseFloat(girdi.value); return isNaN(v) ? 0 : v; }
    function duzelt() { var v = oku(); if (v < enAz) { v = enAz; girdi.value = String(v); } }
    function kaydir(y) { girdi.value = String(Math.max(enAz, Math.round((oku() + y) * 100) / 100)); if (o.onDegisim) o.onDegisim(oku()); }
    var el = h('div.stepper', {}, [
      h('button', { type: 'button', text: '−', 'aria-label': 'Azalt', onclick: function () { kaydir(-adim); } }),
      girdi,
      h('button', { type: 'button', text: '+', 'aria-label': 'Artır', onclick: function () { kaydir(adim); } })
    ]);
    el.deger = oku;
    el.girdi = girdi;
    return el;
  };

  UI.senkronBilgi = function (s) {
    if (!s) return h('span.small.muted', { text: 'Hiç çalıştırılmadı' });
    return h('span.small.muted', { text: 'Son: ' + JP.fmt.saat(s.ts) + (s.toplam ? ' · ' + s.toplam + ' kayıt' : '') });
  };
})();
