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
  UI.kartela = function (urun, yukseklik) {
    return h('div.swatch.sw-' + (urun.doku || 'diger'), {
      style: { '--sw': urun.renk || '#B9AE99', aspectRatio: yukseklik ? 'auto' : '3 / 2', height: yukseklik || 'auto' },
      'aria-hidden': 'true'
    });
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
  UI.kabuk = function (o) {
    document.title = o.baslik + ' · Jalpersan B2B';
    document.documentElement.classList.toggle('logo-world', !!o.karanlik);
    if (JP.aboneSifirla) JP.aboneSifirla();

    var kok = document.getElementById('app');
    var railEl = h('nav.rail', { 'aria-label': 'Bölümler' });
    var anaEl = h('main.main');
    var aktif = sessionStorage.getItem('jp.bolum.' + o.rol) || o.bolumler[0].id;
    if (!o.bolumler.some(function (b) { return b.id === aktif; })) aktif = o.bolumler[0].id;

    function railCiz() {
      railEl.textContent = '';
      railEl.appendChild(h('div.eyebrow', { text: o.railBaslik || 'Bölümler' }));
      o.bolumler.forEach(function (b) {
        var n = b.sayi ? b.sayi() : null;
        railEl.appendChild(h('button', {
          'aria-current': String(b.id === aktif),
          onclick: function () { aktif = b.id; sessionStorage.setItem('jp.bolum.' + o.rol, b.id); ciz(); }
        }, [h('span', { text: b.ad }), n ? h('span.count' + (b.sicak && b.sicak() ? '.hot' : ''), { text: n }) : null]));
      });
    }

    function ciz() {
      railCiz();
      anaEl.textContent = '';
      var b = o.bolumler.find(function (x) { return x.id === aktif; });
      anaEl.appendChild(h('header', {}, [
        h('h1', { text: b.baslik || b.ad }),
        b.aciklama ? h('p', { text: b.aciklama }) : null
      ]));
      try { anaEl.appendChild(b.ciz()); }
      catch (e) { console.error(e); anaEl.appendChild(h('div.note.bad', { text: 'Ekran çizilemedi: ' + e.message })); }
    }

    kok.textContent = '';
    kok.appendChild(h('div.app', {}, [
      h('header.topbar', {}, [
        h('div.brand', {}, [h('b', { text: 'Jalpersan' }), h('span', { text: o.altBaslik })]),
        h('span.role-chip', {}, [h('span.dot'), o.rolAdi]),
        JP.rolSecici ? JP.rolSecici() : null,
        h('div.spacer'),
        o.ustSag ? o.ustSag() : null,
        h('span.poc-flag', { text: 'Prototip · demo verisi', title: JP.SURUM })
      ]),
      JP.depoEngeli ? h('div.note.warn', { style: { margin: '10px 14px 0' }, html: '<b>Tarayıcı depolaması kapalı.</b> Ekranlar arası paylaşım çalışmaz; sayfayı normal bir sekmede (veya yayındaki adreste) açın.' }) : null,
      h('div.shell', {}, [railEl, anaEl])
    ]));

    ciz();
    JP.abone(function () { ciz(); });
    return { ciz: ciz };
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

  UI.senkronBilgi = function (s) {
    if (!s) return h('span.small.muted', { text: 'Hiç çalıştırılmadı' });
    return h('span.small.muted', { text: 'Son: ' + JP.fmt.saat(s.ts) + (s.toplam ? ' · ' + s.toplam + ' kayıt' : '') });
  };
})();
