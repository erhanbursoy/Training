/* Firma paneli — muhasebe ve yönetim.
   Bayi tarafıyla aynı çizgide: her ana bölüm liste + detay, miktarlar farklı
   birimlerde olabildiği için belge düzeyinde toplanmaz, ekranlarda havuz/rezerv/
   tahsis gibi iç kavramlar yerine iş dili kullanılır (talep, siparişe alınan,
   sevk edilen, bekleyen). Motor değişmez: bakiye yine hareketlerden hesaplanır. */
(function () {
  'use strict';
  var JP = window.JP, UI = JP.UI, h = UI.h;
  var kabuk = null;
  var secTalep = null, talepGorunum = 'urunler', talepFiltre = 'bekleyen';
  var secSiparis = null;
  var takipFiltre = { bayiKod: '', sadeceAcik: true };

  JP.firmaEkran = function () {
    kabuk = UI.kabuk({
      rol: 'firma', rolAdi: 'Firma paneli', baslik: 'Firma paneli', altBaslik: 'Muhasebe ve yönetim',
      railBaslik: 'Yönetim',
      ustSag: function () {
        return h('div.row.tight', {}, [
          h('button.btn.sm', { text: 'Demoyu baştan başlat', title: 'Portal tarafını boşaltır; Logo kartları kalır.', onclick: demoSifirla }),
          h('button.btn.sm', { text: 'Örnek veriye dön', onclick: function () { UI.onay('Örnek veriye dön', 'Tüm PoC verisi silinip başlangıç örneğine dönülür.', function () { JP.sifirla(false); UI.toast('Örnek veri yüklendi', null, 'ok'); }, true); } })
        ]);
      },
      bolumler: [
        { id: 'panel', ad: 'Panel', baslik: 'Panel',
          aciklama: 'Logo sorguları elle tetiklenir; her sorgunun son çalışma bilgisi burada durur.', ciz: panel },
        { id: 'talepler', ad: 'Talepler', baslik: 'Satın alma talepleri',
          aciklama: 'Talep listesi. Bir talebe girince kalemlerini görüp siparişe dönüştürürsünüz.',
          ciz: talepler,
          sayi: function () { return JP.db.talepler.filter(bekleyen).length; },
          sicak: function () { return JP.db.talepler.filter(bekleyen).length > 0; } },
        { id: 'siparisler', ad: 'Siparişler', baslik: 'Siparişler',
          aciklama: "Logo'ya gönderim ve durum sorgusu. Sipariş önce portalda kaydedilir, sonra iletilir.",
          ciz: siparisler, sayi: function () { return JP.db.siparisler.length; } },
        { id: 'takip', ad: 'Talep takibi', baslik: 'Talep takibi',
          aciklama: 'Bayi ve ürün bazında ne kadarı talep edildi, siparişe alındı, sevk edildi ve bekliyor.',
          ciz: takip },
        { id: 'urunler', ad: 'Ürünler', baslik: 'Ürünler',
          aciklama: 'Kod, ad, birim ve kategori Logo’dan gelir. Siparişe açıklık, teknik özellik ve açıklama portalda yönetilir.',
          ciz: urunler, sayi: function () { return JP.db.urunler.length; } },
        { id: 'bayiler', ad: 'Bayiler', baslik: 'Bayiler',
          aciklama: 'Unvan ve ülke Logo’dan gelir. Siparişe açıklık ve katalog kısıtı portalda tutulur.',
          ciz: bayiler, sayi: function () { return JP.db.bayiler.length; } },
        { id: 'raporlar', ad: 'Raporlar', baslik: 'Raporlar',
          aciklama: 'Bekleyen talepler, fatura eşleşme kalitesi ve sipariş takibi. Tablolar Excel’e kopyalanabilir.', ciz: raporlar },
        { id: 'gunluk', ad: 'Entegrasyon günlüğü', baslik: 'Entegrasyon günlüğü',
          aciklama: 'Tüm Logo çağrıları ve portal olayları.', ciz: gunluk }
      ]
    });
  };

  /* ------------------------------------------------------------- yardımcı */
  function bekleyen(t) { var d = JP.talepDurumu(t); return d === 'Açık' || d === 'Kısmen Karşılandı'; }
  function bayiAd(kod) { var b = JP.db.bayiler.find(function (x) { return x.kod === kod; }); return b ? b.unvan : kod; }
  function urun(kod) { return JP.db.urunler.find(function (x) { return x.kod === kod; }) || { ad: kod, birim: '', doku: 'diger', renk: '#B9AE99', gosterimBirimi: '' }; }

  /* Kalemler farklı birimlerde olabilir; ilerleme miktarla değil kalem sayısıyla verilir. */
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
  function bantAciklama() {
    return h('div.legend', {}, [
      h('span', { html: '<i style="background:var(--ok)"></i>Sevk edilen' }),
      h('span', { html: '<i style="background:var(--info)"></i>Siparişte' }),
      h('span', { html: '<i style="background:var(--warn)"></i>Bekleyen' })
    ]);
  }

  function demoSifirla() {
    UI.onay('Demoyu baştan başlat',
      'Portal tarafı (ürün, bayi, talep, sipariş, geçmiş) boşaltılır. Logo simülatöründeki stok ve cari kartlar kalır, böylece senaryoya 1. adımdan başlayabilirsiniz.',
      function () { JP.sifirla(true); UI.toast('Demo sıfırlandı', 'Sıradaki adım: “Ürünleri Logo’dan al”.', 'ok'); }, true);
  }

  /* ------------------------------------------------------------------ panel */
  function panel() {
    var db = JP.db;
    var acikTalep = db.talepler.filter(bekleyen).length;
    var acikSiparis = db.siparisler.filter(function (s) { return s.durum === "Logo'ya İletildi" || s.durum === 'Faturalandı'; }).length;
    var hatali = db.siparisler.filter(function (s) { return s.durum === 'Gönderim Hatası'; }).length;
    var sevkBekleyen = JP.havuzOzet({ sadeceAcik: true }).length;
    var bagsiz = db.talepDisi.filter(function (t) { return !t.cozuldu; }).length;

    var kap = h('div.stack');
    if (!db.urunler.length || !db.bayiler.length) {
      kap.appendChild(h('div.note.warn', { html: '<b>Portal ana verisi boş.</b> Önce “Ürünleri Logo’dan al” ve “Bayileri Logo’dan al” düğmelerini çalıştırın — ana veri sahibi Logo’dur.' }));
    }
    if (hatali) kap.appendChild(h('div.note.bad', {}, [
      h('b', { text: hatali + ' sipariş gönderim hatasında. ' }),
      h('span', { text: 'Kayıt portalda korunuyor. ' }),
      h('button.btn.sm', { text: 'Siparişlere git', onclick: function () { kabuk.git('siparisler'); } })
    ]));
    if (bagsiz) kap.appendChild(h('div.note.warn', {}, [
      h('b', { text: bagsiz + ' fatura talebe bağlanmadı. ' }),
      h('button.btn.sm', { text: 'Talep takibine git', onclick: function () { kabuk.git('takip'); } })
    ]));

    kap.appendChild(h('div.grid.k4', {}, [
      UI.kpi('Bekleyen talep', String(acikTalep), 'talep', 'Siparişe dönmeyi bekliyor'),
      UI.kpi('Açık sipariş', String(acikSiparis), 'sipariş', "Logo'da faturalanmayı bekliyor"),
      UI.kpi('Sevk bekleyen', String(sevkBekleyen), 'bayi–ürün', 'Talebi tamamlanmamış satır', true),
      UI.kpi('Bağlanmamış fatura', String(bagsiz), 'fatura', 'Elle eşleştirilecek')
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
      senkronKart('Stok kartları', 'LG_025_ITEMS — kod, ad, birim, kategori, aktiflik. Portal ek alanları korunur.',
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
            r.okunanFis + ' fiş okundu · ' + (r.miktarDegisimi + r.faturaHareketi + r.fifo) + ' işlem yazıldı · ' +
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

  /* ------------------------------------------------- talepler: liste + detay */
  function talepAc(no) { secTalep = no; talepGorunum = 'urunler'; kabuk.git('talepler'); }

  function talepler() {
    var db = JP.db;
    if (secTalep) {
      var t = db.talepler.find(function (x) { return x.no === secTalep; });
      if (t) return talepDetay(t);
      secTalep = null;
    }

    var liste = db.talepler.filter(function (t) { return !t.iptal; });
    if (talepFiltre === 'bekleyen') liste = liste.filter(bekleyen);
    if (!db.talepler.length) return h('div.empty', { text: 'Henüz satın alma talebi yok.' });

    return h('div.stack', {}, [
      h('div.row', {}, [
        h('div.seg', {}, [['bekleyen', 'Bekleyenler'], ['tumu', 'Tümü']].map(function (o) {
          return h('button', {
            'aria-pressed': String(talepFiltre === o[0]), text: o[1],
            onclick: function () { talepFiltre = o[0]; kabuk.ciz(); }
          });
        })),
        h('div.spacer'),
        h('span.small.muted', { text: liste.length + ' talep' })
      ]),
      UI.panel(null, null, UI.tablo(
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
        }), talepFiltre === 'bekleyen' ? 'Bekleyen talep yok.' : 'Talep yok.'), true)
    ]);
  }

  function talepDetay(t) {
    var kalemler = JP.talepKalemDurum(t);
    var islem = JP.talepIslemleri(t.no);
    var sayim = sevkSayim(kalemler, 'talep', 'fatura');
    var donusturulebilir = kalemler.some(function (k) { return k.donusturulebilir > 0.001; });

    var govde = h('div.stack');
    function govdeCiz() {
      govde.textContent = '';
      if (talepGorunum === 'urunler') govde.appendChild(detayUrunler(t, kalemler));
      else if (talepGorunum === 'islemler') govde.appendChild(detayIslemler(islem));
      else govde.appendChild(detayGecmis(t));
    }
    govdeCiz();

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
          h('span', { text: bayiAd(t.bayiKod) }),
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
        return h('button', {
          'aria-pressed': String(talepGorunum === o[0]), text: o[1],
          onclick: function () { talepGorunum = o[0]; kabuk.ciz(); }
        });
      })),
      govde
    ]);
  }

  function detayUrunler(t, kalemler) {
    return UI.panel('Talep kalemleri', h('span.small.muted', { text: 'Miktarlar ürünün sipariş biriminden' }),
      UI.tablo(['Ürün', 'Birim', { t: 'Talep edilen', num: true }, { t: 'Siparişe alınan', num: true }, { t: 'Sevk edilen', num: true }, { t: 'Bekleyen', num: true }, { t: 'Dönüştürülebilir', num: true }],
        kalemler.map(function (k) {
          var bekleyen2 = Math.max(0, k.talep - k.fatura);
          return h('tr', {}, [
            h('td', {}, h('div.row.tight', {}, [UI.kartela(k.urun, '26px', '40px'), h('div', {}, [
              h('div.small', { text: k.urun.ad }), h('div.pc.mono', { text: k.kalem.urunKod })
            ])])),
            h('td.small.muted.nowrap', { text: k.urun.gosterimBirimi }),
            h('td.num.mono', { text: JP.fmt.miktar(k.talep) }),
            h('td.num.mono', { text: JP.fmt.miktar(k.siparis) }),
            h('td.num.mono', { text: JP.fmt.miktar(k.fatura), style: { color: k.fatura > 0 ? 'var(--ok)' : 'var(--text-3)' } }),
            h('td.num.mono', { text: JP.fmt.miktar(bekleyen2) }),
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
          h('td.small.muted', { text: x.kullanici + (x.sebep ? ' · ' + x.sebep : '') })
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
      var kutu = h('input', {
        type: 'checkbox', checked: true,
        onchange: function (e) { secim[k.kalem.id].dahil = e.target.checked; mik.disabled = !e.target.checked; ozetGuncelle(); }
      });
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

    UI.modal({
      baslik: 'Talebi siparişe dönüştür', etiket: t.no + ' · ' + bayiAd(t.bayiKod), genis: true,
      icerik: h('div.stack', {}, [
        UI.tablo(['Kalem', 'Kod', 'Birim', { t: 'Talep', num: true }, { t: 'Dönüştürülebilir', num: true }, 'Sipariş miktarı'], satirlar),
        ozet,
        h('div.note', { text: 'Sipariş portalda “Taslak” olarak oluşur. Logo’ya gönderim ayrı bir adımdır.' })
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
                siparisAc(s.no);
              });
            }
          })
        ];
      }
    });
  }

  /* ------------------------------------------------ siparişler: liste + detay */
  function siparisAc(no) { secSiparis = no; kabuk.git('siparisler'); }

  function siparisler() {
    var db = JP.db;
    if (secSiparis) {
      var s = db.siparisler.find(function (x) { return x.no === secSiparis; });
      if (s) return siparisDetay(s);
      secSiparis = null;
    }
    if (!db.siparisler.length) return h('div.empty', { text: 'Henüz sipariş yok. Talepler ekranından oluşturun.' });

    return h('div.stack', {}, [
      h('div.row', {}, [
        h('button.btn.primary', {
          text: 'Sipariş ve fatura durumunu sorgula',
          onclick: function () {
            UI.dene(function () {
              var r = JP.durumSorgula();
              UI.toast('Sorgu tamamlandı',
                r.okunanFis + ' fiş · ' + r.miktarDegisimi + ' miktar değişimi · ' + (r.faturaHareketi + r.fifo) + ' sevkiyat · ' +
                r.eslesmeyen + ' bağlanmamış · ' + r.atlanan + ' mükerrer atlandı', 'ok');
            });
          }
        }),
        UI.senkronBilgi(db.senkron.siparis)
      ]),
      UI.panel(null, null, UI.tablo(
        ['Tarih', 'Sipariş no', 'Bayi', 'Durum', 'Logo fiş', { t: 'Kalem', num: true }, 'Sevkiyat', ''],
        db.siparisler.map(function (s) {
          var kl = JP.siparisKalemDurum(s);
          var sy = sevkSayim(kl, 'logoMiktar', 'sevk');
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
        })), true)
    ]);
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
        s.durum === 'Taslak' ? h('button.btn.sm', {
          text: 'Gönderim hatası simüle et',
          onclick: function () { UI.dene(function () { JP.siparisLogoyaGonder(s.no, true); UI.toast('Gönderim başarısız', 'Sipariş portalda korunuyor, yeniden denenebilir.', 'bad'); }); }
        }) : null,
        (s.durum !== 'Tamamlandı' && s.durum !== 'İptal') ? h('button.btn.sm', {
          text: 'Durum sorgula', onclick: function () { UI.dene(function () { JP.durumSorgula(s.no); UI.toast('Sorgulandı', s.no, 'ok'); }); }
        }) : null,
        (s.durum !== 'Tamamlandı' && s.durum !== 'İptal') ? h('button.btn.ghost.sm', {
          text: 'İptal et',
          onclick: function () { UI.onay('Siparişi iptal et', s.no + ' iptal edilecek ve bağlı miktar talepte tekrar açılacak. Logo fişi elle iptal edilmelidir.', function () { JP.siparisIptal(s.no); UI.toast('Sipariş iptal edildi', null, 'ok'); }, true); }
        }) : null
      ]),
      s.hataMetni ? h('div.note.bad', { text: s.hataMetni }) : null,
      degisen ? h('div.note.warn', { text: degisen + ' kalemin miktarı Logo tarafında değiştirilmiş. Talep bakiyeleri buna göre düzeltildi.' }) : null,

      UI.panel(null, null, h('div.stack', {}, [
        h('div.row', {}, [
          h('h2.mono', { text: s.no }),
          UI.rozet(s.durum),
          h('span', { text: bayiAd(s.bayiKod) }),
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
              h('td', {}, h('div.row.tight', {}, [UI.kartela(k.urun, '26px', '40px'), h('div', {}, [
                h('div.small', { text: k.urun.ad }), h('div.pc.mono', { text: k.kalem.urunKod })
              ])])),
              h('td.small.muted.nowrap', { text: k.urun.gosterimBirimi }),
              h('td', {}, h('button.tag', { text: k.kalem.talepNo, onclick: function () { talepAc(k.kalem.talepNo); } })),
              h('td.num.mono', { text: JP.fmt.miktar(k.siparis) }),
              h('td.num.mono', { text: JP.fmt.miktar(k.logoMiktar),
                style: k.degisti ? { color: 'var(--warn)', fontWeight: '600' } : null,
                title: k.degisti ? 'Logo’da değiştirildi' : '' }),
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

  /* ---------------------------------------------------------- talep takibi */
  function takip() {
    var db = JP.db;
    var satirlar = JP.havuzOzet(takipFiltre);
    var bagsiz = db.talepDisi.filter(function (t) { return !t.cozuldu; });
    var hs = db.havuz.filter(function (x) { return (!takipFiltre.bayiKod || x.bayiKod === takipFiltre.bayiKod) && !x.rezervKapanis; })
      .sort(function (a, b) { return b.ts.localeCompare(a.ts); }).slice(0, 200);
    var tamam = JP.havuzOzet({ bayiKod: takipFiltre.bayiKod }).filter(function (r) { return r.acik <= 0.001; }).length;

    return h('div.stack', {}, [
      h('div.row', {}, [
        h('select', { style: { width: 'auto' }, onchange: function (e) { takipFiltre.bayiKod = e.target.value; kabuk.ciz(); } },
          [h('option', { value: '', text: 'Tüm bayiler', selected: !takipFiltre.bayiKod })].concat(
            db.bayiler.map(function (b) { return h('option', { value: b.kod, selected: takipFiltre.bayiKod === b.kod, text: b.unvan }); }))),
        h('label.chk', {}, [h('input', { type: 'checkbox', checked: takipFiltre.sadeceAcik, onchange: function (e) { takipFiltre.sadeceAcik = e.target.checked; kabuk.ciz(); } }), 'Yalnızca bekleyenler']),
        h('div.spacer'),
        h('button.btn.sm', { text: 'Elle düzeltme', onclick: elleKip }),
        h('button.btn.ghost.sm', { text: "Excel'e kopyala", onclick: function () { takipKopyala(satirlar); } })
      ]),
      h('div.grid.k3', {}, [
        UI.kpi('Sevk bekleyen', String(satirlar.filter(function (r) { return r.acik > 0.001; }).length), 'bayi–ürün', 'Talebi tamamlanmamış satır', true),
        UI.kpi('Tamamlanan', String(tamam), 'bayi–ürün', 'Talebin tamamı sevk edildi'),
        UI.kpi('Bağlanmamış fatura', String(bagsiz.length), 'fatura', 'Elle eşleştirilecek')
      ]),

      bagsiz.length ? UI.panel('Talebe bağlanmamış faturalar', h('span.small.muted', { text: 'Logo’da fatura var, portalda karşılık gelen talep bulunamadı' }),
        UI.tablo(['Tarih', 'Fatura', 'Bayi', 'Ürün', 'Birim', { t: 'Miktar', num: true }, ''], bagsiz.map(function (td) {
          var u = urun(td.urunKod);
          return h('tr', {}, [
            h('td.small', { text: JP.fmt.tarih(td.ts) }),
            h('td.mono.small', { text: td.faturaNo }),
            h('td.small', { text: bayiAd(td.bayiKod) }),
            h('td.small', { text: u.ad }),
            h('td.small.muted', { text: u.gosterimBirimi }),
            h('td.num.mono', { text: JP.fmt.miktar(td.miktar) }),
            h('td.right', {}, h('button.btn.sm', { text: 'Talebe bağla', onclick: function () { bagliKip(td); } }))
          ]);
        })), true) : null,

      UI.panel('Bayi ve ürün bazında durum', bantAciklama(),
        UI.tablo(['Bayi', 'Ürün', 'Birim', { t: 'Talep edilen', num: true }, { t: 'Siparişte', num: true }, { t: 'Sevk edilen', num: true }, { t: 'Bekleyen', num: true }, 'Dağılım', { t: 'Yaş', num: true }],
          satirlar.map(function (r) {
            var u = urun(r.urunKod);
            return h('tr', {}, [
              h('td.small', { text: bayiAd(r.bayiKod) }),
              h('td', {}, h('div.row.tight', {}, [UI.kartela(u, '24px', '36px'), h('div', {}, [
                h('div.small', { text: u.ad }), h('div.pc.mono', { text: r.urunKod })
              ])])),
              h('td.small.muted.nowrap', { text: u.gosterimBirimi }),
              h('td.num.mono', { text: JP.fmt.miktar(r.talep) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.rezerv) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.fatura) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.acik), style: { color: r.acik > 0 ? 'var(--warn)' : 'var(--text-3)', fontWeight: '600' } }),
              h('td', { style: { width: '150px' } }, UI.bant(r)),
              h('td.num.small.muted', { text: r.yas + ' g' })
            ]);
          }), 'Kayıt yok.'), true),

      UI.panel('İşlem geçmişi', h('span.small.muted', { text: 'En yeni 200 kayıt · bakiyeler bu işlemlerden hesaplanır' }),
        gecmisTablosu(hs), true)
    ]);
  }

  function takipKopyala(satirlar) {
    UI.tabloKopyala('Talep takibi', [['Bayi kodu', 'Bayi', 'Ürün kodu', 'Ürün', 'Birim', 'Talep edilen', 'Siparişte', 'Sevk edilen', 'Bekleyen', 'Yaş (gün)']].concat(
      satirlar.map(function (r) {
        var u = urun(r.urunKod);
        return [r.bayiKod, bayiAd(r.bayiKod), r.urunKod, u.ad, u.birim, r.talep, r.rezerv, r.fatura, r.acik, r.yas];
      })));
  }

  function elleKip() {
    var db = JP.db;
    var bayiSec = h('select', {}, db.bayiler.map(function (b) { return h('option', { value: b.kod, text: b.unvan }); }));
    var urunSec = h('select', {}, db.urunler.map(function (u) { return h('option', { value: u.kod, text: u.kod + ' — ' + u.ad }); }));
    var tipSec = h('select', {}, JP.ELLE_TIPLER.map(function (t) { return h('option', { value: t.tip, text: t.ad }); }));
    var sebepSec = h('select', {}, JP.SEBEPLER.map(function (s) { return h('option', { value: s.kod, text: s.ad }); }));
    var mik = h('input', { type: 'number', step: '10', value: '0' });
    var acik = h('input', { type: 'text', placeholder: 'Örn. kartela gönderimi, fatura kesilmedi' });
    var birimEt = h('span.small.muted');
    function birimGuncelle() { birimEt.textContent = urun(urunSec.value).gosterimBirimi || ''; }
    urunSec.addEventListener('change', birimGuncelle);
    setTimeout(birimGuncelle, 0);

    UI.modal({
      baslik: 'Elle düzeltme', etiket: 'Sebep zorunlu',
      icerik: h('div.stack', {}, [
        h('div.note', { text: 'Logo’da faturası bulunmayan istisnalar (numune, konsinye, geçmiş dönem) için kullanılır. Raporlarda ayrı gösterilir.' }),
        h('div.grid.k2', {}, [
          h('label.f', {}, ['Bayi', bayiSec]),
          h('label.f', {}, ['Ürün', urunSec]),
          h('label.f', {}, ['İşlem', tipSec]),
          h('label.f', {}, ['Sebep', sebepSec]),
          h('label.f', {}, ['Miktar (azaltmak için eksi girin)', h('div.row.tight', {}, [mik, birimEt])]),
          h('label.f', {}, ['Açıklama', acik])
        ])
      ]),
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', {
            text: 'Kaydet',
            onclick: function () {
              UI.dene(function () {
                JP.elleHareket({
                  bayiKod: bayiSec.value, urunKod: urunSec.value, tip: tipSec.value,
                  miktar: parseFloat(mik.value) || 0, sebep: sebepSec.value, aciklama: acik.value || 'Elle düzeltme'
                });
                kapat(); UI.toast('Kaydedildi', 'Bakiyeler yeniden hesaplandı.', 'ok');
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
        adaylar.push({ talep: t, kalem: k, acik: JP.kalemBakiye(k.id).acik });
      });
    });
    var sec = h('select', {}, adaylar.length
      ? adaylar.map(function (a) { return h('option', { value: a.kalem.id, text: a.talep.no + ' · ' + JP.fmt.tarih(a.talep.tarih) + ' · bekleyen ' + JP.fmt.miktar(a.acik) }); })
      : [h('option', { value: '', text: 'Uygun talep kalemi yok' })]);
    var u = urun(td.urunKod);

    UI.modal({
      baslik: 'Faturayı talebe bağla', etiket: td.faturaNo,
      icerik: h('div.stack', {}, [
        h('dl.kv', {}, [
          h('dt', { text: 'Bayi' }), h('dd', { text: bayiAd(td.bayiKod) }),
          h('dt', { text: 'Ürün' }), h('dd', { text: u.ad + ' (' + td.urunKod + ')' }),
          h('dt', { text: 'Miktar' }), h('dd.mono', { text: JP.fmt.miktar(td.miktar) + ' ' + u.gosterimBirimi })
        ]),
        h('label.f', {}, ['Bağlanacak talep kalemi', sec]),
        h('div.small.muted', { text: 'İşlem “elle bağlandı” olarak kaydedilir ve eşleşme kalitesi raporunda ayrı sayılır.' })
      ]),
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', { text: 'Bağla', disabled: !adaylar.length,
            onclick: function () { UI.dene(function () { JP.talepDisiBagla(td.id, sec.value); kapat(); UI.toast('Bağlandı', null, 'ok'); }); } })
        ];
      }
    });
  }

  /* ------------------------------------------------- ürünler: liste + detay */
  function urunler() {
    var db = JP.db;
    if (!db.urunler.length) return h('div.note.warn', { html: '<b>Ürün yok.</b> Panel ekranından “Ürünleri Logo’dan al” işlemini çalıştırın.' });
    var liste = db.urunler.slice().sort(function (a, b) { return a.grup.localeCompare(b.grup, 'tr') || a.sira - b.sira; });
    var kapali = liste.filter(function (u) { return !u.siparieAcik; }).length;

    return h('div.stack', {}, [
      h('div.row', {}, [
        h('span.small.muted', { text: liste.length + ' ürün · ' + kapali + ' tanesi siparişe kapalı' }),
        h('div.spacer')
      ]),
      UI.panel(null, null, UI.tablo(['', 'Ürün', 'Kategori · seri', 'Birim', 'Logo', 'Siparişe', ''],
        liste.map(function (u) {
          return h('tr', {}, [
            h('td', { style: { width: '54px' } }, UI.kartela(u, '34px', '48px')),
            h('td', {}, [h('div', { text: u.ad }), h('div.pc.mono', { text: u.kod })]),
            h('td.small.muted', { text: JP.urunKirilim(u) }),
            h('td.small.mono', { text: u.gosterimBirimi }),
            h('td', {}, u.logodaYok ? UI.rozet("Logo'da yok", 'bad') : (u.logoAktif ? UI.rozet('Aktif', 'ok') : UI.rozet('Pasif', 'warn'))),
            h('td', {}, h('label.chk', {}, [h('input', {
              type: 'checkbox', checked: u.siparieAcik, disabled: !u.logoAktif,
              onchange: function (e) { var v = e.target.checked; JP.tx(function (d) { d.urunler.find(function (x) { return x.kod === u.kod; }).siparieAcik = v; }); }
            }), h('span.small', { text: u.siparieAcik ? 'Açık' : 'Kapalı' })])),
            h('td.right', {}, h('button.btn.ghost.sm', { text: 'Detay', onclick: function () { urunKip(u); } }))
          ]);
        })), true)
    ]);
  }

  function urunKip(u) {
    var ozellik = h('input', { type: 'text', value: u.ozellik || '', placeholder: 'Örn. 280 cm en · leke tutmaz apre' });
    var aciklama = h('textarea', { value: u.aciklama || '', placeholder: 'Bayi ürün detayında görünür' });
    UI.modal({
      baslik: u.ad, etiket: u.kod, genis: true,
      icerik: h('div.grid.k2', {}, [
        h('div.stack', {}, [
          UI.kartela(u, '190px', null, true),
          h('dl.kv', {}, [
            h('dt', { text: 'Kategori · seri' }), h('dd', { text: JP.urunKirilim(u) }),
            h('dt', { text: 'Sipariş birimi' }), h('dd', { text: u.gosterimBirimi + ' (' + u.birim + ')' }),
            h('dt', { text: 'Logo durumu' }), h('dd', { text: u.logodaYok ? "Logo'da yok" : (u.logoAktif ? 'Aktif' : 'Pasif') })
          ])
        ]),
        h('div.stack', {}, [
          h('div.small.muted', { text: 'Kod, ad, birim ve kategori Logo’dan gelir; buradan değiştirilemez.' }),
          h('label.f', {}, ['Teknik özellik (katalog satırında görünür)', ozellik]),
          h('label.f', {}, ['Ürün açıklaması (ürün detayında görünür)', aciklama])
        ])
      ]),
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', {
            text: 'Kaydet',
            onclick: function () {
              JP.tx(function (d) {
                var p = d.urunler.find(function (x) { return x.kod === u.kod; });
                p.ozellik = ozellik.value; p.aciklama = aciklama.value;
              });
              kapat(); UI.toast('Ürün güncellendi', u.kod, 'ok');
            }
          })
        ];
      }
    });
  }

  /* -------------------------------------------------- bayiler: liste + detay */
  function bayiler() {
    var db = JP.db;
    if (!db.bayiler.length) return h('div.note.warn', { html: '<b>Bayi yok.</b> Panel ekranından “Bayileri Logo’dan al” işlemini çalıştırın.' });
    return UI.panel(null, null, UI.tablo(['Bayi', 'Şehir / Ülke', 'Logo', 'Siparişe', 'Katalog', { t: 'Bekleyen talep', num: true }, ''],
      db.bayiler.map(function (b) {
        var acik = db.talepler.filter(function (t) { return t.bayiKod === b.kod && bekleyen(t); }).length;
        return h('tr', {}, [
          h('td', {}, [h('div', { text: b.unvan }), h('div.pc.mono', { text: b.kod + ' · ' + b.eposta })]),
          h('td.small', { text: b.sehir + ' / ' + b.ulke }),
          h('td', {}, b.logodaYok ? UI.rozet("Logo'da yok", 'bad') : (b.logoAktif ? UI.rozet('Aktif', 'ok') : UI.rozet('Pasif', 'warn'))),
          h('td', {}, h('label.chk', {}, [h('input', {
            type: 'checkbox', checked: b.siparisAcik, disabled: !b.logoAktif,
            onchange: function (e) { var v = e.target.checked; JP.tx(function (d) { d.bayiler.find(function (x) { return x.kod === b.kod; }).siparisAcik = v; }); }
          }), h('span.small', { text: b.siparisAcik ? 'Açık' : 'Kapalı' })])),
          h('td.small.muted', { text: kisitMetni(b) }),
          h('td.num.mono', { text: String(acik) }),
          h('td.right', {}, h('button.btn.ghost.sm', { text: 'Detay', onclick: function () { bayiKip(b); } }))
        ]);
      })), true);
  }

  function kisitMetni(b) {
    if (b.kisit.tip === 'tumu') return 'Tüm ürünler';
    if (b.kisit.tip === 'gruplar') return (b.kisit.gruplar.length || 0) + ' kategori';
    return b.kisit.urunler.length + ' seçili ürün';
  }

  function bayiKip(b) {
    var db = JP.db;
    var gruplar = [];
    db.urunler.forEach(function (u) { if (gruplar.indexOf(u.grup) < 0) gruplar.push(u.grup); });
    var tip = b.kisit.tip, secGrup = b.kisit.gruplar.slice(), secUrun = b.kisit.urunler.slice();
    var govde = h('div.stack');

    function ciz() {
      govde.textContent = '';
      govde.appendChild(h('div.seg', {}, [['tumu', 'Tüm ürünler'], ['gruplar', 'Seçili kategoriler'], ['urunler', 'Seçili ürünler']].map(function (o) {
        return h('button', { 'aria-pressed': String(tip === o[0]), text: o[1], onclick: function () { tip = o[0]; ciz(); } });
      })));
      if (tip === 'gruplar') {
        govde.appendChild(h('div.stack', { style: { gap: '4px', maxHeight: '300px', overflowY: 'auto' } }, gruplar.map(function (g) {
          return h('label.chk', {}, [h('input', {
            type: 'checkbox', checked: secGrup.indexOf(g) >= 0,
            onchange: function (e) { if (e.target.checked) secGrup.push(g); else secGrup.splice(secGrup.indexOf(g), 1); }
          }), h('span.small', { text: g })]);
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
      baslik: b.unvan, etiket: b.kod, genis: true,
      icerik: h('div.grid.k2', {}, [
        h('div.stack', {}, [
          h('dl.kv', {}, [
            h('dt', { text: 'Cari kodu' }), h('dd.mono', { text: b.kod }),
            h('dt', { text: 'Şehir / ülke' }), h('dd', { text: b.sehir + ' / ' + b.ulke }),
            h('dt', { text: 'E-posta' }), h('dd', { text: b.eposta }),
            h('dt', { text: 'Logo durumu' }), h('dd', { text: b.logoAktif ? 'Aktif' : 'Pasif' })
          ]),
          h('div.small.muted', { text: 'Unvan ve ülke Logo cari kartından gelir; buradan değiştirilemez.' })
        ]),
        h('div.stack', {}, [h('div.eyebrow', { text: 'Sipariş verebileceği ürünler' }), govde])
      ]),
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', {
            text: 'Kaydet',
            onclick: function () {
              JP.tx(function (d) { d.bayiler.find(function (x) { return x.kod === b.kod; }).kisit = { tip: tip, gruplar: secGrup, urunler: secUrun }; });
              kapat(); UI.toast('Katalog kısıtı kaydedildi', b.unvan, 'ok');
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
    acik.forEach(function (r) { if (r.yas <= 30) yas.a++; else if (r.yas <= 60) yas.b++; else yas.c++; });
    var gecikmis = db.siparisler.filter(function (s) { return s.durum === "Logo'ya İletildi" && JP.gunFark(s.tarih) > 7; });

    return h('div.stack', {}, [
      UI.panel('Sevk bekleyen talepler', h('div.row.tight', {}, [
        h('span.small.muted', { text: acik.length + ' bayi–ürün satırı' }),
        h('button.btn.ghost.sm', { text: "Excel'e kopyala", onclick: function () { takipKopyala(acik); } })
      ]), h('div.stack', {}, [
        h('div.grid.k3', {}, [
          UI.kpi('0–30 gün', String(yas.a), 'satır'),
          UI.kpi('31–60 gün', String(yas.b), 'satır'),
          UI.kpi('60 gün üzeri', String(yas.c), 'satır', yas.c > 0 ? 'Yaşlanmış talep' : null, yas.c > 0)
        ]),
        UI.tablo(['Bayi', 'Ürün', 'Kategori', 'Birim', { t: 'Talep', num: true }, { t: 'Siparişte', num: true }, { t: 'Sevk edilen', num: true }, { t: 'Bekleyen', num: true }, { t: 'Yaş', num: true }],
          acik.map(function (r) {
            var u = urun(r.urunKod);
            return h('tr', {}, [
              h('td.small', { text: r.bayiUnvan }),
              h('td.small', { text: r.urunAd }),
              h('td.small.muted', { text: r.grup }),
              h('td.small.muted', { text: u.gosterimBirimi }),
              h('td.num.mono', { text: JP.fmt.miktar(r.talep) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.rezerv) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.fatura) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.acik) }),
              h('td.num.small', { text: r.yas + ' g', style: r.yas > 60 ? { color: 'var(--bad)' } : null })
            ]);
          }), 'Sevk bekleyen talep yok.')
      ])),

      UI.panel('Fatura eşleşme kalitesi', h('span.small.muted', { text: 'Faturanın hangi yolla talebe bağlandığı' }), h('div.stack', {}, [
        h('div.grid.k4', {}, [
          UI.kpi('Sipariş bağlantılı', String(es.say.baglantili), 'satır', 'Fatura satırında sipariş referansı var'),
          UI.kpi('En eski talepten', String(es.say.fifo), 'satır', 'Sipariş bağlantısı yok, bayi ve ürün eşleşti'),
          UI.kpi('Elle bağlandı', String(es.say.elle), 'satır', 'Kullanıcı eşleştirdi'),
          UI.kpi('Bağlanmamış', String(es.eslesmeyen), 'fatura', 'Talep bulunamadı')
        ]),
        es.toplam ? h('div', {}, [
          h('div.bar', { style: { height: '13px' } }, [
            h('i', { style: { width: (es.say.baglantili / es.toplam * 100) + '%', background: 'var(--ok)' } }),
            h('i', { style: { width: (es.say.fifo / es.toplam * 100) + '%', background: 'var(--info)' } }),
            h('i', { style: { width: (es.say.elle / es.toplam * 100) + '%', background: 'var(--warn)' } })
          ]),
          h('div.legend', { style: { marginTop: '7px' } }, [
            h('span', { html: '<i style="background:var(--ok)"></i>Sipariş bağlantılı %' + Math.round(es.say.baglantili / es.toplam * 100) }),
            h('span', { html: '<i style="background:var(--info)"></i>En eski talepten %' + Math.round(es.say.fifo / es.toplam * 100) }),
            h('span', { html: '<i style="background:var(--warn)"></i>Elle %' + Math.round(es.say.elle / es.toplam * 100) })
          ])
        ]) : h('div.small.muted', { text: 'Henüz sevkiyat kaydı yok.' })
      ])),

      UI.panel('Sipariş takip', gecikmis.length ? UI.rozet(gecikmis.length + ' gecikmiş', 'warn') : null,
        UI.tablo(['Sipariş', 'Bayi', 'Durum', 'Logo fiş', 'Fatura', 'GİB', { t: 'Gün', num: true }, ''],
          db.siparisler.map(function (s) {
            var fis = db.logo.fisler.find(function (f) { return f.portalRef === s.logoRef; });
            var fatura = fis ? db.logo.faturalar.filter(function (f) { return f.fisNo === fis.fisNo; }) : [];
            var gecikti = s.durum === "Logo'ya İletildi" && JP.gunFark(s.tarih) > 7;
            return h('tr', {}, [
              h('td.mono.small', { text: s.no }),
              h('td.small', { text: bayiAd(s.bayiKod) }),
              h('td', {}, UI.rozet(s.durum)),
              h('td.mono.small', { text: s.logoFisNo || '—' }),
              h('td.mono.small', { text: fatura.map(function (f) { return f.no; }).join(', ') || '—' }),
              h('td.small', { text: fatura.length ? fatura.map(function (f) { return f.gib; }).join(', ') : '—' }),
              h('td.num.small', { text: String(JP.gunFark(s.tarih)), style: gecikti ? { color: 'var(--warn)', fontWeight: '600' } : null }),
              h('td.right', {}, h('button.btn.ghost.sm', { text: 'Detay', onclick: function () { siparisAc(s.no); } }))
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
