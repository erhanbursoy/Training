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

  /* ----------------------------------------------------------------- marka */
  /* Kelime markası DOM'a gömülü SVG olarak çizilir; <img> ya da data: URI
     kullanılmaz çünkü artifact CSP'si ikisini de engelliyor. Kalıp bir kez
     ayrıştırılıp her çağrıda klonlanır. */
  var markaKalip = null;
  UI.marka = function (o) {
    o = o || {};
    if (!markaKalip && JP.MARKA_ICERIK) {
      markaKalip = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      markaKalip.setAttribute('viewBox', JP.MARKA_KUTU);
      markaKalip.setAttribute('preserveAspectRatio', 'xMinYMid meet');
      markaKalip.innerHTML = JP.MARKA_ICERIK;
    }
    if (!markaKalip) return h('b.marka-yazi', { text: 'Jalpersan' });
    var el = markaKalip.cloneNode(true);
    el.setAttribute('class', 'jp-marka' + (o.sinif ? ' ' + o.sinif : ''));
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', o.etiket || 'Jalpersan');
    el.setAttribute('focusable', 'false');
    if (o.boy) el.style.height = o.boy;
    return el;
  };

  /** Üst çubuk ve giriş ekranı başlığı: marka + alt başlık. */
  UI.markaBaslik = function (altBaslik, o) {
    return h('div.brand', {}, [UI.marka(o), altBaslik ? h('span', { text: altBaslik }) : null]);
  };

  /* ------------------------------------------------------------------ ikon */
  var IKON = {
    sepet: '<path d="M1.6 2.2h1.9l1.7 7.6h6.6l1.4-5.3H4.3"/><circle cx="6.4" cy="12.6" r="1.15"/><circle cx="11.2" cy="12.6" r="1.15"/>',
    zil: '<path d="M8 2.1a3.9 3.9 0 0 0-3.9 3.9v2.4L2.7 11h10.6l-1.4-2.6V6A3.9 3.9 0 0 0 8 2.1z"/><path d="M6.4 13.1a1.75 1.75 0 0 0 3.2 0"/>',
    profil: '<circle cx="8" cy="5.6" r="2.6"/><path d="M2.9 13.6a5.4 5.4 0 0 1 10.2 0"/>',
    ok: '<path d="M6 3.5 10.5 8 6 12.5"/>',
    kutu: '<path d="M2.4 5.2 8 2.3l5.6 2.9v5.6L8 13.7 2.4 10.8z"/><path d="M2.4 5.2 8 8.1l5.6-2.9M8 8.1v5.6"/>',
    liste: '<path d="M2.6 4.2h10.8M2.6 8h10.8M2.6 11.8h10.8"/>',
    kart: '<rect x="2.4" y="2.4" width="5" height="5" rx="1"/><rect x="8.6" y="2.4" width="5" height="5" rx="1"/><rect x="2.4" y="8.6" width="5" height="5" rx="1"/><rect x="8.6" y="8.6" width="5" height="5" rx="1"/>'
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
  /* Belge durumları üç aşamadır (bkz. JP.DURUM): Talep Edildi → İşleme Alındı
     → Tamamlandı, artı İptal. Kalanlar Logo simülatörünün kendi durumları. */
  var RENK = {
    'Talep Edildi': 'warn', 'İşleme Alındı': 'info', 'Tamamlandı': 'ok', 'İptal': '',
    'Taslak': '', 'Açık': 'warn', 'Gönderim Hatası': 'bad',
    'Kesilmedi': 'warn', 'Başarılı': 'ok', 'Hata': 'bad', 'Gönderildi': 'info'
  };
  UI.rozet = function (metin, tip) {
    return h('span.badge' + (RENK[metin] || tip ? '.' + (tip || RENK[metin]) : ''), { text: metin });
  };

  /* ------------------------------------------------------------- kumaş kartı */
  /* Ürün görseli. Normal yol <img> etiketidir. Bazı ortamların içerik güvenlik
     kuralı (Content-Security-Policy) img-src içinde data: taşımaz ve gömülü
     görselleri de engeller; o durumda aynı baytlar tuvale çizilir. Tuval çizimi
     kaynak yüklemesi olmadığı için bu kurala takılmaz. Her ikisi de olmazsa
     altındaki dokuma deseni kalır. */
  function tuvaleCiz(kap, dataUri) {
    if (!dataUri || dataUri.slice(0, 5) !== 'data:' || typeof createImageBitmap !== 'function') return;
    var virgul = dataUri.indexOf(',');
    var ikili;
    try {
      var ham = atob(dataUri.slice(virgul + 1));
      ikili = new Uint8Array(ham.length);
      for (var i = 0; i < ham.length; i++) ikili[i] = ham.charCodeAt(i);
    } catch (e) { return; }
    var tur = dataUri.slice(5, dataUri.indexOf(';')) || 'image/jpeg';
    createImageBitmap(new Blob([ikili], { type: tur })).then(function (bm) {
      if (!kap.isConnected) { if (bm.close) bm.close(); return; }
      var c = document.createElement('canvas');
      c.className = 'kartela-foto';
      c.width = bm.width; c.height = bm.height;
      c.getContext('2d').drawImage(bm, 0, 0);
      kap.appendChild(c);
      if (bm.close) bm.close();
    }).catch(function () {});
  }

  /* Artifact gibi katı CSP'li ortamlarda img-src data: taşımaz; baytları
     tuvale çizmek kaynak yüklemesi saymadığı için görsel yine de görünür. */
  UI.tuvaleCiz = tuvaleCiz;

  UI.kartela = function (urun, yukseklik, genislik, buyuk) {
    var st = { '--sw': urun.renk || '#B9AE99', aspectRatio: yukseklik ? 'auto' : '3 / 2', height: yukseklik || 'auto' };
    if (genislik) { st.width = genislik; st.flex = 'none'; }
    var el = h('div.swatch.sw-' + (urun.doku || 'diger'), { style: st, 'aria-hidden': 'true' });
    // Görsel baytları veritabanında değil ayrı depoda durur; kayıt yalnızca
    // referans taşır. Aksi halde veritabanı tarayıcı kotasını aşıyordu.
    var secim = JP.urunGorselSrc ? JP.urunGorselSrc(urun, buyuk) : { src: null, yedek: null };
    var src = secim.src, yedek = secim.yedek;
    if (src) {
      var im = h('img.kartela-foto', {
        src: src, alt: '', loading: 'lazy', decoding: 'async',
        onerror: function () {
          if (yedek && im.getAttribute('src') !== yedek) { im.setAttribute('src', yedek); return; }
          im.remove();
          tuvaleCiz(el, yedek || src);          // <img> engellendiyse baytları tuvale çiz
        }
      });
      el.appendChild(im);
    }
    return el;
  };

  /** Seçilen dosyayı tarayıcıda küçültüp JPEG veri URI'sine çevirir.
      Depolama kotasını korumak için uzun kenar sınırlanır. */
  /* Yüklenen dosyayı tarayıcıda küçültüp JPEG data URI'ye çevirir.
     Çözümleme createImageBitmap ile yapılır: Blob'u doğrudan okur, kaynak
     yüklemesi saymadığı için katı CSP'li ortamlarda da (artifact) çalışır.
     Eski tarayıcılar için <img> yolu yedekte tutulur. */
  UI.gorselKucult = function (dosya, enFazla, kalite) {
    enFazla = enFazla || 640; kalite = kalite || 0.72;

    function cizVeVer(kaynak, en, boy, coz, red) {
      var o = Math.min(1, enFazla / Math.max(en, boy));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(en * o)); c.height = Math.max(1, Math.round(boy * o));
      c.getContext('2d').drawImage(kaynak, 0, 0, c.width, c.height);
      try { coz(c.toDataURL('image/jpeg', kalite)); }
      catch (e) { red(new Error('Görsel dönüştürülemedi.')); }
    }

    return new Promise(function (coz, red) {
      if (!dosya || !/^image\//.test(dosya.type)) return red(new Error('Yalnızca görsel dosyası yükleyebilirsiniz.'));
      if (dosya.size > 12 * 1024 * 1024) return red(new Error('Dosya çok büyük (en fazla 12 MB).'));

      if (typeof createImageBitmap === 'function') {
        createImageBitmap(dosya).then(function (bm) {
          cizVeVer(bm, bm.width, bm.height, coz, red);
          if (bm.close) bm.close();
        }).catch(function () { imYolu(); });
        return;
      }
      imYolu();

      function imYolu() {
        var fr = new FileReader();
        fr.onerror = function () { red(new Error('Dosya okunamadı.')); };
        fr.onload = function () {
          var im = new Image();
          im.onerror = function () { red(new Error('Görsel çözümlenemedi.')); };
          im.onload = function () { cizVeVer(im, im.width, im.height, coz, red); };
          im.src = fr.result;
        };
        fr.readAsDataURL(dosya);
      }
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
  /* İki yerleşim: varsayılan sol ray (firma, Logo) ve ustMenu (bayi portalı,
     standart web uygulaması gibi üst gezinme + sağ üstte eylem ikonları).
     Bir bölüm yan() döndürürse içerik alanı yan panel + ana alan olarak bölünür. */
  /* Liste/Kart tercihi bayi kataloğu ile firma ürün ekranı arasında ortaktır. */
  UI.gorunumOku = function () {
    try { return localStorage.getItem('jp.katalogGorunum') === 'kart' ? 'kart' : 'liste'; }
    catch (e) { return 'liste'; }
  };
  UI.gorunumYaz = function (v) { try { localStorage.setItem('jp.katalogGorunum', v); } catch (e) {} };

  /* ------------------------------------------------------------ giriş ekranı
   * İki portal aynı giriş ekranını kullanır. Giriş yapan kullanıcının tipi
   * hangi ekrana gidileceğini belirler: firma kullanıcısı firma paneline,
   * bayi kullanıcısı bayi portalına. Kayıt formu yoktur; hesaplar firma
   * tarafından açılır. */
  UI.girisEkrani = function (o) {
    o = o || {};
    var kapi = o.kapi === 'firma' ? 'firma' : 'bayi';
    var kok = document.getElementById('app');
    document.title = (kapi === 'firma' ? 'Firma girişi' : 'Bayi girişi') + ' · Jalpersan B2B';
    document.documentElement.classList.remove('logo-world');
    if (JP.aboneSifirla) JP.aboneSifirla();

    var eposta = h('input', {
      type: 'text', inputmode: 'email', 'aria-label': 'E-posta',
      placeholder: kapi === 'firma' ? 'ad.soyad@jalpersan.example' : 'ad.soyad@bayi.example'
    });
    var hata = h('div.note.bad.hidden');
    var dogrulama = robotDogrulama(function () { dugmeTazele(); });
    var girisDugmesi = h('button.btn.primary.block', { text: 'Giriş yap', onclick: function () { gir(); } });
    var kilitBilgi = h('div.small.muted');
    var sayacId = null;

    function dugmeTazele() {
      var d = JP.girisDurumu();
      girisDugmesi.disabled = d.kilitli || !dogrulama.tamam();
      girisDugmesi.textContent = d.kilitli ? 'Bekleyin (' + d.kalan + ' sn)' : 'Giriş yap';
      girisDugmesi.title = d.kilitli ? 'Çok fazla hatalı deneme'
        : (dogrulama.tamam() ? '' : 'Önce robot olmadığınızı doğrulayın');
      kilitBilgi.textContent = d.kilitli
        ? 'Hatalı deneme sınırı aşıldı. Sayaç sıfırlanınca tekrar deneyebilirsiniz.'
        : (d.deneme ? d.deneme + ' hatalı deneme kaydedildi.' : '');
      if (d.kilitli && !sayacId) sayacId = setInterval(dugmeTazele, 1000);
      if (!d.kilitli && sayacId) { clearInterval(sayacId); sayacId = null; }
    }

    function gir(adres) {
      if (!dogrulama.tamam()) {
        hata.textContent = 'Devam etmek için robot olmadığınızı doğrulayın.';
        hata.classList.remove('hidden');
        return;
      }
      try {
        var k = JP.kullaniciGiris(adres !== undefined ? adres : eposta.value);
        JP.oturumAc(k);
        JP.girisYonlendir(k);            // tip hangi ekrana gidileceğini belirler
      } catch (e) {
        hata.textContent = e.message;
        hata.classList.remove('hidden');
        dogrulama.sifirla();             // her denemede yeniden doğrulama istenir
        dugmeTazele();
      }
    }
    eposta.addEventListener('keydown', function (e) { if (e.key === 'Enter') gir(); });

    function bassiz(ad) {
      return (ad || '').split(/\s+/).filter(function (p) { return /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(p[0] || ''); })
        .slice(0, 2).map(function (p) { return p[0]; }).join('').toLocaleUpperCase('tr');
    }

    function hesapListesi(tip, baslik) {
      var db = JP.db;
      var liste = JP.kullanicilar(null, tip);
      if (!liste.length) return null;
      return h('div.giris-demo.' + tip, {}, [
        h('div.eyebrow', { text: baslik }),
        h('div.stack', { style: { gap: '4px' } }, liste.map(function (k) {
          var b = k.bayiKod ? db.bayiler.find(function (x) { return x.kod === k.bayiKod; }) : null;
          return h('button.giris-hesap', {
            disabled: k.durum === 'Pasif',
            onclick: function () { gir(k.eposta); }
          }, [
            h('span.avatar' + (tip === 'firma' ? '.firma' : ''), { text: bassiz(k.ad) }),
            h('span', {}, [
              h('span.gh-ad', { text: k.ad }),
              h('span.gh-alt', { text: (b ? b.unvan : (tip === 'firma' ? 'Jalpersan' : k.bayiKod)) + ' · ' + JP.rolAdi(k.rol) })
            ]),
            h('span.spacer'),
            k.durum === 'Aktif' ? null : h('span.small.muted', { text: k.durum })
          ]);
        }))
      ]);
    }

    var firma = hesapListesi('firma', 'Prototip · firma hesapları');
    var bayi = hesapListesi('bayi', 'Prototip · bayi hesapları');

    kok.textContent = '';
    kok.appendChild(h('div.giris', {}, h('div.giris-kutu', {}, [
      h('div.giris-bas', {}, [
        UI.markaBaslik('B2B portalı'),
        h('span.poc-flag', { text: 'Prototip' })
      ]),
      h('label.f', {}, ['E-posta adresi', eposta]),
      dogrulama.el,
      hata,
      girisDugmesi,
      kilitBilgi,
      (firma || bayi) ? h('div.stack', {}, [firma, bayi])
        : h('div.note.warn', { text: 'Henüz kullanıcı tanımlanmamış. Firma panelindeki “Bayi kullanıcıları” ya da “Firma kullanıcıları” ekranından hesap açın.' }),
      /* Giriş ekranından ana sayfaya dönüş: demo araçları (rol kartları, veri
         sıfırlama) oradadır, portal ekranlarında değil. */
      h('div.giris-alt', {}, [
        h('span.small.muted', { text: 'Prototip' }),
        h('button.btn.ghost.sm', { text: 'Giriş sayfasına dön →',
          title: 'Rol kartları ve demo verisi seçenekleri', onclick: function () { JP.anaSayfa(); } })
      ])
    ])));
    dugmeTazele();
  };

  /* ------------------------------------------------------- robot doğrulaması
   * JP.AYAR.recaptchaSiteKey tanımlıysa gerçek Google reCAPTCHA v2 bileşeni
   * yüklenir. Tanımlı değilse (prototip varsayılanı) yerine açıkça "prototip"
   * etiketli bir yer tutucu konur — böylece ekran akışı demoda görünür.
   *
   * Önemli: reCAPTCHA koruma sağlamaz, yalnızca sunucu doğruladığında sağlar.
   * Gerçek kurulumda giriş isteğinde gelen token sunucuda
   * https://www.google.com/recaptcha/api/siteverify adresine secret key ile
   * sorulur ve başarısızsa istek reddedilir. İstemcide biten bir kontrol
   * atlatılabilir; bu yüzden hesap kilitleme de sunucu tarafında olmalıdır. */
  function robotDogrulama(degisti) {
    var anahtar = (JP.AYAR && JP.AYAR.recaptchaSiteKey) || '';
    if (anahtar) return gercekRecaptcha(anahtar, degisti);
    return yerTutucu(degisti);
  }

  function gercekRecaptcha(anahtar, degisti) {
    var kutu = h('div.g-recaptcha', { 'data-sitekey': anahtar });
    var uyari = h('div.small.muted', { text: 'reCAPTCHA yükleniyor…' });
    var el = h('div.dogrula', {}, [kutu, uyari]);
    var widget = null;

    function ciz() {
      try {
        widget = window.grecaptcha.render(kutu, {
          sitekey: anahtar,
          callback: function () { uyari.textContent = ''; degisti(); },
          'expired-callback': function () { degisti(); }
        });
        uyari.textContent = '';
      } catch (e) { uyari.textContent = 'reCAPTCHA yüklenemedi: ' + e.message; }
    }

    if (window.grecaptcha && window.grecaptcha.render) ciz();
    else {
      window.jpRecaptchaHazir = ciz;
      var sc = document.createElement('script');
      sc.src = 'https://www.google.com/recaptcha/api.js?onload=jpRecaptchaHazir&render=explicit';
      sc.async = true; sc.defer = true;
      sc.onerror = function () {
        uyari.textContent = 'reCAPTCHA betiği yüklenemedi (ağ ya da içerik güvenlik kuralı engelledi).';
      };
      document.head.appendChild(sc);
    }

    return {
      el: el,
      tamam: function () {
        try { return !!(window.grecaptcha && window.grecaptcha.getResponse(widget)); }
        catch (e) { return false; }
      },
      jeton: function () {
        try { return window.grecaptcha.getResponse(widget) || null; } catch (e) { return null; }
      },
      sifirla: function () { try { window.grecaptcha.reset(widget); } catch (e) {} }
    };
  }

  function yerTutucu(degisti) {
    var kutu = h('input', { type: 'checkbox', id: 'jp-robot' });
    kutu.addEventListener('change', function () { degisti(); });
    var el = h('div.dogrula.yer-tutucu', {}, [
      h('label.chk', {}, [kutu, h('span', { text: 'Robot değilim' })]),
      h('div.spacer'),
      h('span.poc-flag', { text: 'Prototip' })
    ]);
    return {
      el: el,
      tamam: function () { return kutu.checked; },
      jeton: function () { return kutu.checked ? 'prototip' : null; },
      sifirla: function () { kutu.checked = false; }
    };
  }

  function kisitMetni(b) {
    if (b.kisit.tip === 'tumu') return 'Tüm katalog açık';
    if (b.kisit.tip === 'gruplar') return b.kisit.gruplar.join(', ') + ' grupları';
    return b.kisit.urunler.length + ' seçili ürün';
  }


  /** Oturumdaki hesap bu ekrana ait değilse sessizce yönlendirmek yerine
   *  ne olduğunu söyler ve iki çıkış yolu sunar. */
  UI.yetkisizEkran = function (o) {
    var kok = document.getElementById('app');
    document.documentElement.classList.remove('logo-world');
    if (JP.aboneSifirla) JP.aboneSifirla();
    var k = o.kullanici;
    var kendi = JP.oturumHedefi(k);
    kok.textContent = '';
    kok.appendChild(h('div.giris', {}, h('div.giris-kutu', {}, [
      h('div.giris-bas', {}, [
        UI.markaBaslik('B2B portalı'),
        h('span.poc-flag', { text: 'Prototip' })
      ]),
      h('h1', { text: 'Bu ekrana erişiminiz yok' }),
      h('p.small.muted', { text: k.ad + ' hesabı ' + (kendi === 'firma' ? 'firma paneline' : 'bayi portalına') +
        ' aittir. ' + (o.kapi === 'firma' ? 'Firma paneli' : 'Bayi portalı') + ' için uygun bir hesapla giriş yapın.' }),
      h('button.btn.primary.block', {
        text: kendi === 'firma' ? 'Firma paneline dön' : 'Bayi portalına dön',
        onclick: function () { JP.girisYonlendir(k); }
      }),
      h('button.btn.block', { text: 'Çıkış yap', onclick: function () { JP.oturumKapat(); location.reload(); } })
    ])));
  };

  UI.kabuk = function (o) {
    document.title = (o.rolAdi || 'Portal') + ' · Jalpersan B2B';
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
        UI.markaBaslik(o.altBaslik),
        /* Rol çipi ve rol seçici demo araçlarıdır; portal ekranlarında gerçek
           bir ürün gibi görünsün diye yalnızca Logo simülatöründe çıkar.
           Portal ekranlarından çıkış hesap menüsündedir. */
        o.demoBar ? h('span.role-chip', {}, [h('span.dot'), o.rolAdi]) : null,
        (o.demoBar && JP.rolSecici) ? JP.rolSecici() : null,
        o.ustMenu ? h('nav.ust-gez', { 'aria-label': 'Bölümler' }, gorunur.map(function (b) { return dugme(b, true); })) : null,
        h('div.spacer'),
        o.ustSag ? o.ustSag({ git: git, ciz: ciz }) : null,
        o.ustMenu ? null : h('span.poc-flag', { text: 'Prototip · demo verisi', title: JP.SURUM })
      ]);
    }

    /* Bölümler `grup` alanıyla öbeklenir: aynı grubun ilk bölümünden önce bir
       başlık satırı çıkar, grubu olmayan bölümler (Panel) doğrudan listelenir.
       Dar ekranda ray yatay bir şeride dönüştüğü için başlıklar gizlenir. */
    function gezCiz() {
      gezEl.textContent = '';
      gezEl.appendChild(h('div.eyebrow', { text: o.railBaslik || 'Bölümler' }));
      var sonGrup = null;
      gorunur.forEach(function (b) {
        var g = b.grup || null;
        if (g !== sonGrup) {
          if (g) gezEl.appendChild(h('div.rail-grup', { text: g }));
          sonGrup = g;
        }
        gezEl.appendChild(dugme(b));
      });
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
        // Ray yerleşiminde de bölüm bir yan panel isteyebilir (firma ürün ağacı).
        var yan2 = b.yan ? b.yan() : null;
        if (yan2) kabukEl.appendChild(h('aside.yan', { 'aria-label': b.yanBaslik || 'Filtre' }, yan2));
      }
      kabukEl.appendChild(anaEl);

      anaEl.textContent = '';
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
  /* ------------------------------------------------------------ bilgi kutusu */
  /* Belge başlığı: etiket–değer çiftleri. Ölçüm kartı değil, künye — talep ve
     sipariş detaylarının üstünde "bu belge nedir" sorusunu yanıtlar. */
  UI.bilgi = function (satirlar) {
    return h('div.bilgi', {}, satirlar.filter(Boolean).map(function (r) {
      var deger = r[1];
      return h('div', {}, [
        h('div.e', { text: r[0] }),
        h('div.d', {}, typeof deger === 'string' ? h('span', { text: deger }) : deger)
      ]);
    }));
  };

  /* ---------------------------------------------------------------- grafik */
  /* Satır içi SVG çubuk grafik: gün başına üç seri. Kütüphane yüklenmez
     (artifact CSP'si dış betiği de engelliyor), viewBox ile ölçeklenir. */
  UI.grafik = function (o) {
    var seriler = o.seriler || [];
    var etiketler = o.etiketler || [];
    var n = etiketler.length || 1;
    var enBuyuk = 0;
    seriler.forEach(function (s) { s.veri.forEach(function (v) { if (v > enBuyuk) enBuyuk = v; }); });

    /* Yuvarlak bir tepe seç: 1-2-5 basamakları. Sayım ölçülerinde (belge adedi)
       ızgara kesirli olmasın diye tepe dört tam adıma bölünür. */
    var kademe = 4;
    var tepe = enBuyuk > 0 ? enBuyuk : 1;
    if (o.tamsayi) {
      var adimTam = Math.ceil(tepe / kademe);
      var b10 = Math.pow(10, Math.floor(Math.log(adimTam) / Math.LN10));
      var c = adimTam / b10;
      adimTam = (c <= 1 ? 1 : c <= 2 ? 2 : c <= 5 ? 5 : 10) * b10;
      tepe = adimTam * kademe;
    } else {
      var basamak = Math.pow(10, Math.floor(Math.log(tepe) / Math.LN10));
      var carpan = tepe / basamak;
      tepe = (carpan <= 1 ? 1 : carpan <= 2 ? 2 : carpan <= 5 ? 5 : 10) * basamak;
    }

    var ns = 'http://www.w3.org/2000/svg';
    function el(ad, nitelik, cocuk) {
      var e = document.createElementNS(ns, ad);
      Object.keys(nitelik || {}).forEach(function (k) { e.setAttribute(k, String(nitelik[k])); });
      (cocuk || []).forEach(function (c) { if (c) e.appendChild(c); });
      return e;
    }

    /* Telefonda 1000x210 viewBox ekrana sığdırılırken çizim 70 px'e iniyor;
       dar ekranda daha kare bir kutu ve daha büyük yazı kullanılır. */
    function ciz() {
      var dar = false;
      try { dar = window.matchMedia('(max-width: 700px)').matches; } catch (e) {}
      var G = dar ? 560 : 1000, Y = dar ? 320 : 236;
      var solPay = dar ? 64 : 52, altPay = dar ? 34 : 26, ustPay = dar ? 12 : 8;
      var etiketAdim = dar ? 7 : 5;
      var alanG = G - solPay - 8, alanY = Y - altPay - ustPay;
      var adim = n > 1 ? alanG / (n - 1) : 0;
      var x = function (i) { return solPay + adim * i; };
      var y = function (v) { return ustPay + alanY - alanY * (v / tepe); };
      function yazi(px, py, metin, sinif, hiza) {
        var t = el('text', { x: px, y: py, class: sinif || 'gx', 'text-anchor': hiza || 'middle' });
        t.textContent = metin;
        return t;
      }

      var cocuklar = [];
      // yatay ızgara ve eksen değerleri
      for (var i = 0; i <= kademe; i++) {
        var cizgiY = ustPay + alanY * (i / kademe);
        var deger = tepe * (1 - i / kademe);
        cocuklar.push(el('line', { x1: solPay, y1: cizgiY, x2: G - 8, y2: cizgiY, class: 'gizgi' }));
        cocuklar.push(yazi(solPay - 8, cizgiY + (dar ? 6 : 3.5),
          o.tamsayi ? String(Math.round(deger)) : JP.fmt.miktar(Math.round(deger)), 'gx', 'end'));
      }
      /* Her seri bir çizgi. Hareketsiz günler sıfır olarak çizilseydi çizgi
         her değerden sonra tabana inip testere gibi görünürdü; onun yerine
         değeri olan noktalar birbirine bağlanır, boş günler atlanır.
         Seriler aynı değere sık sık denk geldiği için her çizgi kendi zemin
         rengi hâlesiyle çizilir: üsttteki çizgi alttakini keser, ikisi tek
         çizgiye karışmaz. Bu yüzden çizgi ve işaretler seri seri, sırayla
         eklenir. */
      var kalinlik = dar ? 2.8 : 2.2;
      seriler.forEach(function (s) {
        var noktalar = [];
        s.veri.forEach(function (v, i) {
          if (!v) return;
          noktalar.push(x(i).toFixed(2) + ',' + y(v).toFixed(2));
        });
        if (!noktalar.length) return;
        var ortak = {
          points: noktalar.join(' '), fill: 'none',
          'stroke-linejoin': 'round', 'stroke-linecap': 'round'
        };
        cocuklar.push(el('polyline', Object.assign({}, ortak, {
          stroke: 'var(--surface)', 'stroke-width': kalinlik + 3
        })));
        cocuklar.push(el('polyline', Object.assign({}, ortak, {
          stroke: s.renk, 'stroke-width': kalinlik
        })));
        s.veri.forEach(function (v, i) {
          if (!v) return;
          var ipucu = el('title');
          ipucu.textContent = etiketler[i] + ' · ' + s.ad + ': ' + JP.fmt.miktar(v) + (o.olcu ? ' ' + o.olcu : '');
          cocuklar.push(el('circle', {
            cx: x(i).toFixed(2), cy: y(v).toFixed(2), r: dar ? 4.6 : 4,
            fill: s.renk, stroke: 'var(--surface)', 'stroke-width': 1.8
          }, [ipucu]));
        });
      });
      /* Her günü yazmak sığmaz; belirli aralıkta tarih yazılır. İlk ve son
         etiket kenara yapıştığı için hizası içe çevrilir. */
      var sonIndeks = etiketler.length - 1;
      etiketler.forEach(function (etiket, gi) {
        if (gi !== sonIndeks) {
          if (gi % etiketAdim !== 0) return;
          // son etikete çok yakın periyodik etiket üst üste biner
          if (sonIndeks - gi < Math.ceil(etiketAdim / 2)) return;
        }
        var hiza = gi === 0 ? 'start' : (gi === sonIndeks ? 'end' : 'middle');
        cocuklar.push(yazi(x(gi), Y - (dar ? 10 : 8), etiket, 'gx', hiza));
      });
      cocuklar.push(el('line', { x1: solPay, y1: ustPay + alanY, x2: G - 8, y2: ustPay + alanY, class: 'geksen' }));

      return el('svg', {
        class: 'grafik' + (dar ? ' dar' : ''), viewBox: '0 0 ' + G + ' ' + Y, role: 'img',
        'aria-label': o.baslik || 'Grafik', preserveAspectRatio: 'xMidYMid meet'
      }, cocuklar);
    }

    var svg = ciz();
    var kutu = h('div.grafik-kutu', {}, [
      h('div.row.tight.grafik-gosterge', {}, seriler.map(function (s) {
        /* Gösterge, çizginin kendisini örnekler: renkli çizgi ve üstünde nokta. */
        return h('span.gosterge', {}, [
          h('i.g-cizgi', { style: { background: s.renk } }, h('b', { style: { background: s.renk } })),
          h('span', { text: s.ad })
        ]);
      }).concat([h('div.spacer'), o.olcu ? h('span.small.muted', { text: o.olcu }) : null])),
      svg,
      enBuyuk > 0 ? null : h('div.small.muted', { text: o.bos || 'Bu aralıkta hareket yok.' })
    ]);

    /* Ekran genişliği eşiği geçtiğinde (telefon döndürme) yeniden çizilir;
       düğüm DOM'dan çıktığında dinleyici kendini kaldırır. */
    try {
      var mq = window.matchMedia('(max-width: 700px)');
      var tazele = function () {
        if (!kutu.isConnected) { mq.removeEventListener('change', tazele); return; }
        var yenisi = ciz();
        kutu.replaceChild(yenisi, svg);
        svg = yenisi;
      };
      mq.addEventListener('change', tazele);
    } catch (e) {}

    return kutu;
  };

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
