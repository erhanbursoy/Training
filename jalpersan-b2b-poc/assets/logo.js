/* Logo ERP simülatörü — ana veri (stok/cari), portaldan düşen sipariş fişleri,
   miktar değişimi, kısmi ve çoklu fatura, GİB gönderimi.
   Gerçek entegrasyonda yalnızca bu bölümün yerini Logo servisleri alır. */
(function () {
  'use strict';
  var JP = window.JP, UI = JP.UI, h = UI.h;

  JP.logoEkran = function () {
    UI.kabuk({
      rol: 'logo', rolAdi: 'Logo simülatörü', altBaslik: 'Tiger 3 · simülasyon',
      railBaslik: 'Logo', karanlik: true,
      ustSag: function () { return h('span.small.muted', { text: 'LG_025_* tabloları · REST servisi' }); },
      bolumler: [
        { id: 'fisler', ad: 'Sipariş fişleri',
          ciz: fisler, sayi: function () { return JP.db.logo.fisler.length; },
          sicak: function () { return JP.db.logo.fisler.some(function (f) { return !f.iptal && kalanFis(f) > 0.001; }); } },
        { id: 'faturalar', ad: 'Faturalar',
          ciz: faturalar, sayi: function () { return JP.db.logo.faturalar.length; },
          sicak: function () { return JP.db.logo.faturalar.some(function (f) { return f.gib === 'Kesilmedi'; }); } },
        { id: 'stok', ad: 'Stok kartları', ciz: stok,
          sayi: function () { return JP.db.logo.stok.length; } },
        { id: 'cari', ad: 'Cari kartlar', ciz: cari,
          sayi: function () { return JP.db.logo.cari.length; } }
      ]
    });
  };

  function kalanFis(f) {
    return f.satirlar.reduce(function (t, r) { return t + Math.max(0, r.miktar - JP.logoFaturalanan(JP.db, f.fisNo, r.id)); }, 0);
  }
  function cariAd(kod) { var c = JP.db.logo.cari.find(function (x) { return x.kod === kod; }); return c ? c.unvan : kod; }
  function stokAd(kod) { var s = JP.db.logo.stok.find(function (x) { return x.kod === kod; }); return s ? s.ad : kod; }

  /* ---------------------------------------------------------- sipariş fişleri */
  function fisler() {
    var db = JP.db;
    if (!db.logo.fisler.length) {
      return h('div.stack', {}, [
        h('div.note', { html: '<b>Henüz fiş düşmedi.</b> Firma panelinden bir sipariş oluşturup “Logo’ya gönder” dediğinizde bu ekranda belirir.' }),
        serbestFaturaKarti()
      ]);
    }
    return h('div.stack', {}, [serbestFaturaKarti()].concat(db.logo.fisler.map(fisKarti)));
  }

  function fisKarti(f) {
    var db = JP.db;
    var faturalar = db.logo.faturalar.filter(function (x) { return x.fisNo === f.fisNo; });
    var kalan = kalanFis(f);
    var durum = f.iptal ? 'İptal' : (kalan <= 0.001 ? 'Kapandı' : (faturalar.length ? 'Kısmi faturalı' : 'Açık'));

    return UI.panel(null, null, h('div.stack', {}, [
      h('div.row', {}, [
        h('span.mono', { text: f.fisNo, style: { fontWeight: '600' } }),
        UI.rozet(durum, durum === 'Kapandı' ? 'ok' : (durum === 'İptal' ? '' : (faturalar.length ? 'info' : 'warn'))),
        h('span', { text: cariAd(f.cariKod) }),
        h('span.tag', { text: 'portal ref ' + f.portalRef }),
        h('span.small.muted', { text: JP.fmt.tarih(f.tarih) }),
        f.teslimTarihi ? h('span.tag', { text: 'teslim ' + JP.fmt.tarih(f.teslimTarihi) }) : null,
        h('div.spacer'),
        (!f.iptal && kalan > 0.001) ? h('button.btn.primary.sm', { text: 'Fatura kes', onclick: function () { faturaKip(f); } }) : null,
        (!f.iptal && !faturalar.length) ? h('button.btn.ghost.sm', { text: 'Fişi iptal et', onclick: function () { UI.onay('Fişi iptal et', f.fisNo + ' iptal edilecek. Portal, durum sorgusunda siparişi iptale çeker.', function () { JP.logo.fisIptal(f.fisNo); UI.toast('Fiş iptal edildi', null, 'ok'); }, true); } }) : null
      ]),
      UI.tablo(['Satır', 'Stok', { t: 'Miktar', num: true }, { t: 'Faturalanan', num: true }, { t: 'Kalan', num: true }, 'Miktarı değiştir'],
        f.satirlar.map(function (r) {
          var fatura = JP.logoFaturalanan(db, f.fisNo, r.id);
          var girdi = h('input.qty', { type: 'number', min: String(fatura), step: '5', value: String(r.miktar), disabled: f.iptal });
          return h('tr', {}, [
            h('td.mono.small', { text: r.id }),
            h('td', {}, [h('div.small', { text: stokAd(r.stokKod) }), h('div.pc.mono', { text: r.stokKod })]),
            h('td.num.mono', { text: JP.fmt.miktar(r.miktar) }),
            h('td.num.mono', { text: JP.fmt.miktar(fatura) }),
            h('td.num.mono', { text: JP.fmt.miktar(Math.max(0, r.miktar - fatura)) }),
            h('td', {}, h('div.row.tight', {}, [girdi, h('button.btn.sm', {
              text: 'Uygula', disabled: f.iptal,
              onclick: function () {
                UI.dene(function () {
                  JP.logo.fisMiktarDegistir(f.fisNo, r.id, parseFloat(girdi.value) || 0);
                  UI.toast('Miktar değişti', 'Portal, durum sorgusunda rezervi düzeltecek.', 'ok');
                });
              }
            })]))
          ]);
        })),
      faturalar.length ? h('div.row.small.muted', {}, [h('span', { text: 'Faturalar:' })].concat(
        faturalar.map(function (x) { return h('span.tag', { text: x.no + ' · ' + x.tur + ' · GİB ' + x.gib }); }))) : null
    ]));
  }

  function faturaKip(f) {
    var db = JP.db;
    var satirlar = {}, tur = 'e-Fatura';
    var girdiler = f.satirlar.map(function (r) {
      var kalan = Math.round((r.miktar - JP.logoFaturalanan(db, f.fisNo, r.id)) * 100) / 100;
      satirlar[r.id] = kalan;
      var girdi = h('input.qty', {
        type: 'number', min: '0', max: String(kalan), step: '5', value: String(kalan), disabled: kalan <= 0,
        oninput: function (e) { satirlar[r.id] = parseFloat(e.target.value) || 0; }
      });
      return h('tr', {}, [
        h('td', {}, [h('div.small', { text: stokAd(r.stokKod) }), h('div.pc.mono', { text: r.stokKod })]),
        h('td.num.mono', { text: JP.fmt.miktar(r.miktar) }),
        h('td.num.mono', { text: JP.fmt.miktar(kalan) }),
        h('td', {}, girdi)
      ]);
    });
    var turSec = h('div.seg', {}, ['e-Fatura', 'e-Arşiv'].map(function (t) {
      return h('button', {
        'aria-pressed': String(tur === t), text: t,
        onclick: function (e) {
          tur = t;
          Array.prototype.forEach.call(e.target.parentNode.children, function (b) { b.setAttribute('aria-pressed', String(b.textContent === t)); });
        }
      });
    }));

    UI.modal({ etiket: f.fisNo + ' · ' + cariAd(f.cariKod), genis: true,
      icerik: h('div.stack', {}, [
        h('div.row', {}, [h('span.small.muted', { text: 'Fatura tipi' }), turSec]),
        UI.tablo(['Stok', { t: 'Fiş miktarı', num: true }, { t: 'Kalan', num: true }, 'Faturalanacak'], girdiler),
        h('div.note', { text: 'Miktarı düşürerek kısmi fatura kesebilir, kalan için ikinci faturayı sonra kesebilirsiniz. Portal her fatura satırını benzersiz referansla bir kez işler.' })
      ]),
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', {
            text: 'Faturayı kes',
            onclick: function () {
              UI.dene(function () {
                var fatura = JP.logo.faturaKes(f.fisNo, f.satirlar.map(function (r) { return { fisSatirId: r.id, miktar: satirlar[r.id] || 0 }; }), tur);
                kapat();
                UI.toast('Fatura kesildi', fatura.no + ' · GİB gönderimi bekliyor.', 'ok');
              });
            }
          })
        ];
      }
    });
  }

  /* ------------------------------------------------------- serbest fatura */
  function serbestFaturaKarti() {
    return h('div.panel', {}, h('div.panel-body', {}, h('div.row', {}, [
      h('div', {}, [
        h('h3', { text: 'Sipariş bağlantısı olmayan fatura' }),
        h('div.small.muted', { text: 'Portalda karşılığı olmayan fatura kesin — eşleme kademe 2 (FIFO) veya kademe 3 (talep dışı) çalışsın.' })
      ]),
      h('div.spacer'),
      h('button.btn.sm', { text: 'Serbest fatura kes', onclick: serbestKip })
    ])));
  }

  function serbestKip() {
    var db = JP.db;
    var cariSec = h('select', {}, db.logo.cari.map(function (c) { return h('option', { value: c.kod, text: c.unvan }); }));
    var stokSec = h('select', {}, db.logo.stok.map(function (s) { return h('option', { value: s.kod, text: s.kod + ' — ' + s.ad }); }));
    var mik = h('input', { type: 'number', min: '0', step: '10', value: '50' });

    UI.modal({ etiket: 'Sipariş bağlantısı yok',
      icerik: h('div.stack', {}, [
        h('div.grid.k2', {}, [
          h('label.f', {}, ['Cari', cariSec]),
          h('label.f', {}, ['Stok', stokSec]),
          h('label.f', {}, ['Miktar', mik])
        ]),
        h('div.note', { text: 'Portal bu faturayı sipariş referansı olmadan görür: aynı bayi ve ürün için en eski açık talepten düşer (FIFO). Talep yoksa veya talebi aşarsa “Talep Dışı Fatura” listesine girer.' })
      ]),
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', {
            text: 'Faturayı kes',
            onclick: function () {
              UI.dene(function () {
                var f = JP.logo.serbestFaturaKes(cariSec.value, [{ stokKod: stokSec.value, miktar: parseFloat(mik.value) || 0 }], 'e-Arşiv');
                kapat(); UI.toast('Serbest fatura kesildi', f.no + ' · GİB gönderimi bekliyor.', 'ok');
              });
            }
          })
        ];
      }
    });
  }

  /* ------------------------------------------------------------- faturalar */
  function faturalar() {
    var db = JP.db;
    if (!db.logo.faturalar.length) {
      return h('div.stack', {}, [
        h('div.note', { html: '<b>Fatura yok.</b> Sipariş fişleri ekranından fatura kesin.' }),
        serbestFaturaKarti()
      ]);
    }
    return h('div.stack', {}, [
      serbestFaturaKarti(),
      UI.panel('Fatura listesi', h('span.small.muted', { text: db.logo.faturalar.length + ' fatura' }),
        UI.tablo(['Fatura no', 'Tip', 'Cari', 'Fiş', 'Satırlar', 'GİB', 'ETTN', ''],
          db.logo.faturalar.map(function (f) {
            return h('tr', {}, [
              h('td.mono.small', { text: f.no }),
              h('td.small', { text: f.tur }),
              h('td.small', { text: cariAd(f.cariKod) }),
              h('td.mono.small', { text: f.fisNo || 'bağlantısız' , style: f.fisNo ? null : { color: 'var(--warn)' } }),
              h('td.small', {}, h('div.stack', { style: { gap: '2px' } }, f.satirlar.map(function (s) {
                return h('span.mono.small', { text: s.stokKod + ' × ' + JP.fmt.miktar(s.miktar) });
              }))),
              h('td', {}, UI.rozet(f.gib)),
              h('td.mono.small.muted', { text: f.ettn ? f.ettn.slice(0, 14) + '…' : '—' }),
              h('td.right', {}, f.gib === 'Kesilmedi' ? h('div.row.tight', {}, [
                h('button.btn.primary.sm', { text: "GİB'e gönder", onclick: function () { UI.dene(function () { JP.logo.gibGonder(f.no, true); UI.toast('GİB gönderimi başarılı', f.no, 'ok'); }); } }),
                h('button.btn.ghost.sm', { text: 'Ret simüle et', onclick: function () { UI.dene(function () { JP.logo.gibGonder(f.no, false); UI.toast('GİB reddi', f.no + ' · sipariş kapanmaz.', 'bad'); }); } })
              ]) : (f.gib === 'Hata' ? h('button.btn.sm', { text: 'Yeniden gönder', onclick: function () { UI.dene(function () { JP.logo.gibGonder(f.no, true); UI.toast('GİB gönderimi başarılı', f.no, 'ok'); }); } }) : h('span.small.muted', { text: JP.fmt.saat(f.gibTs) })))
            ]);
          })), true)
    ]);
  }

  /* ------------------------------------------------------------ stok kartları */
  function stok() {
    var db = JP.db;
    return h('div.stack', {}, [
      h('div.row', {}, [
        h('div.small.muted', { text: 'Bu kartlar portalın tek ana veri kaynağıdır. Değişiklikler portala ancak “Ürünleri Logo’dan al” ile yansır.' }),
        h('div.spacer'),
        h('button.btn.sm', { text: 'Stok kartı ekle', onclick: stokEkleKip })
      ]),
      UI.panel(null, null, UI.tablo(['', 'Kod', 'Ad', 'Grup', 'Birim', 'Durum', ''],
        db.logo.stok.map(function (s) {
          return h('tr', {}, [
            h('td', { style: { width: '54px' } }, UI.kartela(s, '34px')),
            h('td.mono.small', { text: s.kod }),
            h('td.small', { text: s.ad }),
            h('td.small.muted', { text: s.grup }),
            h('td.mono.small', { text: s.birim }),
            h('td', {}, s.aktif ? UI.rozet('Aktif', 'ok') : UI.rozet('Pasif', 'warn')),
            h('td.right', {}, h('button.btn.ghost.sm', {
              text: s.aktif ? 'Pasife al' : 'Aktife al',
              onclick: function () { JP.logo.stokDurum(s.kod, !s.aktif); UI.toast('Stok kartı güncellendi', s.kod + ' → ' + (s.aktif ? 'pasif' : 'aktif'), 'ok'); }
            }))
          ]);
        })), true)
    ]);
  }

  function stokEkleKip() {
    var kod = h('input', { type: 'text', placeholder: 'ZEB-1200-GRI' });
    var ad = h('input', { type: 'text', placeholder: 'Zebra Perde Kumaşı 1200 · Gri' });
    var grup = h('select', {}, ['Zebra', 'Stor', 'Tül Stor', 'Sun Screen', 'Plise', 'Sineklik'].map(function (g) { return h('option', { value: g, text: g }); }));
    var birim = h('select', {}, ['MTR', 'ADET'].map(function (b) { return h('option', { value: b, text: b }); }));
    var renk = h('input', { type: 'text', value: '#9AA0A3' });

    UI.modal({ etiket: 'Logo ana verisi',
      icerik: h('div.grid.k2', {}, [
        h('label.f', {}, ['Stok kodu', kod]), h('label.f', {}, ['Ad', ad]),
        h('label.f', {}, ['Grup', grup]), h('label.f', {}, ['Birim', birim]),
        h('label.f', {}, ['Kartela rengi', renk])
      ]),
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', {
            text: 'Kartı oluştur',
            onclick: function () {
              UI.dene(function () {
                var doku = { 'Zebra': 'zebra', 'Stor': 'stor', 'Tül Stor': 'tul', 'Sun Screen': 'screen', 'Plise': 'plise', 'Sineklik': 'sineklik' }[grup.value];
                JP.logo.stokEkle(kod.value.trim(), ad.value.trim() || kod.value.trim(), grup.value, birim.value, renk.value, doku);
                kapat(); UI.toast('Stok kartı oluşturuldu', 'Portalda görünmesi için “Ürünleri Logo’dan al” çalıştırın.', 'ok');
              });
            }
          })
        ];
      }
    });
  }

  /* ------------------------------------------------------------ cari kartlar */
  function cari() {
    var db = JP.db;
    return UI.panel(null, h('span.small.muted', { text: 'Yurt içi / yurt dışı ayrımı cari karttan gelir' }),
      UI.tablo(['Kod', 'Unvan', 'Şehir', 'Ülke', 'E-posta', 'Durum', ''],
        db.logo.cari.map(function (c) {
          return h('tr', {}, [
            h('td.mono.small', { text: c.kod }),
            h('td.small', { text: c.unvan }),
            h('td.small.muted', { text: c.sehir }),
            h('td.small.mono', { text: c.ulke }),
            h('td.small.muted', { text: c.eposta }),
            h('td', {}, c.aktif ? UI.rozet('Aktif', 'ok') : UI.rozet('Pasif', 'warn')),
            h('td.right', {}, h('button.btn.ghost.sm', {
              text: c.aktif ? 'Pasife al' : 'Aktife al',
              onclick: function () { JP.logo.cariDurum(c.kod, !c.aktif); UI.toast('Cari kartı güncellendi', c.kod, 'ok'); }
            }))
          ]);
        })), true);
  }
})();
