/* Firma paneli — muhasebe ve yönetim.
   Beş bölüm: Panel, Talepler, Siparişler, Ürünler, Bayiler.
   Her liste ekranında tarih aralığı, arama ve durum filtresi vardır; ürün ve bayi
   detayları ayrı ekrandır. Miktarlar farklı birimlerde olabildiği için belge
   düzeyinde toplanmaz; ekranlarda iş dili kullanılır. */
(function () {
  'use strict';
  var JP = window.JP, UI = JP.UI, h = UI.h;
  var kabuk = null;

  var secTalep = null, talepGorunum = 'urunler';
  var secSiparis = null;
  var secUrun = null;
  var secBayi = null, bayiGorunum = 'bilgiler';
  var fTalep = { bas: '', bit: '', ara: '', durum: '' };
  var fSiparis = { bas: '', bit: '', ara: '', durum: '' };
  var fUrun = { ara: '' };
  var fBayi = { ara: '' };
  var secKullanici = null;
  var fKullanici = { ara: '', bayiKod: '', durum: '' };

  JP.firmaEkran = function () {
    kabuk = UI.kabuk({
      rol: 'firma', rolAdi: 'Firma paneli', altBaslik: 'Muhasebe ve yönetim',
      railBaslik: 'Yönetim',
      ustSag: function () {
        return h('div.row.tight', {}, [
          h('button.btn.sm', { text: 'Demoyu baştan başlat', title: 'Portal tarafını boşaltır; Logo kartları kalır.', onclick: demoSifirla }),
          h('button.btn.sm', { text: 'Örnek veriye dön', onclick: function () { UI.onay('Örnek veriye dön', 'Tüm PoC verisi silinip başlangıç örneğine dönülür.', function () { JP.sifirla(false); UI.toast('Örnek veri yüklendi', null, 'ok'); }, true); } })
        ]);
      },
      bolumler: [
        { id: 'panel', ad: 'Panel', ciz: panel },
        { id: 'talepler', ad: 'Talepler',
          ciz: talepler,
          sayi: function () { return JP.db.talepler.filter(bekleyen).length; },
          sicak: function () { return JP.db.talepler.filter(bekleyen).length > 0; } },
        { id: 'siparisler', ad: 'Siparişler',
          ciz: siparisler, sayi: function () { return JP.db.siparisler.length; } },
        { id: 'urunler', ad: 'Ürünler',
          ciz: urunler, sayi: function () { return JP.db.urunler.length; } },
        { id: 'bayiler', ad: 'Bayiler',
          ciz: bayiler, sayi: function () { return JP.db.bayiler.length; } },
        { id: 'kullanicilar', ad: 'Kullanıcılar',
          ciz: kullanicilar, sayi: function () { return (JP.db.kullanicilar || []).length; },
          sicak: function () { return (JP.db.kullanicilar || []).some(function (k) { return k.durum === 'Davet gönderildi'; }); } }
      ]
    });
  };

  /* ------------------------------------------------------------- yardımcı */
  function bekleyen(t) { var d = JP.talepDurumu(t); return d === 'Açık' || d === 'Kısmen Karşılandı'; }
  function bayiAd(kod) { var b = JP.db.bayiler.find(function (x) { return x.kod === kod; }); return b ? b.unvan : kod; }
  function urun(kod) { return JP.db.urunler.find(function (x) { return x.kod === kod; }) || { ad: kod, kod: kod, birim: '', doku: 'diger', renk: '#B9AE99', gosterimBirimi: '' }; }
  function kucult(s) { return (s || '').toLocaleLowerCase('tr'); }
  function gunBasi(d) { return d ? d + 'T00:00:00' : null; }
  function gunSonu(d) { return d ? d + 'T23:59:59' : null; }

  function sevkSayim(kalemler, alanTalep, alanSevk) {
    var s = { tam: 0, kismi: 0, yok: 0, toplam: kalemler.length };
    kalemler.forEach(function (k) {
      var t = k[alanTalep], f = k[alanSevk];
      if (f >= t - 0.001) s.tam++; else if (f > 0.001) s.kismi++; else s.yok++;
    });
    return s;
  }
  function ilerleme(s) {
    var t = Math.max(s.toplam, 1);
    return h('div.row.tight', { style: { width: '164px' } }, [
      h('div.bar', { style: { flex: '1 1 auto' }, title: s.tam + ' kalem tamamlandı, ' + s.kismi + ' kalem kısmi' }, [
        h('i', { style: { width: (s.tam / t * 100) + '%', background: 'var(--ok)' } }),
        h('i', { style: { width: (s.kismi / t * 100) + '%', background: 'var(--warn)' } })
      ]),
      h('span.small.mono.muted', { text: s.tam + ' / ' + s.toplam })
    ]);
  }

  /** Ortak filtre çubuğu: tarih aralığı, arama, durum. */
  function filtreCubugu(f, durumlar, yenile, sagEk) {
    function alan(etiket, el) { return h('label.f.filtre-alan', {}, [etiket, el]); }
    var girisler = [
      alan('Başlangıç', h('input', { type: 'date', value: f.bas, onchange: function (e) { f.bas = e.target.value; yenile(); } })),
      alan('Bitiş', h('input', { type: 'date', value: f.bit, onchange: function (e) { f.bit = e.target.value; yenile(); } })),
      alan('Ara', h('input.filtre-ara', {
        type: 'text', value: f.ara, placeholder: 'Belge no, bayi veya ürün ara…',
        oninput: function (e) { f.ara = e.target.value; yenile(true); }
      }))
    ];
    if (durumlar) {
      girisler.push(alan('Durum', h('select', { onchange: function (e) { f.durum = e.target.value; yenile(); } },
        [h('option', { value: '', text: 'Tümü', selected: !f.durum })].concat(
          durumlar.map(function (d) { return h('option', { value: d, selected: f.durum === d, text: d }); })))));
    }
    var temizVar = f.bas || f.bit || f.ara || f.durum;
    return h('div.filtre', {}, girisler.concat([
      h('div.filtre-son', {}, [
        temizVar ? h('button.btn.ghost.sm', { text: 'Temizle', onclick: function () { f.bas = f.bit = f.ara = f.durum = ''; yenile(); } }) : null,
        sagEk || null
      ])
    ]));
  }

  function demoSifirla() {
    UI.onay('Demoyu baştan başlat',
      'Portal tarafı (ürün, bayi, talep, sipariş, geçmiş) boşaltılır. Logo simülatöründeki stok ve cari kartlar kalır, böylece senaryoya 1. adımdan başlayabilirsiniz.',
      function () { JP.sifirla(true); UI.toast('Demo sıfırlandı', 'Sıradaki adım: Ürünler ekranından “Logo’dan güncelle”.', 'ok'); }, true);
  }

  /* ------------------------------------------------------------------ panel */
  function panel() {
    var db = JP.db;
    var acikTalep = db.talepler.filter(bekleyen).length;
    var acikSiparis = db.siparisler.filter(function (s) { return s.durum === "Logo'ya İletildi" || s.durum === 'Faturalandı'; }).length;
    var hatali = db.siparisler.filter(function (s) { return s.durum === 'Gönderim Hatası'; }).length;
    var gecikmis = db.siparisler.filter(function (s) { return s.durum === "Logo'ya İletildi" && JP.gunFark(s.tarih) > 7; }).length;

    function kart(etiket, deger, birim, alt, hedef, vurgu) {
      var el = UI.kpi(etiket, String(deger), birim, alt, vurgu);
      el.style.cursor = 'pointer';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.addEventListener('click', function () { kabuk.git(hedef); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kabuk.git(hedef); } });
      return el;
    }

    var kap = h('div.stack');
    if (!db.urunler.length || !db.bayiler.length) {
      kap.appendChild(h('div.note.warn', {}, [
        h('b', { text: 'Portal ana verisi boş. ' }),
        h('span', { text: 'Ana veri sahibi Logo’dur; ürün ve bayi ekranlarındaki “Logo’dan güncelle” ile çekin. ' }),
        h('button.btn.sm', { text: 'Ürünlere git', onclick: function () { kabuk.git('urunler'); } })
      ]));
    }
    kap.appendChild(h('div.grid.k4', {}, [
      kart('Bekleyen talep', acikTalep, 'talep', 'Siparişe dönmeyi bekliyor', 'talepler', acikTalep > 0),
      kart('Açık sipariş', acikSiparis, 'sipariş', "Logo'da faturalanmayı bekliyor", 'siparisler'),
      kart('Gönderim hatası', hatali, 'sipariş', hatali ? 'Yeniden gönderilmeli' : 'Sorun yok', 'siparisler'),
      kart('Gecikmiş sipariş', gecikmis, 'sipariş', "7 günden uzun süredir faturalanmadı", 'siparisler')
    ]));
    return kap;
  }

  /* ------------------------------------------------- talepler: liste + detay */
  function talepAc(no) { secTalep = no; talepGorunum = 'urunler'; kabuk.git('talepler'); }

  function talepSuz() {
    var q = kucult(fTalep.ara).trim();
    var bas = gunBasi(fTalep.bas), bit = gunSonu(fTalep.bit);
    return JP.db.talepler.filter(function (t) {
      if (bas && t.tarih < bas) return false;
      if (bit && t.tarih > bit) return false;
      if (fTalep.durum && JP.talepDurumu(t) !== fTalep.durum) return false;
      if (!q) return true;
      if (kucult(t.no).indexOf(q) >= 0) return true;
      if (kucult(bayiAd(t.bayiKod) + ' ' + t.bayiKod).indexOf(q) >= 0) return true;
      return t.kalemler.some(function (k) { return kucult(k.urunKod + ' ' + urun(k.urunKod).ad).indexOf(q) >= 0; });
    });
  }

  function talepler() {
    var db = JP.db;
    if (secTalep) {
      var t = db.talepler.find(function (x) { return x.no === secTalep; });
      if (t) return talepDetay(t);
      secTalep = null;
    }
    if (!db.talepler.length) return h('div.empty', { text: 'Henüz satın alma talebi yok.' });

    var liste = talepSuz();
    var govde = h('div');
    function tabloCiz() {
      govde.textContent = '';
      govde.appendChild(UI.panel(null, null, UI.tablo(
        ['Tarih', 'Talep no', 'Bayi', 'Durum', { t: 'Kalem', num: true }, 'Sevkiyat', ''],
        liste.map(function (t) {
          var s = sevkSayim(JP.talepKalemDurum(t), 'talep', 'fatura');
          return h('tr', { style: { cursor: 'pointer' }, onclick: function () { talepAc(t.no); } }, [
            h('td.small.nowrap', { text: JP.fmt.tarih(t.tarih) }),
            h('td.mono', { text: t.no, style: { fontWeight: '600' } }),
            h('td.small', { text: bayiAd(t.bayiKod) }),
            h('td', {}, UI.rozet(JP.talepDurumu(t))),
            h('td.num.mono', { text: String(s.toplam) }),
            h('td', {}, ilerleme(s)),
            h('td.right', {}, h('button.btn.ghost.sm', { text: 'Detay', onclick: function (e) { e.stopPropagation(); talepAc(t.no); } }))
          ]);
        }), 'Filtreye uyan talep yok.'), true));
    }
    function yenile(yerinde) {
      liste = talepSuz();
      sayimEl.textContent = liste.length + ' / ' + db.talepler.length + ' talep';
      if (yerinde) tabloCiz(); else kabuk.ciz();
    }
    var sayimEl = h('span.small.muted', { text: liste.length + ' / ' + db.talepler.length + ' talep' });
    tabloCiz();

    return h('div.stack', {}, [
      filtreCubugu(fTalep, ['Açık', 'Kısmen Karşılandı', 'Karşılandı', 'Tamamlandı'], yenile,
        h('div.row.tight', {}, [
          sayimEl,
          h('button.btn.ghost.sm', { text: "Excel'e kopyala", onclick: function () { talepKopyala(liste); } })
        ])),
      govde
    ]);
  }

  function talepKopyala(liste) {
    var satir = [['Talep no', 'Tarih', 'Bayi', 'Durum', 'Ürün kodu', 'Ürün', 'Birim', 'Talep edilen', 'Siparişe alınan', 'Sevk edilen', 'Bekleyen']];
    liste.forEach(function (t) {
      JP.talepKalemDurum(t).forEach(function (k) {
        satir.push([t.no, JP.fmt.tarih(t.tarih), bayiAd(t.bayiKod), JP.talepDurumu(t),
          k.kalem.urunKod, k.urun.ad, k.urun.birim, k.talep, k.siparis, k.fatura, Math.max(0, k.talep - k.fatura)]);
      });
    });
    UI.tabloKopyala('Talepler', satir);
  }

  function talepDetay(t) {
    var kalemler = JP.talepKalemDurum(t);
    var islem = JP.talepIslemleri(t.no);
    var sayim = sevkSayim(kalemler, 'talep', 'fatura');
    var donusturulebilir = kalemler.some(function (k) { return k.donusturulebilir > 0.001; });

    var govde = h('div.stack');
    if (talepGorunum === 'urunler') govde.appendChild(detayUrunler(kalemler));
    else if (talepGorunum === 'islemler') govde.appendChild(detayIslemler(islem));
    else govde.appendChild(detayGecmis(t));

    return h('div.stack', {}, [
      h('div.row', {}, [
        h('button.btn.ghost.sm', { text: '← Talep listesi', onclick: function () { secTalep = null; kabuk.ciz(); } }),
        h('div.spacer'),
        h('button.btn.primary', { text: 'Siparişe dönüştür', disabled: !donusturulebilir, onclick: function () { donusumKip(t); } })
      ]),
      UI.panel(null, null, h('div.stack', {}, [
        h('div.row', {}, [
          h('h2.mono', { text: t.no }),
          UI.rozet(JP.talepDurumu(t)),
          h('button.btn.ghost.sm', { text: bayiAd(t.bayiKod), onclick: function () { bayiAc(t.bayiKod); } }),
          h('span.small.muted', { text: JP.fmt.tarih(t.tarih) + ' · ' + JP.gunFark(t.tarih) + ' gün önce' }),
          t.teslimTarihi ? h('span.tag', { text: 'İstenen teslim ' + JP.fmt.tarih(t.teslimTarihi) }) : null
        ]),
        t.not ? h('div.small.muted', { text: '“' + t.not + '”' }) : null,
        h('div.grid.k4', {}, [
          UI.kpi('Kalem', String(sayim.toplam), 'ürün'),
          UI.kpi('Tamamı sevk edildi', String(sayim.tam), 'kalem'),
          UI.kpi('Kısmen sevk edildi', String(sayim.kismi), 'kalem'),
          UI.kpi('Sevk edilmedi', String(sayim.yok), 'kalem', 'Miktarlar kalem satırlarında, kendi biriminden', true)
        ])
      ])),
      h('div.seg', {}, [
        ['urunler', 'Ürünler (' + kalemler.length + ')'],
        ['islemler', 'İşlemler (' + (islem.siparisler.length + islem.faturalar.length) + ')'],
        ['gecmis', 'Geçmiş']
      ].map(function (o) {
        return h('button', { 'aria-pressed': String(talepGorunum === o[0]), text: o[1],
          onclick: function () { talepGorunum = o[0]; kabuk.ciz(); } });
      })),
      govde
    ]);
  }

  function detayUrunler(kalemler) {
    return UI.panel('Talep kalemleri', h('span.small.muted', { text: 'Miktarlar ürünün sipariş biriminden' }),
      UI.tablo(['Ürün', 'Birim', { t: 'Talep edilen', num: true }, { t: 'Siparişe alınan', num: true }, { t: 'Sevk edilen', num: true }, { t: 'Bekleyen', num: true }, { t: 'Dönüştürülebilir', num: true }],
        kalemler.map(function (k) {
          var bek = Math.max(0, k.talep - k.fatura);
          return h('tr', {}, [
            h('td', {}, h('button.urun-link', { onclick: function () { urunAc(k.kalem.urunKod); } }, [
              UI.kartela(k.urun, '26px', '40px'),
              h('span', {}, [h('span.small', { text: k.urun.ad }), h('span.pc.mono', { text: k.kalem.urunKod })])
            ])),
            h('td.small.muted.nowrap', { text: k.urun.gosterimBirimi }),
            h('td.num.mono', { text: JP.fmt.miktar(k.talep) }),
            h('td.num.mono', { text: JP.fmt.miktar(k.siparis) }),
            h('td.num.mono', { text: JP.fmt.miktar(k.fatura), style: { color: k.fatura > 0 ? 'var(--ok)' : 'var(--text-3)' } }),
            h('td.num.mono', { text: JP.fmt.miktar(bek) }),
            h('td.num.mono', { text: JP.fmt.miktar(k.donusturulebilir),
              style: { color: k.donusturulebilir > 0 ? 'var(--warn)' : 'var(--text-3)', fontWeight: '600' } })
          ]);
        })), true);
  }

  function detayIslemler(islem) {
    return h('div.stack', {}, [
      UI.panel('Oluşturulan siparişler', null,
        UI.tablo(['Sipariş no', 'Tarih', 'Durum', 'Logo fiş', { t: 'Miktar', num: true }, { t: 'Sevk edilen', num: true }, ''],
          islem.siparisler.map(function (s) {
            return h('tr', {}, [
              h('td.mono', { text: s.no }),
              h('td.small.muted', { text: JP.fmt.tarih(s.tarih) }),
              h('td', {}, UI.rozet(s.durum)),
              h('td.mono.small', { text: s.logoFisNo || '—' }),
              h('td.num.mono', { text: JP.fmt.miktar(s.miktar) }),
              h('td.num.mono', { text: JP.fmt.miktar(s.faturalanan) }),
              h('td.right', {}, h('button.btn.ghost.sm', { text: 'Siparişe git', onclick: function () { siparisAc(s.no); } }))
            ]);
          }), 'Bu talepten henüz sipariş oluşturulmadı.'), true),
      UI.panel('Sevkiyat ve faturalar', h('span.small.muted', { text: 'Fatura kesildiğinde sevkiyat gerçekleşmiş sayılır' }),
        UI.tablo(['Fatura no', 'Tarih', 'Tip', 'Eşleşme', 'GİB', { t: 'Sevk edilen', num: true }],
          islem.faturalar.map(function (f) {
            return h('tr', {}, [
              h('td.mono', { text: f.no }),
              h('td.small.muted', { text: JP.fmt.tarih(f.ts) }),
              h('td.small', { text: f.tur }),
              h('td.small.muted', { text: JP.ESLESME_ADI[f.eslesme] || '—' }),
              h('td', {}, f.gib === '—' ? h('span.small.muted', { text: '—' }) : UI.rozet(f.gib)),
              h('td.num.mono', { text: JP.fmt.miktar(f.miktar) })
            ]);
          }), 'Bu talepten henüz sevkiyat yapılmadı.'), true)
    ]);
  }

  function detayGecmis(t) {
    var hs = JP.db.havuz.filter(function (x) { return x.talepNo === t.no && !x.rezervKapanis; })
      .sort(function (a, b) { return b.ts.localeCompare(a.ts); });
    return UI.panel('Talep geçmişi', h('span.small.muted', { text: hs.length + ' kayıt' }), gecmisTablosu(hs), true);
  }

  function gecmisTablosu(hs) {
    return UI.tablo(['Tarih', 'Ürün', 'İşlem', { t: 'Miktar', num: true }, 'Belge', 'Kaynak', 'Kullanıcı'],
      hs.map(function (x) {
        var ad = JP.islemAdi(x);
        return h('tr', {}, [
          h('td.small.nowrap', { text: JP.fmt.saat(x.ts) }),
          h('td.mono.small', { text: x.urunKod }),
          h('td', {}, UI.rozet(ad, x.tip === 'dFatura' ? 'ok' : (x.miktar > 0 ? 'info' : 'warn'))),
          h('td.num.mono', { text: JP.fmt.miktar(Math.abs(x.miktar)) }),
          h('td.mono.small', { text: x.belge || '—' }),
          h('td.small.muted', { text: x.kaynak === 'logo' ? 'Logo' : (x.kaynak === 'elle' ? 'Elle' : 'Portal') }),
          h('td.small.muted', { text: x.kullanici })
        ]);
      }), 'Kayıt yok.');
  }

  /* ------------------------------------------------ talep → sipariş dönüşümü */
  function donusumKip(t) {
    var kalemler = JP.talepKalemDurum(t).filter(function (k) { return k.donusturulebilir > 0.001; });
    var secim = {};
    kalemler.forEach(function (k) { secim[k.kalem.id] = { dahil: true, miktar: k.donusturulebilir }; });
    var ozet = h('div.small.muted');
    function ozetGuncelle() {
      var n = 0;
      kalemler.forEach(function (k) { var s = secim[k.kalem.id]; if (s.dahil && s.miktar > 0) n++; });
      ozet.textContent = n + ' kalem siparişe dönüşecek. Girilmeyen miktar talepte açık kalır.';
    }
    var satirlar = kalemler.map(function (k) {
      var mik = h('input.qty', {
        type: 'number', min: '0', max: String(k.donusturulebilir), step: '10', value: String(k.donusturulebilir),
        oninput: function (e) { secim[k.kalem.id].miktar = parseFloat(e.target.value) || 0; ozetGuncelle(); }
      });
      var kutu = h('input', { type: 'checkbox', checked: true,
        onchange: function (e) { secim[k.kalem.id].dahil = e.target.checked; mik.disabled = !e.target.checked; ozetGuncelle(); } });
      return h('tr', {}, [
        h('td', {}, h('label.chk', {}, [kutu, h('span.small', { text: k.urun.ad })])),
        h('td.mono.small', { text: k.kalem.urunKod }),
        h('td.small.muted', { text: k.urun.gosterimBirimi }),
        h('td.num.mono', { text: JP.fmt.miktar(k.talep) }),
        h('td.num.mono', { text: JP.fmt.miktar(k.donusturulebilir) }),
        h('td', {}, mik)
      ]);
    });
    ozetGuncelle();

    UI.modal({ etiket: t.no + ' · ' + bayiAd(t.bayiKod), genis: true,
      icerik: h('div.stack', {}, [
        UI.tablo(['Kalem', 'Kod', 'Birim', { t: 'Talep', num: true }, { t: 'Dönüştürülebilir', num: true }, 'Sipariş miktarı'], satirlar),
        ozet,
        h('div.note', { text: 'Sipariş portalda “Taslak” olarak oluşur. Logo’ya gönderim ayrı bir adımdır.' })
      ]),
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', { text: 'Sipariş oluştur',
            onclick: function () {
              UI.dene(function () {
                var s = JP.siparisOlustur(t.bayiKod, kalemler.filter(function (k) { return secim[k.kalem.id].dahil; })
                  .map(function (k) { return { talepNo: t.no, kalemId: k.kalem.id, miktar: secim[k.kalem.id].miktar }; }), 'muhasebe');
                kapat(); UI.toast('Sipariş oluşturuldu', s.no + ' · Logo’ya göndermek için sipariş detayını açın.', 'ok');
                secTalep = null; siparisAc(s.no);
              });
            } })
        ];
      }
    });
  }

  /* ------------------------------------------------ siparişler: liste + detay */
  function siparisAc(no) { secSiparis = no; kabuk.git('siparisler'); }

  function siparisSuz() {
    var q = kucult(fSiparis.ara).trim();
    var bas = gunBasi(fSiparis.bas), bit = gunSonu(fSiparis.bit);
    return JP.db.siparisler.filter(function (s) {
      if (bas && s.tarih < bas) return false;
      if (bit && s.tarih > bit) return false;
      if (fSiparis.durum && s.durum !== fSiparis.durum) return false;
      if (!q) return true;
      if (kucult(s.no + ' ' + (s.logoFisNo || '')).indexOf(q) >= 0) return true;
      if (kucult(bayiAd(s.bayiKod) + ' ' + s.bayiKod).indexOf(q) >= 0) return true;
      return s.kalemler.some(function (k) { return kucult(k.urunKod + ' ' + urun(k.urunKod).ad + ' ' + k.talepNo).indexOf(q) >= 0; });
    });
  }

  function logoSorgula() {
    UI.dene(function () {
      var r = JP.durumSorgula();
      UI.toast('Logo sorgusu tamamlandı',
        r.okunanFis + ' fiş · ' + r.miktarDegisimi + ' miktar değişimi · ' + (r.faturaHareketi + r.fifo) + ' sevkiyat · ' +
        r.atlanan + ' mükerrer atlandı' + (r.kapanan ? ' · ' + r.kapanan + ' sipariş kapandı' : ''), 'ok');
    });
  }

  function siparisler() {
    var db = JP.db;
    if (secSiparis) {
      var s = db.siparisler.find(function (x) { return x.no === secSiparis; });
      if (s) return siparisDetay(s);
      secSiparis = null;
    }
    if (!db.siparisler.length) return h('div.empty', { text: 'Henüz sipariş yok. Talepler ekranından oluşturun.' });

    var liste = siparisSuz();
    var govde = h('div');
    function tabloCiz() {
      govde.textContent = '';
      govde.appendChild(UI.panel(null, null, UI.tablo(
        ['Tarih', 'Sipariş no', 'Bayi', 'Durum', 'Logo fiş', { t: 'Kalem', num: true }, 'Sevkiyat', ''],
        liste.map(function (s) {
          var sy = sevkSayim(JP.siparisKalemDurum(s), 'logoMiktar', 'sevk');
          return h('tr', { style: { cursor: 'pointer' }, onclick: function () { siparisAc(s.no); } }, [
            h('td.small.nowrap', { text: JP.fmt.tarih(s.tarih) }),
            h('td.mono', { text: s.no, style: { fontWeight: '600' } }),
            h('td.small', { text: bayiAd(s.bayiKod) }),
            h('td', {}, UI.rozet(s.durum)),
            h('td.mono.small', { text: s.logoFisNo || '—' }),
            h('td.num.mono', { text: String(sy.toplam) }),
            h('td', {}, ilerleme(sy)),
            h('td.right', {}, h('button.btn.ghost.sm', { text: 'Detay', onclick: function (e) { e.stopPropagation(); siparisAc(s.no); } }))
          ]);
        }), 'Filtreye uyan sipariş yok.'), true));
    }
    function yenile(yerinde) {
      liste = siparisSuz();
      sayimEl.textContent = liste.length + ' / ' + db.siparisler.length + ' sipariş';
      if (yerinde) tabloCiz(); else kabuk.ciz();
    }
    var sayimEl = h('span.small.muted', { text: liste.length + ' / ' + db.siparisler.length + ' sipariş' });
    tabloCiz();

    return h('div.stack', {}, [
      filtreCubugu(fSiparis, ['Taslak', "Logo'ya İletildi", 'Gönderim Hatası', 'Faturalandı', 'Tamamlandı', 'İptal'], yenile,
        h('div.row.tight', {}, [
          sayimEl,
          h('button.btn.ghost.sm', { text: "Excel'e kopyala", onclick: function () { siparisKopyala(liste); } })
        ])),
      h('div.row', {}, [
        h('button.btn.primary', { text: "Logo'dan sorgula", title: 'Açık siparişlerin fiş ve fatura durumunu Logo’dan okur', onclick: logoSorgula }),
        UI.senkronBilgi(db.senkron.siparis)
      ]),
      govde
    ]);
  }

  function siparisKopyala(liste) {
    var satir = [['Sipariş no', 'Tarih', 'Bayi', 'Durum', 'Logo fiş', 'Talep no', 'Ürün kodu', 'Ürün', 'Birim', 'Sipariş', "Logo'daki miktar", 'Sevk edilen', 'Kalan']];
    liste.forEach(function (s) {
      JP.siparisKalemDurum(s).forEach(function (k) {
        satir.push([s.no, JP.fmt.tarih(s.tarih), bayiAd(s.bayiKod), s.durum, s.logoFisNo || '',
          k.kalem.talepNo, k.kalem.urunKod, k.urun.ad, k.urun.birim, k.siparis, k.logoMiktar, k.sevk, k.kalan]);
      });
    });
    UI.tabloKopyala('Siparişler', satir);
  }

  function siparisDetay(s) {
    var db = JP.db;
    var kl = JP.siparisKalemDurum(s);
    var sayim = sevkSayim(kl, 'logoMiktar', 'sevk');
    var fis = db.logo.fisler.find(function (f) { return f.portalRef === s.logoRef; });
    var faturalar = fis ? db.logo.faturalar.filter(function (f) { return f.fisNo === fis.fisNo; }) : [];
    var degisen = kl.filter(function (k) { return k.degisti; }).length;

    return h('div.stack', {}, [
      h('div.row', {}, [
        h('button.btn.ghost.sm', { text: '← Sipariş listesi', onclick: function () { secSiparis = null; kabuk.ciz(); } }),
        h('div.spacer'),
        (s.durum === 'Taslak' || s.durum === 'Gönderim Hatası') ? h('button.btn.primary', {
          text: s.durum === 'Gönderim Hatası' ? 'Yeniden gönder' : "Logo'ya gönder",
          onclick: function () { UI.dene(function () { JP.siparisLogoyaGonder(s.no); UI.toast('Logo’ya iletildi', 'Fiş numarası siparişe yazıldı.', 'ok'); }); }
        }) : null,
        s.durum === 'Taslak' ? h('button.btn.sm', { text: 'Gönderim hatası simüle et',
          onclick: function () { UI.dene(function () { JP.siparisLogoyaGonder(s.no, true); UI.toast('Gönderim başarısız', 'Sipariş portalda korunuyor, yeniden denenebilir.', 'bad'); }); } }) : null,
        (s.durum !== 'Tamamlandı' && s.durum !== 'İptal') ? h('button.btn.sm', { text: "Logo'dan sorgula",
          onclick: function () { UI.dene(function () { JP.durumSorgula(s.no); UI.toast('Sorgulandı', s.no, 'ok'); }); } }) : null,
        (s.durum !== 'Tamamlandı' && s.durum !== 'İptal') ? h('button.btn.ghost.sm', { text: 'İptal et',
          onclick: function () { UI.onay('Siparişi iptal et', s.no + ' iptal edilecek ve bağlı miktar talepte tekrar açılacak. Logo fişi elle iptal edilmelidir.', function () { JP.siparisIptal(s.no); UI.toast('Sipariş iptal edildi', null, 'ok'); }, true); } }) : null
      ]),
      s.hataMetni ? h('div.note.bad', { text: s.hataMetni }) : null,
      degisen ? h('div.note.warn', { text: degisen + ' kalemin miktarı Logo tarafında değiştirilmiş. Talep bakiyeleri buna göre düzeltildi.' }) : null,

      UI.panel(null, null, h('div.stack', {}, [
        h('div.row', {}, [
          h('h2.mono', { text: s.no }),
          UI.rozet(s.durum),
          h('button.btn.ghost.sm', { text: bayiAd(s.bayiKod), onclick: function () { bayiAc(s.bayiKod); } }),
          s.logoFisNo ? h('span.tag', { text: 'Logo fiş ' + s.logoFisNo }) : null,
          h('span.tag', { text: 'ref ' + s.logoRef }),
          h('span.small.muted', { text: JP.fmt.tarih(s.tarih) })
        ]),
        h('div.grid.k4', {}, [
          UI.kpi('Kalem', String(sayim.toplam), 'ürün'),
          UI.kpi('Tamamı sevk edildi', String(sayim.tam), 'kalem'),
          UI.kpi('Kısmen sevk edildi', String(sayim.kismi), 'kalem'),
          UI.kpi('Sevk edilmedi', String(sayim.yok), 'kalem', null, true)
        ])
      ])),

      UI.panel('Sipariş kalemleri', h('span.small.muted', { text: 'Miktarlar ürünün sipariş biriminden' }),
        UI.tablo(['Ürün', 'Birim', 'Talep', { t: 'Sipariş', num: true }, { t: "Logo'daki miktar", num: true }, { t: 'Sevk edilen', num: true }, { t: 'Kalan', num: true }],
          kl.map(function (k) {
            return h('tr', {}, [
              h('td', {}, h('button.urun-link', { onclick: function () { urunAc(k.kalem.urunKod); } }, [
                UI.kartela(k.urun, '26px', '40px'),
                h('span', {}, [h('span.small', { text: k.urun.ad }), h('span.pc.mono', { text: k.kalem.urunKod })])
              ])),
              h('td.small.muted.nowrap', { text: k.urun.gosterimBirimi }),
              h('td', {}, h('button.tag', { text: k.kalem.talepNo, onclick: function () { secSiparis = null; talepAc(k.kalem.talepNo); } })),
              h('td.num.mono', { text: JP.fmt.miktar(k.siparis) }),
              h('td.num.mono', { text: JP.fmt.miktar(k.logoMiktar),
                style: k.degisti ? { color: 'var(--warn)', fontWeight: '600' } : null }),
              h('td.num.mono', { text: JP.fmt.miktar(k.sevk), style: { color: k.sevk > 0 ? 'var(--ok)' : 'var(--text-3)' } }),
              h('td.num.mono', { text: JP.fmt.miktar(k.kalan) })
            ]);
          })), true),

      UI.panel('Faturalar', h('span.small.muted', { text: faturalar.length + ' fatura' }),
        UI.tablo(['Fatura no', 'Tip', 'GİB', 'Satırlar'], faturalar.map(function (f) {
          return h('tr', {}, [
            h('td.mono.small', { text: f.no }),
            h('td.small', { text: f.tur }),
            h('td', {}, UI.rozet(f.gib)),
            h('td.small.muted', { text: f.satirlar.map(function (x) { return x.stokKod + ' × ' + JP.fmt.miktar(x.miktar); }).join(' · ') })
          ]);
        }), 'Bu sipariş için henüz fatura kesilmedi.'), true)
    ]);
  }

  /* --------------------------------------------------- ürünler: liste + ekran */
  function urunAc(kod) { secUrun = kod; kabuk.git('urunler'); }

  function urunSuz() {
    var q = kucult(fUrun.ara).trim();
    return JP.db.urunler.slice().sort(function (a, b) { return a.grup.localeCompare(b.grup, 'tr') || a.sira - b.sira; })
      .filter(function (u) {
        if (!q) return true;
        return kucult(u.kod + ' ' + u.ad + ' ' + u.grup + ' ' + (u.seri || '') + ' ' + (u.ozellik || '')).indexOf(q) >= 0;
      });
  }

  function logoUrunCek() {
    UI.dene(function () {
      var r = JP.logoUrunleriCek();
      UI.toast('Ürünler güncellendi', r.toplam + ' kart okundu · ' + r.yeni + ' yeni, ' + r.guncel + ' değişti.', 'ok');
    });
  }

  function urunler() {
    var db = JP.db;
    if (secUrun) {
      var u = db.urunler.find(function (x) { return x.kod === secUrun; });
      if (u) return urunEkrani(u);
      secUrun = null;
    }

    var liste = urunSuz();
    var govde = h('div');
    function tabloCiz() {
      govde.textContent = '';
      govde.appendChild(db.urunler.length
        ? UI.panel(null, null, UI.tablo(['', 'Ürün', 'Kategori · seri', 'Birim', 'Logo', 'Siparişe', ''],
            liste.map(function (u) {
              return h('tr', { style: { cursor: 'pointer' }, onclick: function () { urunAc(u.kod); } }, [
                h('td', { style: { width: '54px' } }, UI.kartela(u, '34px', '48px')),
                h('td', {}, [h('div', { text: u.ad }), h('div.pc.mono', { text: u.kod })]),
                h('td.small.muted', { text: JP.urunKirilim(u) }),
                h('td.small.mono', { text: u.gosterimBirimi }),
                h('td', {}, u.logodaYok ? UI.rozet("Logo'da yok", 'bad') : (u.logoAktif ? UI.rozet('Aktif', 'ok') : UI.rozet('Pasif', 'warn'))),
                h('td', {}, u.siparieAcik ? UI.rozet('Açık', 'ok') : UI.rozet('Kapalı', '')),
                h('td.right', {}, h('button.btn.ghost.sm', { text: 'Detay', onclick: function (e) { e.stopPropagation(); urunAc(u.kod); } }))
              ]);
            }), 'Aramaya uyan ürün yok.'), true)
        : h('div.note.warn', { html: '<b>Ürün yok.</b> “Logo’dan güncelle” ile stok kartlarını çekin.' }));
    }
    function yenile() {
      liste = urunSuz();
      sayimEl.textContent = liste.length + ' / ' + db.urunler.length + ' ürün';
      tabloCiz();
    }
    var sayimEl = h('span.small.muted', { text: liste.length + ' / ' + db.urunler.length + ' ürün' });
    tabloCiz();

    return h('div.stack', {}, [
      h('div.cat-bar', {}, [
        h('input.ara', { type: 'text', value: fUrun.ara, placeholder: 'Ürün adı, stok kodu, kategori veya özellik ara…',
          'aria-label': 'Ürün ara', oninput: function (e) { fUrun.ara = e.target.value; yenile(); } }),
        sayimEl,
        h('button.btn.primary.sm', { text: "Logo'dan güncelle", onclick: logoUrunCek }),
        UI.senkronBilgi(db.senkron.urun)
      ]),
      govde
    ]);
  }

  function urunEkrani(u) {
    var acik = h('input', { type: 'checkbox', checked: u.siparieAcik, disabled: !u.logoAktif });
    var birim = h('input', { type: 'text', value: u.gosterimBirimi || '', placeholder: 'metre / adet / top' });
    var sira = h('input', { type: 'number', value: String(u.sira || 0), step: '1' });
    var ozellik = h('input', { type: 'text', value: u.ozellik || '', placeholder: 'Örn. 280 cm en · leke tutmaz apre' });
    var aciklama = h('textarea', { value: u.aciklama || '', placeholder: 'Bayi ürün detayında görünür', rows: 5 });

    var bekleyenSatir = JP.havuzOzet({ sadeceAcik: true }).filter(function (r) { return r.urunKod === u.kod; });

    function kaydet() {
      JP.tx(function (d) {
        var p = d.urunler.find(function (x) { return x.kod === u.kod; });
        p.siparieAcik = acik.checked && p.logoAktif;
        p.gosterimBirimi = birim.value.trim() || (p.birim === 'MTR' ? 'metre' : 'adet');
        p.sira = parseInt(sira.value, 10) || 0;
        p.ozellik = ozellik.value;
        p.aciklama = aciklama.value;
      });
      UI.toast('Ürün kaydedildi', u.kod, 'ok');
    }

    return h('div.stack', {}, [
      h('div.row', {}, [
        h('button.btn.ghost.sm', { text: '← Ürün listesi', onclick: function () { secUrun = null; kabuk.ciz(); } }),
        h('div.spacer'),
        h('button.btn.sm', { text: "Logo'dan güncelle", onclick: logoUrunCek }),
        h('button.btn.primary', { text: 'Kaydet', onclick: kaydet })
      ]),
      !u.logoAktif ? h('div.note.warn', { text: u.logodaYok ? "Bu kart Logo'da bulunamadı. Portal alanları korunuyor ancak ürün siparişe açılamaz." : "Bu kart Logo'da pasif. Ürün siparişe açılamaz." }) : null,

      h('div.grid.k2', {}, [
        UI.panel('Logo alanları', h('span.small.muted', { text: 'Salt okunur' }), h('div.stack', {}, [
          UI.kartela(u, '210px', null, true),
          h('dl.kv', {}, [
            h('dt', { text: 'Stok kodu' }), h('dd.mono', { text: u.kod }),
            h('dt', { text: 'Ad' }), h('dd', { text: u.ad }),
            h('dt', { text: 'Kategori · seri' }), h('dd', { text: JP.urunKirilim(u) }),
            h('dt', { text: 'Birim' }), h('dd.mono', { text: u.birim }),
            h('dt', { text: 'Durum' }), h('dd', {}, u.logodaYok ? UI.rozet("Logo'da yok", 'bad') : (u.logoAktif ? UI.rozet('Aktif', 'ok') : UI.rozet('Pasif', 'warn')))
          ])
        ])),
        UI.panel('Portal alanları', h('span.small.muted', { text: 'Düzenlenebilir' }), h('div.stack', {}, [
          h('label.chk', {}, [acik, h('span', { text: 'Siparişe açık — kapalı ürün bayi kataloğunda görünmez' })]),
          h('div.grid.k2', {}, [
            h('label.f', {}, ['Bayiye gösterilen birim', birim]),
            h('label.f', {}, ['Katalog sırası', sira])
          ]),
          h('label.f', {}, ['Teknik özellik (katalog satırında görünür)', ozellik]),
          h('label.f', {}, ['Ürün açıklaması (ürün detayında görünür)', aciklama])
        ]))
      ]),

      UI.panel('Bu üründe sevk bekleyen talepler', h('span.small.muted', { text: bekleyenSatir.length + ' bayi' }),
        UI.tablo(['Bayi', { t: 'Talep edilen', num: true }, { t: 'Siparişte', num: true }, { t: 'Sevk edilen', num: true }, { t: 'Bekleyen', num: true }, { t: 'Yaş', num: true }],
          bekleyenSatir.map(function (r) {
            return h('tr', {}, [
              h('td.small', {}, h('button.btn.ghost.sm', { text: bayiAd(r.bayiKod), onclick: function () { secUrun = null; bayiAc(r.bayiKod); } })),
              h('td.num.mono', { text: JP.fmt.miktar(r.talep) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.rezerv) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.fatura) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.acik), style: { color: 'var(--warn)', fontWeight: '600' } }),
              h('td.num.small.muted', { text: r.yas + ' g' })
            ]);
          }), 'Bu ürün için bekleyen talep yok.'), true)
    ]);
  }

  /* --------------------------------------------------- bayiler: liste + ekran */
  function bayiAc(kod) { secBayi = kod; bayiGorunum = 'bilgiler'; kabuk.git('bayiler'); }

  function bayiSuz() {
    var q = kucult(fBayi.ara).trim();
    return JP.db.bayiler.filter(function (b) {
      if (!q) return true;
      return kucult(b.kod + ' ' + b.unvan + ' ' + b.sehir + ' ' + b.ulke + ' ' + b.eposta).indexOf(q) >= 0;
    });
  }

  function logoBayiCek() {
    UI.dene(function () {
      var r = JP.logoBayileriCek();
      UI.toast('Bayiler güncellendi', r.toplam + ' kart okundu · ' + r.yeni + ' yeni, ' + r.guncel + ' değişti.', 'ok');
    });
  }

  function bayiler() {
    var db = JP.db;
    if (secBayi) {
      var b = db.bayiler.find(function (x) { return x.kod === secBayi; });
      if (b) return bayiEkrani(b);
      secBayi = null;
    }

    var liste = bayiSuz();
    var govde = h('div');
    function tabloCiz() {
      govde.textContent = '';
      govde.appendChild(db.bayiler.length
        ? UI.panel(null, null, UI.tablo(['Bayi', 'Şehir / Ülke', 'Logo', 'Siparişe', 'Katalog', { t: 'Kullanıcı', num: true }, { t: 'Bekleyen talep', num: true }, ''],
            liste.map(function (b) {
              var acikT = db.talepler.filter(function (t) { return t.bayiKod === b.kod && bekleyen(t); }).length;
              var kSay = JP.kullanicilar(b.kod).length;
              return h('tr', { style: { cursor: 'pointer' }, onclick: function () { bayiAc(b.kod); } }, [
                h('td', {}, [h('div', { text: b.unvan }), h('div.pc.mono', { text: b.kod + ' · ' + b.eposta })]),
                h('td.small', { text: b.sehir + ' / ' + b.ulke }),
                h('td', {}, b.logodaYok ? UI.rozet("Logo'da yok", 'bad') : (b.logoAktif ? UI.rozet('Aktif', 'ok') : UI.rozet('Pasif', 'warn'))),
                h('td', {}, b.siparisAcik ? UI.rozet('Açık', 'ok') : UI.rozet('Kapalı', '')),
                h('td.small.muted', { text: kisitMetni(b) }),
                h('td.num.mono', { text: String(kSay), style: kSay ? null : { color: 'var(--warn)' } }),
                h('td.num.mono', { text: String(acikT) }),
                h('td.right', {}, h('button.btn.ghost.sm', { text: 'Detay', onclick: function (e) { e.stopPropagation(); bayiAc(b.kod); } }))
              ]);
            }), 'Aramaya uyan bayi yok.'), true)
        : h('div.note.warn', { html: '<b>Bayi yok.</b> “Logo’dan güncelle” ile cari kartları çekin.' }));
    }
    function yenile() {
      liste = bayiSuz();
      sayimEl.textContent = liste.length + ' / ' + db.bayiler.length + ' bayi';
      tabloCiz();
    }
    var sayimEl = h('span.small.muted', { text: liste.length + ' / ' + db.bayiler.length + ' bayi' });
    tabloCiz();

    return h('div.stack', {}, [
      h('div.cat-bar', {}, [
        h('input.ara', { type: 'text', value: fBayi.ara, placeholder: 'Unvan, cari kodu, şehir veya e-posta ara…',
          'aria-label': 'Bayi ara', oninput: function (e) { fBayi.ara = e.target.value; yenile(); } }),
        sayimEl,
        h('button.btn.primary.sm', { text: "Logo'dan güncelle", onclick: logoBayiCek }),
        UI.senkronBilgi(db.senkron.cari)
      ]),
      govde
    ]);
  }

  function kisitMetni(b) {
    if (b.kisit.tip === 'tumu') return 'Tüm ürünler';
    if (b.kisit.tip === 'gruplar') return (b.kisit.gruplar.length || 0) + ' kategori';
    return b.kisit.urunler.length + ' seçili ürün';
  }

  function bayiEkrani(b) {
    var db = JP.db;
    var talepleri = db.talepler.filter(function (t) { return t.bayiKod === b.kod; });
    var siparisleri = db.siparisler.filter(function (s) { return s.bayiKod === b.kod; });

    var kullanicilari = JP.kullanicilar(b.kod);
    var govde = h('div.stack');
    if (bayiGorunum === 'bilgiler') govde.appendChild(bayiBilgi(b));
    else if (bayiGorunum === 'kullanicilar') govde.appendChild(bayiKullanicilar(b, kullanicilari));
    else if (bayiGorunum === 'talepler') govde.appendChild(bayiTalepler(talepleri));
    else govde.appendChild(bayiSiparisler(siparisleri));

    return h('div.stack', {}, [
      h('div.row', {}, [
        h('button.btn.ghost.sm', { text: '← Bayi listesi', onclick: function () { secBayi = null; kabuk.ciz(); } }),
        h('div.spacer'),
        h('button.btn.sm', { text: "Logo'dan güncelle", onclick: logoBayiCek })
      ]),
      UI.panel(null, null, h('div.row', {}, [
        h('h2', { text: b.unvan }),
        h('span.tag', { text: b.kod }),
        b.logodaYok ? UI.rozet("Logo'da yok", 'bad') : (b.logoAktif ? UI.rozet('Aktif', 'ok') : UI.rozet('Pasif', 'warn')),
        b.siparisAcik ? UI.rozet('Siparişe açık', 'ok') : UI.rozet('Siparişe kapalı', 'warn'),
        h('span.small.muted', { text: b.sehir + ' / ' + b.ulke + ' · ' + b.eposta })
      ])),
      h('div.seg', {}, [
        ['bilgiler', 'Bilgiler'],
        ['kullanicilar', 'Kullanıcılar (' + kullanicilari.length + ')'],
        ['talepler', 'Talepler (' + talepleri.length + ')'],
        ['siparisler', 'Siparişler (' + siparisleri.length + ')']
      ].map(function (o) {
        return h('button', { 'aria-pressed': String(bayiGorunum === o[0]), text: o[1],
          onclick: function () { bayiGorunum = o[0]; kabuk.ciz(); } });
      })),
      govde
    ]);
  }

  function bayiBilgi(b) {
    var db = JP.db;
    var acik = h('input', { type: 'checkbox', checked: b.siparisAcik, disabled: !b.logoAktif });
    var not = h('textarea', { value: b.teslimatNotu || '', rows: 3, placeholder: 'Bayi talep ekranında varsayılan olarak görünür' });
    var gruplar = [];
    db.urunler.forEach(function (u) { if (gruplar.indexOf(u.grup) < 0) gruplar.push(u.grup); });
    var tip = b.kisit.tip, secGrup = b.kisit.gruplar.slice(), secUrunler = b.kisit.urunler.slice();
    var kisitEl = h('div.stack');

    function kisitCiz() {
      kisitEl.textContent = '';
      kisitEl.appendChild(h('div.seg', {}, [['tumu', 'Tüm ürünler'], ['gruplar', 'Seçili kategoriler'], ['urunler', 'Seçili ürünler']].map(function (o) {
        return h('button', { type: 'button', 'aria-pressed': String(tip === o[0]), text: o[1], onclick: function () { tip = o[0]; kisitCiz(); } });
      })));
      if (tip === 'gruplar') {
        kisitEl.appendChild(h('div.stack', { style: { gap: '4px', maxHeight: '260px', overflowY: 'auto' } }, gruplar.map(function (g) {
          return h('label.chk', {}, [h('input', { type: 'checkbox', checked: secGrup.indexOf(g) >= 0,
            onchange: function (e) { if (e.target.checked) secGrup.push(g); else secGrup.splice(secGrup.indexOf(g), 1); } }), h('span.small', { text: g })]);
        })));
      } else if (tip === 'urunler') {
        kisitEl.appendChild(h('div.stack', { style: { gap: '4px', maxHeight: '300px', overflowY: 'auto' } }, db.urunler.map(function (u) {
          return h('label.chk', {}, [h('input', { type: 'checkbox', checked: secUrunler.indexOf(u.kod) >= 0,
            onchange: function (e) { if (e.target.checked) secUrunler.push(u.kod); else secUrunler.splice(secUrunler.indexOf(u.kod), 1); } }), h('span.small', { text: u.kod + ' — ' + u.ad })]);
        })));
      } else {
        kisitEl.appendChild(h('div.small.muted', { text: 'Bayi, siparişe açık tüm ürünleri görür.' }));
      }
    }
    kisitCiz();

    function kaydet() {
      JP.tx(function (d) {
        var p = d.bayiler.find(function (x) { return x.kod === b.kod; });
        p.siparisAcik = acik.checked && p.logoAktif;
        p.teslimatNotu = not.value;
        p.kisit = { tip: tip, gruplar: secGrup, urunler: secUrunler };
      });
      UI.toast('Bayi kaydedildi', b.unvan, 'ok');
    }

    return h('div.stack', {}, [
      h('div.grid.k2', {}, [
        UI.panel('Logo alanları', h('span.small.muted', { text: 'Salt okunur' }),
          h('dl.kv', {}, [
            h('dt', { text: 'Cari kodu' }), h('dd.mono', { text: b.kod }),
            h('dt', { text: 'Unvan' }), h('dd', { text: b.unvan }),
            h('dt', { text: 'Şehir / ülke' }), h('dd', { text: b.sehir + ' / ' + b.ulke }),
            h('dt', { text: 'E-posta' }), h('dd', { text: b.eposta }),
            h('dt', { text: 'Durum' }), h('dd', {}, b.logoAktif ? UI.rozet('Aktif', 'ok') : UI.rozet('Pasif', 'warn'))
          ])),
        UI.panel('Portal alanları', h('span.small.muted', { text: 'Düzenlenebilir' }), h('div.stack', {}, [
          h('label.chk', {}, [acik, h('span', { text: 'Siparişe açık — kapalı bayi giriş yapar, yeni talep oluşturamaz' })]),
          h('label.f', {}, ['Varsayılan teslimat notu', not])
        ]))
      ]),
      UI.panel('Sipariş verebileceği ürünler', h('span.small.muted', { text: kisitMetni(b) }), kisitEl),
      h('div.row', {}, [h('div.spacer'), h('button.btn.primary', { text: 'Kaydet', onclick: kaydet })])
    ]);
  }

  function bayiTalepler(liste) {
    return UI.panel('Talep geçmişi', h('span.small.muted', { text: liste.length + ' talep' }),
      UI.tablo(['Tarih', 'Talep no', 'Durum', { t: 'Kalem', num: true }, 'Sevkiyat', ''],
        liste.map(function (t) {
          var s = sevkSayim(JP.talepKalemDurum(t), 'talep', 'fatura');
          return h('tr', { style: { cursor: 'pointer' }, onclick: function () { secBayi = null; talepAc(t.no); } }, [
            h('td.small.nowrap', { text: JP.fmt.tarih(t.tarih) }),
            h('td.mono', { text: t.no }),
            h('td', {}, UI.rozet(JP.talepDurumu(t))),
            h('td.num.mono', { text: String(s.toplam) }),
            h('td', {}, ilerleme(s)),
            h('td.right', {}, h('button.btn.ghost.sm', { text: 'Detay', onclick: function (e) { e.stopPropagation(); secBayi = null; talepAc(t.no); } }))
          ]);
        }), 'Bu bayinin talebi yok.'), true);
  }

  function bayiSiparisler(liste) {
    return UI.panel('Sipariş geçmişi', h('span.small.muted', { text: liste.length + ' sipariş' }),
      UI.tablo(['Tarih', 'Sipariş no', 'Durum', 'Logo fiş', { t: 'Kalem', num: true }, 'Sevkiyat', ''],
        liste.map(function (s) {
          var sy = sevkSayim(JP.siparisKalemDurum(s), 'logoMiktar', 'sevk');
          return h('tr', { style: { cursor: 'pointer' }, onclick: function () { secBayi = null; siparisAc(s.no); } }, [
            h('td.small.nowrap', { text: JP.fmt.tarih(s.tarih) }),
            h('td.mono', { text: s.no }),
            h('td', {}, UI.rozet(s.durum)),
            h('td.mono.small', { text: s.logoFisNo || '—' }),
            h('td.num.mono', { text: String(sy.toplam) }),
            h('td', {}, ilerleme(sy)),
            h('td.right', {}, h('button.btn.ghost.sm', { text: 'Detay', onclick: function (e) { e.stopPropagation(); secBayi = null; siparisAc(s.no); } }))
          ]);
        }), 'Bu bayinin siparişi yok.'), true);
  }

  /* ----------------------------------------------- kullanıcılar: liste + ekran
   * Portal hesapları yalnızca buradan açılır. Bayi tarafında kayıt formu yoktur;
   * kullanıcı davet bağlantısıyla gelir ve tek bir cari karta bağlıdır. */
  function kullaniciAc(id) { secKullanici = id; kabuk.git('kullanicilar'); }

  function kullaniciSuz() {
    var q = kucult(fKullanici.ara).trim();
    return JP.kullanicilar().filter(function (k) {
      if (fKullanici.bayiKod && k.bayiKod !== fKullanici.bayiKod) return false;
      if (fKullanici.durum && k.durum !== fKullanici.durum) return false;
      if (!q) return true;
      return kucult(k.ad + ' ' + k.eposta + ' ' + bayiAd(k.bayiKod) + ' ' + k.bayiKod).indexOf(q) >= 0;
    });
  }

  function durumRozeti(d) {
    return UI.rozet(d, d === 'Aktif' ? 'ok' : (d === 'Davet gönderildi' ? 'warn' : ''));
  }

  function kullanicilar() {
    var db = JP.db;
    if (secKullanici) {
      var k = JP.kullanici(secKullanici);
      if (k) return kullaniciEkrani(k);
      secKullanici = null;
    }

    var liste = kullaniciSuz();
    var govde = h('div');
    function tabloCiz() {
      govde.textContent = '';
      govde.appendChild(UI.panel(null, null, UI.tablo(
        ['Ad soyad', 'E-posta', 'Bayi', 'Rol', 'Durum', 'Son giriş', ''],
        liste.map(function (k) {
          return h('tr', { style: { cursor: 'pointer' }, onclick: function () { kullaniciAc(k.id); } }, [
            h('td', { text: k.ad, style: { fontWeight: '500' } }),
            h('td.small.mono', { text: k.eposta }),
            h('td.small', { text: bayiAd(k.bayiKod) }),
            h('td.small.muted', { text: JP.rolAdi(k.rol) }),
            h('td', {}, durumRozeti(k.durum)),
            h('td.small.muted.nowrap', { text: k.sonGiris ? JP.fmt.tarih(k.sonGiris) : '—' }),
            h('td.right', {}, h('button.btn.ghost.sm', { text: 'Detay', onclick: function (e) { e.stopPropagation(); kullaniciAc(k.id); } }))
          ]);
        }), db.kullanicilar && db.kullanicilar.length ? 'Filtreye uyan kullanıcı yok.' : 'Henüz kullanıcı tanımlanmadı.'), true));
    }
    function yenile(yerinde) {
      liste = kullaniciSuz();
      sayimEl.textContent = liste.length + ' / ' + JP.kullanicilar().length + ' kullanıcı';
      if (yerinde) tabloCiz(); else kabuk.ciz();
    }
    var sayimEl = h('span.small.muted', { text: liste.length + ' / ' + JP.kullanicilar().length + ' kullanıcı' });
    tabloCiz();

    return h('div.stack', {}, [
      h('div.filtre', {}, [
        h('label.f.filtre-alan', {}, ['Ara', h('input.filtre-ara', {
          type: 'text', value: fKullanici.ara, placeholder: 'Ad, e-posta veya bayi ara…',
          oninput: function (e) { fKullanici.ara = e.target.value; yenile(true); } })]),
        h('label.f.filtre-alan', {}, ['Bayi', h('select', { onchange: function (e) { fKullanici.bayiKod = e.target.value; yenile(); } },
          [h('option', { value: '', text: 'Tümü', selected: !fKullanici.bayiKod })].concat(
            db.bayiler.map(function (b) { return h('option', { value: b.kod, selected: fKullanici.bayiKod === b.kod, text: b.unvan }); })))]),
        h('label.f.filtre-alan', {}, ['Durum', h('select', { onchange: function (e) { fKullanici.durum = e.target.value; yenile(); } },
          [h('option', { value: '', text: 'Tümü', selected: !fKullanici.durum })].concat(
            JP.KULLANICI_DURUM.map(function (d) { return h('option', { value: d, selected: fKullanici.durum === d, text: d }); })))]),
        h('div.filtre-son', {}, [
          sayimEl,
          h('button.btn.primary.sm', { text: 'Kullanıcı ekle', onclick: function () { kullaniciEkleKip(fKullanici.bayiKod); } })
        ])
      ]),
      govde
    ]);
  }

  function kullaniciEkleKip(bayiKod) {
    var db = JP.db;
    if (!db.bayiler.length) { UI.hata(new Error('Önce Logo’dan bayileri çekin.')); return; }
    var ad = h('input', { type: 'text', placeholder: 'Ad Soyad' });
    var eposta = h('input', { type: 'text', placeholder: 'ad.soyad@bayi.example', inputmode: 'email' });
    var bayiSec = h('select', {}, db.bayiler.map(function (b) {
      return h('option', { value: b.kod, selected: b.kod === bayiKod, text: b.unvan + ' (' + b.kod + ')' });
    }));
    var rolSec = h('select', {}, JP.ROLLER.map(function (r) { return h('option', { value: r.kod, text: r.ad }); }));
    var dilSec = h('select', {}, [h('option', { value: 'tr', text: 'Türkçe' }), h('option', { value: 'en', text: 'İngilizce' })]);
    var rolNot = h('div.small.muted', { text: JP.ROLLER[0].aciklama });
    rolSec.addEventListener('change', function () {
      var r = JP.ROLLER.find(function (x) { return x.kod === rolSec.value; });
      rolNot.textContent = r ? r.aciklama : '';
    });

    UI.modal({ etiket: 'Davet bağlantısı gönderilir',
      icerik: h('div.stack', {}, [
        h('div.grid.k2', {}, [
          h('label.f', {}, ['Ad soyad', ad]),
          h('label.f', {}, ['E-posta', eposta]),
          h('label.f', {}, ['Bağlı bayi', bayiSec]),
          h('label.f', {}, ['Dil tercihi', dilSec])
        ]),
        h('label.f', {}, ['Rol', rolSec]),
        rolNot,
        h('div.note', { text: 'Hesap “Davet gönderildi” durumunda oluşur. Kullanıcı davet bağlantısından şifresini belirleyip giriş yapınca “Aktif” olur.' })
      ]),
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', { text: 'Oluştur ve davet gönder',
            onclick: function () {
              UI.dene(function () {
                var k = JP.kullaniciEkle({ ad: ad.value, eposta: eposta.value, bayiKod: bayiSec.value, rol: rolSec.value, dil: dilSec.value });
                kapat(); UI.toast('Kullanıcı oluşturuldu', k.eposta + ' adresine davet gönderildi.', 'ok');
                kullaniciAc(k.id);
              });
            } })
        ];
      }
    });
  }

  function kullaniciEkrani(k) {
    var db = JP.db;
    var bayi = db.bayiler.find(function (b) { return b.kod === k.bayiKod; }) || { unvan: k.bayiKod, kod: k.bayiKod, siparisAcik: false };
    var ad = h('input', { type: 'text', value: k.ad });
    var eposta = h('input', { type: 'text', value: k.eposta, inputmode: 'email' });
    var bayiSec = h('select', {}, db.bayiler.map(function (b) { return h('option', { value: b.kod, selected: b.kod === k.bayiKod, text: b.unvan + ' (' + b.kod + ')' }); }));
    var rolSec = h('select', {}, JP.ROLLER.map(function (r) { return h('option', { value: r.kod, selected: r.kod === k.rol, text: r.ad }); }));
    var dilSec = h('select', {}, [
      h('option', { value: 'tr', selected: k.dil === 'tr', text: 'Türkçe' }),
      h('option', { value: 'en', selected: k.dil === 'en', text: 'İngilizce' })
    ]);
    var yetki = JP.talepYetkisi(k);

    function kaydet() {
      UI.dene(function () {
        JP.kullaniciGuncelle(k.id, { ad: ad.value, eposta: eposta.value, bayiKod: bayiSec.value, rol: rolSec.value, dil: dilSec.value });
        UI.toast('Kullanıcı kaydedildi', ad.value, 'ok');
      });
    }

    return h('div.stack', {}, [
      h('div.row', {}, [
        h('button.btn.ghost.sm', { text: '← Kullanıcı listesi', onclick: function () { secKullanici = null; kabuk.ciz(); } }),
        h('div.spacer'),
        h('button.btn.sm', { text: 'Daveti yeniden gönder',
          onclick: function () { UI.dene(function () { JP.kullaniciDavet(k.id); UI.toast('Davet gönderildi', k.eposta, 'ok'); }); } }),
        h('button.btn.sm', { text: 'Şifre sıfırlama gönder',
          onclick: function () { UI.dene(function () { JP.kullaniciDavet(k.id, 'sifre'); UI.toast('Bağlantı gönderildi', k.eposta, 'ok'); }); } }),
        k.durum === 'Pasif'
          ? h('button.btn.sm', { text: 'Aktife al', onclick: function () { UI.dene(function () { JP.kullaniciDurum(k.id, 'Aktif'); UI.toast('Hesap aktif', k.ad, 'ok'); }); } })
          : h('button.btn.sm', { text: 'Pasife al', onclick: function () { UI.onay('Hesabı pasife al', k.ad + ' portala giriş yapamayacak. Talep ve sipariş kayıtları korunur.', function () { JP.kullaniciDurum(k.id, 'Pasif'); }, true); } }),
        h('button.btn.ghost.sm.danger', { text: 'Sil',
          onclick: function () { UI.onay('Kullanıcıyı sil', k.ad + ' silinecek. Oluşturduğu talepler kayıtta kalır.', function () { JP.kullaniciSil(k.id); secKullanici = null; kabuk.ciz(); UI.toast('Kullanıcı silindi', k.ad, 'ok'); }, true); } }),
        h('button.btn.primary', { text: 'Kaydet', onclick: kaydet })
      ]),

      UI.panel(null, null, h('div.row', {}, [
        h('span.avatar', { text: basHarf(k.ad) }),
        h('h2', { text: k.ad }),
        durumRozeti(k.durum),
        h('span.tag', { text: JP.rolAdi(k.rol) }),
        h('button.btn.ghost.sm', { text: bayi.unvan, onclick: function () { secKullanici = null; bayiAc(k.bayiKod); } }),
        h('span.small.muted', { text: k.eposta })
      ])),

      !yetki.olur ? h('div.note.warn', { text: 'Bu kullanıcı şu anda talep oluşturamaz: ' + yetki.sebep }) : null,

      h('div.grid.k2', {}, [
        UI.panel('Hesap bilgileri', h('span.small.muted', { text: 'Düzenlenebilir' }), h('div.stack', {}, [
          h('div.grid.k2', {}, [
            h('label.f', {}, ['Ad soyad', ad]),
            h('label.f', {}, ['E-posta (giriş adresi)', eposta])
          ]),
          h('div.grid.k2', {}, [
            h('label.f', {}, ['Bağlı bayi', bayiSec]),
            h('label.f', {}, ['Dil tercihi', dilSec])
          ]),
          h('label.f', {}, ['Rol', rolSec]),
          h('div.small.muted', { text: (JP.ROLLER.find(function (r) { return r.kod === k.rol; }) || {}).aciklama || '' })
        ])),
        UI.panel('Hesap durumu', null, h('div.stack', {}, [
          h('dl.kv', {}, [
            h('dt', { text: 'Durum' }), h('dd', {}, durumRozeti(k.durum)),
            h('dt', { text: 'Oluşturuldu' }), h('dd', { text: JP.fmt.saat(k.olusturuldu) }),
            h('dt', { text: 'Son davet' }), h('dd', { text: k.davetTs ? JP.fmt.saat(k.davetTs) : '—' }),
            h('dt', { text: 'Son giriş' }), h('dd', { text: k.sonGiris ? JP.fmt.saat(k.sonGiris) : 'Henüz giriş yapmadı' }),
            h('dt', { text: 'Bayi durumu' }), h('dd', {}, bayi.siparisAcik ? UI.rozet('Siparişe açık', 'ok') : UI.rozet('Siparişe kapalı', 'warn'))
          ]),
          h('div.small.muted', { text: 'Gerçek kurulumda kimlik doğrulama ASP.NET Core Identity ile yapılır: davet bağlantısı, şifre politikası, hesap kilitleme ve opsiyonel iki adımlı doğrulama.' })
        ]))
      ]),

      UI.panel('Bu kullanıcının oluşturduğu talepler', null,
        UI.tablo(['Tarih', 'Talep no', 'Durum', { t: 'Kalem', num: true }, ''],
          db.talepler.filter(function (t) { return t.kullanici === k.id || t.bayiKod === k.bayiKod; }).slice(0, 12).map(function (t) {
            return h('tr', { style: { cursor: 'pointer' }, onclick: function () { secKullanici = null; talepAc(t.no); } }, [
              h('td.small.nowrap', { text: JP.fmt.tarih(t.tarih) }),
              h('td.mono', { text: t.no }),
              h('td', {}, UI.rozet(JP.talepDurumu(t))),
              h('td.num.mono', { text: String(t.kalemler.length) }),
              h('td.right', {}, h('button.btn.ghost.sm', { text: 'Detay', onclick: function (e) { e.stopPropagation(); secKullanici = null; talepAc(t.no); } }))
            ]);
          }), 'Bu bayiden henüz talep gelmedi.'), true)
    ]);
  }

  function basHarf(ad) {
    return (ad || '?').split(/\s+/).slice(0, 2).map(function (p) { return p[0]; }).join('').toLocaleUpperCase('tr');
  }

  function bayiKullanicilar(b, liste) {
    return UI.panel('Portal kullanıcıları', h('div.row.tight', {}, [
      h('span.small.muted', { text: liste.length + ' kullanıcı' }),
      h('button.btn.primary.sm', { text: 'Kullanıcı ekle', onclick: function () { kullaniciEkleKip(b.kod); } })
    ]), UI.tablo(['Ad soyad', 'E-posta', 'Rol', 'Durum', 'Son giriş', ''],
      liste.map(function (k) {
        return h('tr', { style: { cursor: 'pointer' }, onclick: function () { secBayi = null; kullaniciAc(k.id); } }, [
          h('td', { text: k.ad, style: { fontWeight: '500' } }),
          h('td.small.mono', { text: k.eposta }),
          h('td.small.muted', { text: JP.rolAdi(k.rol) }),
          h('td', {}, durumRozeti(k.durum)),
          h('td.small.muted.nowrap', { text: k.sonGiris ? JP.fmt.tarih(k.sonGiris) : '—' }),
          h('td.right', {}, h('button.btn.ghost.sm', { text: 'Detay', onclick: function (e) { e.stopPropagation(); secBayi = null; kullaniciAc(k.id); } }))
        ]);
      }), 'Bu bayiye henüz kullanıcı tanımlanmadı.'), true);
  }

})();
