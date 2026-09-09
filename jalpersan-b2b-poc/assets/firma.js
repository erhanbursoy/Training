/* Firma paneli — Logo senkronu, ürün/bayi ek alanları, talep→sipariş dönüşümü,
   talep havuzu ve raporlar. (Teknik doküman 3.1–3.8) */
(function () {
  'use strict';
  var JP = window.JP, UI = JP.UI, h = UI.h;

  JP.firmaEkran = function () {
    UI.kabuk({
      rol: 'firma', rolAdi: 'Firma paneli', baslik: 'Firma paneli', altBaslik: 'Muhasebe ve yönetim',
      railBaslik: 'Yönetim',
      ustSag: function () {
        return h('div.row.tight', {}, [
          h('button.btn.sm', { text: 'Demoyu baştan başlat', title: 'Portal tarafını boşaltır; Logo kartları kalır.', onclick: demoSifirla }),
          h('button.btn.sm', { text: 'Örnek veriye dön', onclick: function () { UI.onay('Örnek veriye dön', 'Tüm PoC verisi silinip başlangıç örneğine dönülür.', function () { JP.sifirla(false); UI.toast('Örnek veri yüklendi', null, 'ok'); }, true); } })
        ]);
      },
      bolumler: [
        { id: 'panel', ad: 'Panel', baslik: 'Panel', aciklama: 'Logo sorguları elle tetiklenir; her sorgunun son çalışma bilgisi burada durur.', ciz: panel },
        { id: 'talepler', ad: 'Gelen talepler', baslik: 'Gelen satın alma talepleri',
          aciklama: 'Kalem kalem seçim yapıp kısmi miktarla sipariş oluşturun. Kalan miktar havuzda açık kalır.',
          ciz: gelenTalepler,
          sayi: function () { return JP.db.talepler.filter(bekleyen).length; },
          sicak: function () { return JP.db.talepler.filter(bekleyen).length > 0; } },
        { id: 'siparisler', ad: 'Siparişler', baslik: 'Siparişler',
          aciklama: "Logo'ya gönderim ve durum sorgusu. Sipariş önce portalda kaydedilir, sonra iletilir; hiçbir sipariş kaybolmaz.",
          ciz: siparisler, sayi: function () { return JP.db.siparisler.length; } },
        { id: 'havuz', ad: 'Talep havuzu', baslik: 'Talep havuzu ve hareket defteri',
          aciklama: 'Bakiye saklanmaz; dTalep / dRezerv / dFatura hareketlerinden hesaplanır.',
          ciz: havuz },
        { id: 'urunler', ad: 'Ürünler', baslik: 'Ürünler', aciklama: 'Logo alanları salt okunur; siparişe açık/kapalı, açıklama ve katalog sırası portalda yönetilir.', ciz: urunler,
          sayi: function () { return JP.db.urunler.length; } },
        { id: 'bayiler', ad: 'Bayiler', baslik: 'Bayiler', aciklama: 'Siparişe açık/kapalı ve sipariş verebileceği ürün listesi portalda tutulur.', ciz: bayiler,
          sayi: function () { return JP.db.bayiler.length; } },
        { id: 'raporlar', ad: 'Raporlar', baslik: 'Raporlar', aciklama: 'Açık talep, eşleşme kalitesi ve sipariş takibi. Tablolar Excel’e kopyalanabilir.', ciz: raporlar },
        { id: 'gunluk', ad: 'Entegrasyon günlüğü', baslik: 'Entegrasyon günlüğü', aciklama: 'Tüm Logo çağrıları ve portal olayları.', ciz: gunluk }
      ]
    });
  };

  function bekleyen(t) { var d = JP.talepDurumu(t); return d === 'Açık' || d === 'Kısmen Karşılandı'; }
  function bayiAd(kod) { var b = JP.db.bayiler.find(function (x) { return x.kod === kod; }); return b ? b.unvan : kod; }
  function urunAd(kod) { var u = JP.db.urunler.find(function (x) { return x.kod === kod; }); return u ? u.ad : kod; }

  function demoSifirla() {
    UI.onay('Demoyu baştan başlat',
      'Portal tarafı (ürün, bayi, talep, sipariş, havuz) boşaltılır. Logo simülatöründeki stok ve cari kartlar kalır, böylece senaryoya 1. adımdan başlayabilirsiniz.',
      function () { JP.sifirla(true); UI.toast('Demo sıfırlandı', 'Sıradaki adım: “Ürünleri Logo’dan al”.', 'ok'); }, true);
  }

  /* ------------------------------------------------------------------ panel */
  function panel() {
    var db = JP.db;
    var acikTalep = db.talepler.filter(bekleyen).length;
    var acikSiparis = db.siparisler.filter(function (s) { return s.durum === "Logo'ya İletildi" || s.durum === 'Faturalandı'; }).length;
    var hatali = db.siparisler.filter(function (s) { return s.durum === 'Gönderim Hatası'; }).length;
    var havuzTop = JP.havuzOzet({}).reduce(function (t, r) { return t + r.acik; }, 0);
    var eslesmeyen = db.talepDisi.filter(function (t) { return !t.cozuldu; }).length;

    var kap = h('div.stack');

    if (!db.urunler.length || !db.bayiler.length) {
      kap.appendChild(h('div.note.warn', { html: '<b>Portal ana verisi boş.</b> Önce “Ürünleri Logo’dan al” ve “Bayileri Logo’dan al” düğmelerini çalıştırın — ana veri sahibi Logo’dur.' }));
    }
    if (hatali) kap.appendChild(h('div.note.bad', { html: '<b>' + hatali + ' sipariş gönderim hatasında.</b> Siparişler ekranından yeniden gönderin; kayıt portalda korunuyor.' }));
    if (eslesmeyen) kap.appendChild(h('div.note.warn', { html: '<b>' + eslesmeyen + ' talep dışı fatura satırı var.</b> Talep havuzu ekranından elle bağlayın veya öyle bırakın.' }));

    kap.appendChild(h('div.grid.k4', {}, [
      UI.kpi('Bekleyen talep', acikTalep, null, 'Siparişe dönmeyi bekliyor'),
      UI.kpi('Açık sipariş', acikSiparis, null, "Logo'da faturalanmayı bekliyor"),
      UI.kpi('Havuzda açık', JP.fmt.miktar(havuzTop), 'birim', 'Talep − siparişte − faturalanan', true),
      UI.kpi('Eşleşmeyen fatura', eslesmeyen, null, 'Talep dışı fatura listesi')
    ]));

    function senkronKart(baslik, aciklama, sonuc, etiket, fn) {
      return h('div.panel', {}, h('div.panel-body', {}, h('div.stack', {}, [
        h('div', {}, [h('h3', { text: baslik }), h('div.small.muted', { text: aciklama })]),
        h('div.row', {}, [
          h('button.btn.primary.sm', { text: etiket, onclick: function () { UI.dene(fn); } }),
          h('div.spacer'), UI.senkronBilgi(sonuc)
        ])
      ])));
    }

    kap.appendChild(h('div.grid.k2', {}, [
      senkronKart('Stok kartları', 'LG_025_ITEMS — kod, ad, birim, grup, aktiflik. Portal ek alanları korunur.',
        db.senkron.urun, "Ürünleri Logo'dan al", function () {
          var r = JP.logoUrunleriCek();
          UI.toast('Ürünler güncellendi', r.toplam + ' kart okundu · ' + r.yeni + ' yeni, ' + r.guncel + ' değişti.', 'ok');
        }),
      senkronKart('Cari kartlar', 'LG_025_CLCARD — kod, unvan, ülke, aktiflik. Bayi ek alanları korunur.',
        db.senkron.cari, "Bayileri Logo'dan al", function () {
          var r = JP.logoBayileriCek();
          UI.toast('Bayiler güncellendi', r.toplam + ' kart okundu · ' + r.yeni + ' yeni, ' + r.guncel + ' değişti.', 'ok');
        }),
      senkronKart('Sipariş ve fatura durumu', 'ORFICHE / INVOICE + e-Fatura durum tabloları. Yalnızca açık siparişler sorgulanır.',
        db.senkron.siparis, 'Tüm açık siparişleri sorgula', function () {
          var r = JP.durumSorgula();
          UI.toast('Sorgu tamamlandı',
            r.okunanFis + ' fiş okundu · ' + (r.miktarDegisimi + r.faturaHareketi + r.fifo) + ' hareket yazıldı · ' +
            r.atlanan + ' mükerrer atlandı' + (r.kapanan ? ' · ' + r.kapanan + ' sipariş kapandı' : ''), 'ok');
        }),
      h('div.panel', {}, h('div.panel-body', {}, h('div.stack', {}, [
        h('div', {}, [h('h3', { text: 'Son bildirimler' }), h('div.small.muted', { text: 'Portalın gönderdiği e-posta bildirimleri (simülasyon).' })]),
        db.bildirim.length
          ? h('div.stack', { style: { gap: '6px' } }, db.bildirim.slice(0, 4).map(function (b) {
              return h('div.small', {}, [h('b', { text: b.baslik + ' — ' }), h('span.muted', { text: b.metin })]);
            }))
          : h('div.small.muted', { text: 'Bildirim yok.' })
      ])))
    ]));

    return kap;
  }

  /* ---------------------------------------------------- 3.5 talep → sipariş */
  function gelenTalepler() {
    var db = JP.db;
    var liste = db.talepler.filter(function (t) { return !t.iptal; });
    if (!liste.length) return h('div.empty', { text: 'Bekleyen satın alma talebi yok.' });

    return h('div.stack', {}, liste.map(function (t) {
      var durum = JP.talepDurumu(t);
      var kalemler = JP.talepKalemDurum(t);
      var donusturulebilir = kalemler.some(function (k) { return k.donusturulebilir > 0.001; });
      return UI.panel(null, null, h('div.stack', {}, [
        h('div.row', {}, [
          h('span.mono', { text: t.no, style: { fontWeight: '600' } }),
          UI.rozet(durum),
          h('span', { text: bayiAd(t.bayiKod) }),
          h('span.small.muted', { text: JP.fmt.tarih(t.tarih) + ' · ' + JP.gunFark(t.tarih) + ' gün' }),
          h('div.spacer'),
          h('button.btn.primary.sm', { text: 'Siparişe dönüştür', disabled: !donusturulebilir, onclick: function () { donusumKip(t); } })
        ]),
        t.not ? h('div.small.muted', { text: '“' + t.not + '”' }) : null,
        UI.tablo(['Ürün', { t: 'Talep', num: true }, { t: 'Siparişte', num: true }, { t: 'Faturalanan', num: true }, { t: 'Dönüştürülebilir', num: true }, 'Dağılım'],
          kalemler.map(function (k) {
            return h('tr', {}, [
              h('td', {}, [h('div', { text: k.urun.ad }), h('div.pc.mono', { text: k.kalem.urunKod })]),
              h('td.num.mono', { text: JP.fmt.miktar(k.talep) }),
              h('td.num.mono', { text: JP.fmt.miktar(k.rezerv) }),
              h('td.num.mono', { text: JP.fmt.miktar(k.fatura) }),
              h('td.num.mono', { text: JP.fmt.miktar(k.donusturulebilir), style: { color: k.donusturulebilir > 0 ? 'var(--warn)' : 'var(--text-3)' } }),
              h('td', { style: { width: '140px' } }, UI.bant(k))
            ]);
          }))
      ]));
    }));
  }

  function donusumKip(t) {
    var kalemler = JP.talepKalemDurum(t).filter(function (k) { return k.donusturulebilir > 0.001; });
    var secim = {};
    kalemler.forEach(function (k) { secim[k.kalem.id] = { dahil: true, miktar: k.donusturulebilir }; });
    var ozet = h('div.small.muted');

    function ozetGuncelle() {
      var n = 0, m = 0;
      kalemler.forEach(function (k) { var s = secim[k.kalem.id]; if (s.dahil && s.miktar > 0) { n++; m += s.miktar; } });
      ozet.textContent = n + ' kalem · ' + JP.fmt.miktar(m) + ' birim siparişe dönecek. Kalan miktar havuzda açık kalır.';
    }

    var satirlar = kalemler.map(function (k) {
      var mik = h('input.qty', {
        type: 'number', min: '0', max: String(k.donusturulebilir), step: '10', value: String(k.donusturulebilir),
        oninput: function (e) { secim[k.kalem.id].miktar = parseFloat(e.target.value) || 0; ozetGuncelle(); }
      });
      var kutu = h('input', {
        type: 'checkbox', checked: true,
        onchange: function (e) { secim[k.kalem.id].dahil = e.target.checked; mik.disabled = !e.target.checked; ozetGuncelle(); }
      });
      return h('tr', {}, [
        h('td', {}, h('label.chk', {}, [kutu, h('span', { text: k.urun.ad })])),
        h('td.mono.small', { text: k.kalem.urunKod }),
        h('td.num.mono', { text: JP.fmt.miktar(k.talep) }),
        h('td.num.mono', { text: JP.fmt.miktar(k.donusturulebilir) }),
        h('td', {}, h('div.row.tight', {}, [mik, h('span.small.muted', { text: k.urun.birim })]))
      ]);
    });
    ozetGuncelle();

    UI.modal({
      baslik: 'Satın alma talebini siparişe dönüştür', etiket: t.no + ' · ' + bayiAd(t.bayiKod), genis: true,
      icerik: h('div.stack', {}, [
        UI.tablo(['Kalem', 'Kod', { t: 'Talep', num: true }, { t: 'Açık', num: true }, 'Sipariş miktarı'], satirlar),
        ozet,
        h('div.note', { text: 'Sipariş portalda “Taslak” olarak oluşur ve havuzda rezerv hareketi yazılır. Logo’ya gönderim ayrı bir adımdır.' })
      ]),
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', {
            text: 'Sipariş oluştur',
            onclick: function () {
              UI.dene(function () {
                var s = JP.siparisOlustur(t.bayiKod, kalemler.filter(function (k) { return secim[k.kalem.id].dahil; })
                  .map(function (k) { return { talepNo: t.no, kalemId: k.kalem.id, miktar: secim[k.kalem.id].miktar }; }), 'muhasebe');
                kapat();
                UI.toast('Sipariş oluşturuldu', s.no + ' · Siparişler ekranından Logo’ya gönderin.', 'ok');
              });
            }
          })
        ];
      }
    });
  }

  /* ------------------------------------------------------------- siparişler */
  function siparisler() {
    var db = JP.db;
    if (!db.siparisler.length) return h('div.empty', { text: 'Henüz sipariş yok. Gelen talepler ekranından oluşturun.' });

    return h('div.stack', {}, [
      h('div.row', {}, [
        h('button.btn.primary', {
          text: 'Sipariş ve fatura durumunu sorgula',
          onclick: function () {
            UI.dene(function () {
              var r = JP.durumSorgula();
              UI.toast('Sorgu tamamlandı',
                r.okunanFis + ' fiş · ' + r.miktarDegisimi + ' miktar değişimi · ' + (r.faturaHareketi + r.fifo) + ' fatura hareketi · ' +
                r.eslesmeyen + ' eşleşmeyen · ' + r.atlanan + ' mükerrer atlandı', 'ok');
            });
          }
        }),
        UI.senkronBilgi(db.senkron.siparis)
      ]),
      h('div.stack', {}, db.siparisler.map(siparisKarti))
    ]);
  }

  function siparisKarti(s) {
    var db = JP.db;
    var fis = db.logo.fisler.find(function (f) { return f.portalRef === s.logoRef; });
    var faturalar = fis ? db.logo.faturalar.filter(function (f) { return f.fisNo === fis.fisNo; }) : [];
    var toplam = s.kalemler.reduce(function (t, k) { return t + k.logoMiktar; }, 0);
    var fat = s.kalemler.reduce(function (t, k) { return t + k.faturalanan; }, 0);

    return UI.panel(null, null, h('div.stack', {}, [
      h('div.row', {}, [
        h('span.mono', { text: s.no, style: { fontWeight: '600' } }),
        UI.rozet(s.durum),
        h('span', { text: bayiAd(s.bayiKod) }),
        s.logoFisNo ? h('span.tag', { text: 'Logo fiş ' + s.logoFisNo }) : null,
        h('span.tag', { text: 'ref ' + s.logoRef }),
        h('div.spacer'),
        (s.durum === 'Taslak' || s.durum === 'Gönderim Hatası') ? h('button.btn.primary.sm', {
          text: s.durum === 'Gönderim Hatası' ? 'Yeniden gönder' : "Logo'ya gönder",
          onclick: function () { UI.dene(function () { JP.siparisLogoyaGonder(s.no); UI.toast('Logo’ya iletildi', 'Fiş numarası siparişe yazıldı.', 'ok'); }); }
        }) : null,
        s.durum === 'Taslak' ? h('button.btn.ghost.sm', {
          text: 'Gönderim hatası simüle et',
          onclick: function () { UI.dene(function () { JP.siparisLogoyaGonder(s.no, true); UI.toast('Gönderim başarısız', 'Sipariş portalda korunuyor, yeniden denenebilir.', 'bad'); }); }
        }) : null,
        (s.durum !== 'Tamamlandı' && s.durum !== 'İptal') ? h('button.btn.ghost.sm', {
          text: 'Durum sorgula', onclick: function () { UI.dene(function () { JP.durumSorgula(s.no); UI.toast('Sorgulandı', s.no, 'ok'); }); }
        }) : null,
        (s.durum !== 'Tamamlandı' && s.durum !== 'İptal') ? h('button.btn.ghost.sm', {
          text: 'İptal', onclick: function () { UI.onay('Siparişi iptal et', s.no + ' iptal edilecek ve rezerv havuzda çözülecek. Logo fişi elle iptal edilmelidir.', function () { JP.siparisIptal(s.no); UI.toast('Sipariş iptal edildi', null, 'ok'); }, true); }
        }) : null
      ]),
      s.hataMetni ? h('div.note.bad', { text: s.hataMetni }) : null,
      UI.tablo(['Ürün', 'Talep', { t: 'Sipariş', num: true }, { t: "Logo'daki miktar", num: true }, { t: 'Faturalanan', num: true }, { t: 'Kalan', num: true }],
        s.kalemler.map(function (k) {
          var degisti = Math.abs(k.logoMiktar - k.miktar) > 0.001;
          return h('tr', {}, [
            h('td', {}, [h('div', { text: urunAd(k.urunKod) }), h('div.pc.mono', { text: k.urunKod })]),
            h('td.mono.small', { text: k.talepNo }),
            h('td.num.mono', { text: JP.fmt.miktar(k.miktar) }),
            h('td.num.mono', { text: JP.fmt.miktar(k.logoMiktar), style: degisti ? { color: 'var(--warn)', fontWeight: '600' } : null,
              title: degisti ? 'Logo’da değiştirildi; rezerv havuzda düzeltildi.' : '' }),
            h('td.num.mono', { text: JP.fmt.miktar(k.faturalanan) }),
            h('td.num.mono', { text: JP.fmt.miktar(Math.max(0, k.logoMiktar - k.faturalanan)) })
          ]);
        })),
      h('div.row.small.muted', {}, [
        h('span', { text: 'Faturalanan ' + JP.fmt.miktar(fat) + ' / ' + JP.fmt.miktar(toplam) + ' birim' }),
        faturalar.length ? h('span', { text: '·' }) : null,
        faturalar.length ? h('div.row.tight', {}, faturalar.map(function (f) {
          return h('span.tag', { title: 'GİB: ' + f.gib, text: f.no + ' · ' + f.gib });
        })) : null
      ])
    ]));
  }

  /* ------------------------------------------------------ 3.6 talep havuzu */
  var havuzFiltre = { bayiKod: '', sadeceAcik: false };

  function havuz() {
    var db = JP.db;
    var satirlar = JP.havuzOzet(havuzFiltre);
    var eslesmeyen = db.talepDisi.filter(function (t) { return !t.cozuldu; });
    var hs = db.havuz.filter(function (x) { return !havuzFiltre.bayiKod || x.bayiKod === havuzFiltre.bayiKod; })
      .sort(function (a, b) { return b.ts.localeCompare(a.ts); }).slice(0, 250);
    var top = satirlar.reduce(function (t, r) { t.talep += r.talep; t.rezerv += r.rezerv; t.fatura += r.fatura; t.acik += r.acik; return t; },
      { talep: 0, rezerv: 0, fatura: 0, acik: 0 });

    return h('div.stack', {}, [
      h('div.row', {}, [
        h('select', { style: { width: 'auto' }, onchange: function (e) { havuzFiltre.bayiKod = e.target.value; JP.tx(function () {}); } },
          [h('option', { value: '', text: 'Tüm bayiler', selected: !havuzFiltre.bayiKod })].concat(
            db.bayiler.map(function (b) { return h('option', { value: b.kod, selected: havuzFiltre.bayiKod === b.kod, text: b.unvan }); }))),
        h('label.chk', {}, [h('input', { type: 'checkbox', checked: havuzFiltre.sadeceAcik, onchange: function (e) { havuzFiltre.sadeceAcik = e.target.checked; JP.tx(function () {}); } }), 'Yalnızca açığı olanlar']),
        h('div.spacer'),
        h('button.btn.sm', { text: 'Elle hareket ekle', onclick: elleHareketKip }),
        h('button.btn.ghost.sm', { text: "Excel'e kopyala", onclick: function () { havuzKopyala(satirlar); } })
      ]),
      h('div.grid.k4', {}, [
        UI.kpi('Talep', JP.fmt.miktar(top.talep), 'birim'),
        UI.kpi('Siparişte', JP.fmt.miktar(top.rezerv), 'birim', 'Rezerve'),
        UI.kpi('Faturalanan', JP.fmt.miktar(top.fatura), 'birim'),
        UI.kpi('Açık', JP.fmt.miktar(top.acik), 'birim', 'Siparişe dönüştürülebilir', true)
      ]),
      eslesmeyen.length ? UI.panel('Talep dışı fatura (' + eslesmeyen.length + ')', h('span.small.muted', { text: 'Kademe 3 — talep bulunamadı veya talebi aşıyor' }),
        UI.tablo(['Tarih', 'Fatura', 'Bayi', 'Ürün', { t: 'Miktar', num: true }, ''], eslesmeyen.map(function (td) {
          return h('tr', {}, [
            h('td.small', { text: JP.fmt.tarih(td.ts) }),
            h('td.mono.small', { text: td.faturaNo }),
            h('td', { text: bayiAd(td.bayiKod) }),
            h('td.mono.small', { text: td.urunKod }),
            h('td.num.mono', { text: JP.fmt.miktar(td.miktar) }),
            h('td.right', {}, h('button.btn.sm', { text: 'Talebe bağla', onclick: function () { bagliKip(td); } }))
          ]);
        })), true) : null,
      UI.panel('Bayi × ürün bakiyesi', UI.bantAciklama(),
        UI.tablo(['Bayi', 'Ürün', { t: 'Talep', num: true }, { t: 'Siparişte', num: true }, { t: 'Faturalanan', num: true }, { t: 'Açık', num: true }, 'Dağılım', { t: 'Yaş', num: true }],
          satirlar.map(function (r) {
            return h('tr', {}, [
              h('td.small', { text: bayiAd(r.bayiKod) }),
              h('td', {}, [h('div.small', { text: urunAd(r.urunKod) }), h('div.pc.mono', { text: r.urunKod })]),
              h('td.num.mono', { text: JP.fmt.miktar(r.talep) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.rezerv) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.fatura) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.acik) }),
              h('td', { style: { width: '150px' } }, UI.bant(r)),
              h('td.num.small.muted', { text: r.yas + ' g' })
            ]);
          }), 'Havuzda hareket yok.'), true),
      UI.panel('Hareket defteri', h('span.small.muted', { text: db.havuz.length + ' hareket · en yeni 250 kayıt' }), hareketDefteri(hs), true)
    ]);
  }

  function hareketDefteri(hs) {
    return UI.tablo(['Tarih', 'Bayi', 'Ürün', 'Tip', { t: 'Miktar', num: true }, 'Kaynak', 'Eşleşme', 'Belge', 'Kullanıcı', 'Açıklama'],
      hs.map(function (x) {
        return h('tr.ledger', {}, [
          h('td.small.nowrap', { text: JP.fmt.saat(x.ts) }),
          h('td.small', { text: x.bayiKod }),
          h('td.mono.small', { text: x.urunKod }),
          h('td', {}, h('span.tag', { text: x.tip })),
          h('td.num.mono' + (x.miktar < 0 ? '.sgn-neg' : '.sgn-pos'), { text: (x.miktar > 0 ? '+' : '') + JP.fmt.miktar(x.miktar) }),
          h('td', {}, h('span.src.' + x.kaynak, { text: x.kaynak })),
          h('td.small', { text: x.eslesme || '—' }),
          h('td.mono.small', { text: x.belge || '—' }),
          h('td.small.muted', { text: x.kullanici + (x.sebep ? ' · ' + x.sebep : '') }),
          h('td.small.muted', { text: x.aciklama })
        ]);
      }), 'Hareket yok.');
  }

  function havuzKopyala(satirlar) {
    UI.tabloKopyala('Talep havuzu', [['Bayi kodu', 'Bayi', 'Ürün kodu', 'Ürün', 'Talep', 'Siparişte', 'Faturalanan', 'Açık', 'Yaş (gün)']].concat(
      satirlar.map(function (r) { return [r.bayiKod, bayiAd(r.bayiKod), r.urunKod, urunAd(r.urunKod), r.talep, r.rezerv, r.fatura, r.acik, r.yas]; })));
  }

  function elleHareketKip() {
    var db = JP.db;
    var bayiSec = h('select', {}, db.bayiler.map(function (b) { return h('option', { value: b.kod, text: b.unvan }); }));
    var urunSec = h('select', {}, db.urunler.map(function (u) { return h('option', { value: u.kod, text: u.kod + ' — ' + u.ad }); }));
    var tipSec = h('select', {}, [
      h('option', { value: 'dFatura', text: 'dFatura — elle tahsis (talebi kapatır)' }),
      h('option', { value: 'dTalep', text: 'dTalep — talep düzeltmesi' }),
      h('option', { value: 'dRezerv', text: 'dRezerv — rezerv düzeltmesi' })
    ]);
    var sebepSec = h('select', {}, JP.SEBEPLER.map(function (s) { return h('option', { value: s.kod, text: s.kod + ' — ' + s.ad }); }));
    var mik = h('input', { type: 'number', step: '10', value: '0' });
    var acik = h('input', { type: 'text', placeholder: 'Örn. kartela gönderimi, fatura kesilmedi' });

    UI.modal({
      baslik: 'Elle havuz hareketi', etiket: 'Sebep kodu zorunlu',
      icerik: h('div.stack', {}, [
        h('div.note', { text: 'Logo’da faturası bulunmayan istisnalar (numune, konsinye, geçmiş dönem) için kullanılır. Raporlarda ayrı gösterilir.' }),
        h('div.grid.k2', {}, [
          h('label.f', {}, ['Bayi', bayiSec]),
          h('label.f', {}, ['Ürün', urunSec]),
          h('label.f', {}, ['Hareket tipi', tipSec]),
          h('label.f', {}, ['Sebep kodu', sebepSec]),
          h('label.f', {}, ['Miktar (− için eksi girin)', mik]),
          h('label.f', {}, ['Açıklama', acik])
        ])
      ]),
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', {
            text: 'Hareketi yaz',
            onclick: function () {
              UI.dene(function () {
                JP.elleHareket({
                  bayiKod: bayiSec.value, urunKod: urunSec.value, tip: tipSec.value,
                  miktar: parseFloat(mik.value) || 0, sebep: sebepSec.value, aciklama: acik.value || 'Elle hareket'
                });
                kapat(); UI.toast('Hareket yazıldı', 'Bakiye hareketlerden yeniden hesaplandı.', 'ok');
              });
            }
          })
        ];
      }
    });
  }

  function bagliKip(td) {
    var adaylar = [];
    JP.db.talepler.forEach(function (t) {
      if (t.bayiKod !== td.bayiKod || t.iptal) return;
      t.kalemler.forEach(function (k) {
        if (k.urunKod !== td.urunKod) return;
        var b = JP.kalemBakiye(k.id);
        adaylar.push({ talep: t, kalem: k, acik: b.acik });
      });
    });
    var sec = h('select', {}, adaylar.length
      ? adaylar.map(function (a) { return h('option', { value: a.kalem.id, text: a.talep.no + ' · ' + JP.fmt.tarih(a.talep.tarih) + ' · açık ' + JP.fmt.miktar(a.acik) }); })
      : [h('option', { value: '', text: 'Uygun talep kalemi yok' })]);

    UI.modal({
      baslik: 'Talep dışı faturayı bağla', etiket: td.faturaNo,
      icerik: h('div.stack', {}, [
        h('dl.kv', {}, [
          h('dt', { text: 'Bayi' }), h('dd', { text: bayiAd(td.bayiKod) }),
          h('dt', { text: 'Ürün' }), h('dd', { text: urunAd(td.urunKod) + ' (' + td.urunKod + ')' }),
          h('dt', { text: 'Miktar' }), h('dd.mono', { text: JP.fmt.miktar(td.miktar) })
        ]),
        h('label.f', {}, ['Bağlanacak talep kalemi', sec]),
        h('div.small.muted', { text: 'Hareket “elle” eşleşme kademesiyle yazılır ve eşleşme kalitesi raporunda ayrı sayılır.' })
      ]),
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', {
            text: 'Bağla', disabled: !adaylar.length,
            onclick: function () { UI.dene(function () { JP.talepDisiBagla(td.id, sec.value); kapat(); UI.toast('Bağlandı', null, 'ok'); }); }
          })
        ];
      }
    });
  }

  /* ---------------------------------------------------------------- ürünler */
  function urunler() {
    var db = JP.db;
    if (!db.urunler.length) return h('div.note.warn', { html: '<b>Ürün yok.</b> Panel ekranından “Ürünleri Logo’dan al” işlemini çalıştırın.' });
    return UI.panel('Stok kartları', h('span.small.muted', { text: 'Kod, ad, birim ve grup Logo’dan gelir — salt okunur' }),
      UI.tablo(['', 'Ürün', 'Grup', 'Birim', 'Logo', 'Siparişe', 'Teknik özellik (portal)', 'Açıklama (portal)'],
        db.urunler.slice().sort(function (a, b) { return a.grup.localeCompare(b.grup) || a.sira - b.sira; }).map(function (u) {
          return h('tr', {}, [
            h('td', { style: { width: '54px' } }, UI.kartela(u, '34px')),
            h('td', {}, [h('div', { text: u.ad }), h('div.pc.mono', { text: u.kod })]),
            h('td.small', { text: u.grup }),
            h('td.small.mono', { text: u.birim }),
            h('td', {}, u.logodaYok ? UI.rozet("Logo'da yok", 'bad') : (u.logoAktif ? UI.rozet('Aktif', 'ok') : UI.rozet('Pasif', 'warn'))),
            h('td', {}, h('label.chk', {}, [h('input', {
              type: 'checkbox', checked: u.siparieAcik, disabled: !u.logoAktif,
              onchange: function (e) { var v = e.target.checked; JP.tx(function (d) { d.urunler.find(function (x) { return x.kod === u.kod; }).siparieAcik = v; }); }
            }), h('span.small', { text: u.siparieAcik ? 'Açık' : 'Kapalı' })])),
            h('td', { style: { minWidth: '190px' } }, h('input', {
              type: 'text', value: u.ozellik || '', placeholder: 'Örn. 280 cm en · leke tutmaz apre',
              title: 'Bayi kataloğunda ürün kartında görünür',
              onchange: function (e) { var v = e.target.value; JP.tx(function (d) { d.urunler.find(function (x) { return x.kod === u.kod; }).ozellik = v; }); }
            })),
            h('td', { style: { minWidth: '230px' } }, h('input', {
              type: 'text', value: u.aciklama || '', placeholder: JP.aciklamaOf(u.grup),
              title: 'Ürün detay penceresinde görünür',
              onchange: function (e) { var v = e.target.value; JP.tx(function (d) { d.urunler.find(function (x) { return x.kod === u.kod; }).aciklama = v; }); }
            }))
          ]);
        })), true);
  }

  /* ---------------------------------------------------------------- bayiler */
  function bayiler() {
    var db = JP.db;
    if (!db.bayiler.length) return h('div.note.warn', { html: '<b>Bayi yok.</b> Panel ekranından “Bayileri Logo’dan al” işlemini çalıştırın.' });
    return UI.panel('Cari kartlar', h('span.small.muted', { text: 'Unvan ve ülke Logo’dan gelir — salt okunur' }),
      UI.tablo(['Bayi', 'Şehir / Ülke', 'Logo', 'Siparişe', 'Ürün kısıtı', ''],
        db.bayiler.map(function (b) {
          return h('tr', {}, [
            h('td', {}, [h('div', { text: b.unvan }), h('div.pc.mono', { text: b.kod + ' · ' + b.eposta })]),
            h('td.small', { text: b.sehir + ' / ' + b.ulke }),
            h('td', {}, b.logodaYok ? UI.rozet("Logo'da yok", 'bad') : (b.logoAktif ? UI.rozet('Aktif', 'ok') : UI.rozet('Pasif', 'warn'))),
            h('td', {}, h('label.chk', {}, [h('input', {
              type: 'checkbox', checked: b.siparisAcik, disabled: !b.logoAktif,
              onchange: function (e) { var v = e.target.checked; JP.tx(function (d) { d.bayiler.find(function (x) { return x.kod === b.kod; }).siparisAcik = v; }); }
            }), h('span.small', { text: b.siparisAcik ? 'Açık' : 'Kapalı' })])),
            h('td.small', { text: kisitMetni(b) }),
            h('td.right', {}, h('button.btn.sm', { text: 'Ürünleri seç', onclick: function () { kisitKip(b); } }))
          ]);
        })), true);
  }

  function kisitMetni(b) {
    if (b.kisit.tip === 'tumu') return 'Tüm ürünler';
    if (b.kisit.tip === 'gruplar') return 'Gruplar: ' + (b.kisit.gruplar.join(', ') || '—');
    return b.kisit.urunler.length + ' seçili ürün';
  }

  function kisitKip(b) {
    var db = JP.db;
    var gruplar = []; db.urunler.forEach(function (u) { if (gruplar.indexOf(u.grup) < 0) gruplar.push(u.grup); });
    var tip = b.kisit.tip, secGrup = b.kisit.gruplar.slice(), secUrun = b.kisit.urunler.slice();
    var govde = h('div.stack');

    function ciz() {
      govde.textContent = '';
      govde.appendChild(h('div.seg', {}, [
        ['tumu', 'Tüm ürünler'], ['gruplar', 'Seçili gruplar'], ['urunler', 'Seçili ürünler']
      ].map(function (o) {
        return h('button', { 'aria-pressed': String(tip === o[0]), text: o[1], onclick: function () { tip = o[0]; ciz(); } });
      })));
      if (tip === 'gruplar') {
        govde.appendChild(h('div.row', {}, gruplar.map(function (g) {
          return h('label.chk', {}, [h('input', {
            type: 'checkbox', checked: secGrup.indexOf(g) >= 0,
            onchange: function (e) { if (e.target.checked) secGrup.push(g); else secGrup.splice(secGrup.indexOf(g), 1); }
          }), g]);
        })));
      } else if (tip === 'urunler') {
        govde.appendChild(h('div.stack', { style: { gap: '4px', maxHeight: '320px', overflowY: 'auto' } }, db.urunler.map(function (u) {
          return h('label.chk', {}, [h('input', {
            type: 'checkbox', checked: secUrun.indexOf(u.kod) >= 0,
            onchange: function (e) { if (e.target.checked) secUrun.push(u.kod); else secUrun.splice(secUrun.indexOf(u.kod), 1); }
          }), h('span.small', { text: u.kod + ' — ' + u.ad })]);
        })));
      } else {
        govde.appendChild(h('div.small.muted', { text: 'Bayi, siparişe açık tüm ürünleri görür.' }));
      }
    }
    ciz();

    UI.modal({
      baslik: 'Sipariş verebileceği ürünler', etiket: b.unvan,
      icerik: govde,
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', {
            text: 'Kaydet',
            onclick: function () {
              JP.tx(function (d) {
                d.bayiler.find(function (x) { return x.kod === b.kod; }).kisit = { tip: tip, gruplar: secGrup, urunler: secUrun };
              });
              kapat(); UI.toast('Kısıt kaydedildi', b.unvan, 'ok');
            }
          })
        ];
      }
    });
  }

  /* --------------------------------------------------------------- raporlar */
  function raporlar() {
    var db = JP.db;
    var acik = JP.raporAcikTalep({ sadeceAcik: true });
    var es = JP.raporEslesme();
    var yas = { a: 0, b: 0, c: 0 };
    acik.forEach(function (r) { if (r.yas <= 30) yas.a += r.acik; else if (r.yas <= 60) yas.b += r.acik; else yas.c += r.acik; });
    var gecikmis = db.siparisler.filter(function (s) { return s.durum === "Logo'ya İletildi" && JP.gunFark(s.tarih) > 7; });

    return h('div.stack', {}, [
      UI.panel('Açık satın alma talebi', h('div.row.tight', {}, [
        h('span.small.muted', { text: acik.length + ' satır' }),
        h('button.btn.ghost.sm', { text: "Excel'e kopyala", onclick: function () { havuzKopyala(acik); } })
      ]), h('div.stack', {}, [
        h('div.grid.k3', {}, [
          UI.kpi('0–30 gün', JP.fmt.miktar(yas.a), 'birim'),
          UI.kpi('31–60 gün', JP.fmt.miktar(yas.b), 'birim'),
          UI.kpi('60 gün üzeri', JP.fmt.miktar(yas.c), 'birim', yas.c > 0 ? 'Yaşlanmış talep' : null)
        ]),
        UI.tablo(['Bayi', 'Ürün', 'Grup', { t: 'Talep', num: true }, { t: 'Siparişte', num: true }, { t: 'Faturalanan', num: true }, { t: 'Açık', num: true }, { t: 'Yaş', num: true }],
          acik.map(function (r) {
            return h('tr', {}, [
              h('td.small', { text: r.bayiUnvan }),
              h('td.small', { text: r.urunAd }),
              h('td.small.muted', { text: r.grup }),
              h('td.num.mono', { text: JP.fmt.miktar(r.talep) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.rezerv) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.fatura) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.acik) }),
              h('td.num.small', { text: r.yas + ' g', style: r.yas > 60 ? { color: 'var(--bad)' } : null })
            ]);
          }), 'Açık talep yok.')
      ])),
      UI.panel('Eşleşme kalitesi', h('span.small.muted', { text: 'Faturaların hangi kademeyle eşleştiği' }), h('div.stack', {}, [
        h('div.grid.k4', {}, [
          UI.kpi('Kademe 1 · bağlantılı', es.say.baglantili, 'satır', JP.fmt.miktar(es.miktar.baglantili) + ' birim'),
          UI.kpi('Kademe 2 · FIFO', es.say.fifo, 'satır', JP.fmt.miktar(es.miktar.fifo) + ' birim'),
          UI.kpi('Elle tahsis', es.say.elle, 'satır', JP.fmt.miktar(es.miktar.elle) + ' birim'),
          UI.kpi('Kademe 3 · eşleşmeyen', es.eslesmeyen, 'satır', 'Talep dışı fatura')
        ]),
        es.toplam ? h('div', {}, [
          h('div.bar', { style: { height: '13px' } }, [
            h('i', { style: { width: (es.say.baglantili / es.toplam * 100) + '%', background: 'var(--ok)' } }),
            h('i', { style: { width: (es.say.fifo / es.toplam * 100) + '%', background: 'var(--info)' } }),
            h('i', { style: { width: (es.say.elle / es.toplam * 100) + '%', background: 'var(--warn)' } })
          ]),
          h('div.legend', { style: { marginTop: '7px' } }, [
            h('span', { html: '<i style="background:var(--ok)"></i>Bağlantılı %' + Math.round(es.say.baglantili / es.toplam * 100) }),
            h('span', { html: '<i style="background:var(--info)"></i>FIFO %' + Math.round(es.say.fifo / es.toplam * 100) }),
            h('span', { html: '<i style="background:var(--warn)"></i>Elle %' + Math.round(es.say.elle / es.toplam * 100) })
          ])
        ]) : h('div.small.muted', { text: 'Henüz faturalanan hareket yok.' })
      ])),
      UI.panel('Sipariş takip', gecikmis.length ? UI.rozet(gecikmis.length + ' gecikmiş', 'warn') : null,
        UI.tablo(['Sipariş', 'Bayi', 'Durum', 'Logo fiş', 'Fatura', 'GİB', { t: 'Gün', num: true }],
          db.siparisler.map(function (s) {
            var fis = db.logo.fisler.find(function (f) { return f.portalRef === s.logoRef; });
            var fatura = fis ? db.logo.faturalar.filter(function (f) { return f.fisNo === fis.fisNo; }) : [];
            return h('tr', {}, [
              h('td.mono.small', { text: s.no }),
              h('td.small', { text: bayiAd(s.bayiKod) }),
              h('td', {}, UI.rozet(s.durum)),
              h('td.mono.small', { text: s.logoFisNo || '—' }),
              h('td.mono.small', { text: fatura.map(function (f) { return f.no; }).join(', ') || '—' }),
              h('td.small', { text: fatura.length ? fatura.map(function (f) { return f.gib; }).join(', ') : '—' }),
              h('td.num.small', { text: JP.gunFark(s.tarih), style: (s.durum === "Logo'ya İletildi" && JP.gunFark(s.tarih) > 7) ? { color: 'var(--warn)', fontWeight: '600' } : null })
            ]);
          }), 'Sipariş yok.'), true)
    ]);
  }

  /* ---------------------------------------------------------------- günlük */
  function gunluk() {
    var db = JP.db;
    return UI.panel('Çağrı ve olay günlüğü', h('span.small.muted', { text: db.log.length + ' kayıt' }),
      UI.tablo(['Tarih', 'Yön', 'İşlem', 'Özet'], db.log.map(function (l) {
        return h('tr', {}, [
          h('td.small.nowrap', { text: JP.fmt.saat(l.ts) }),
          h('td', {}, h('span.src.' + (l.yon === 'logo' ? 'logo' : 'portal'), { text: l.yon === 'logo' ? 'Logo' : 'Portal' })),
          h('td.small', { text: l.islem }),
          h('td.small' + (l.hata ? '' : '.muted'), { text: l.ozet, style: l.hata ? { color: 'var(--bad)' } : null })
        ]);
      }), 'Kayıt yok.'), true);
  }
})();
