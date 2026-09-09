/* Bayi portalı — katalog, satın alma talebi, kendi havuz dökümü.
   Bayi fiyat ve stok görmez (teknik doküman 1.1). */
(function () {
  'use strict';
  var JP = window.JP, UI = JP.UI, h = UI.h;

  function aktifBayi() {
    var db = JP.db;
    var kod = sessionStorage.getItem('jp.bayi');
    if (!kod || !db.bayiler.some(function (b) { return b.kod === kod; })) {
      kod = (db.bayiler[0] || {}).kod || null;
      if (kod) sessionStorage.setItem('jp.bayi', kod);
    }
    return db.bayiler.find(function (b) { return b.kod === kod; }) || null;
  }

  var sepet = {};          // urunKod -> miktar

  JP.bayiEkran = function () {
    UI.kabuk({
      rol: 'bayi', rolAdi: 'Bayi portalı', baslik: 'Bayi portalı', altBaslik: 'B2B satın alma talebi',
      railBaslik: 'Bayi',
      ustSag: bayiSecici,
      bolumler: [
        { id: 'katalog', ad: 'Ürün kataloğu', baslik: 'Ürün kataloğu',
          aciklama: 'Yetkili olduğunuz ürünlerden miktar girip satın alma talebi gönderin. Fiyat ve stok bilgisi gösterilmez.',
          ciz: katalog, sayi: function () { var b = aktifBayi(); return b ? JP.bayiUrunleri(b.kod).length : 0; } },
        { id: 'talepler', ad: 'Taleplerim', baslik: 'Satın alma taleplerim',
          aciklama: 'Her kalemin talep, siparişe dönen, faturalanan ve kalan miktarını görürsünüz.',
          ciz: talepler, sayi: function () { var b = aktifBayi(); return b ? JP.db.talepler.filter(function (t) { return t.bayiKod === b.kod; }).length : 0; } },
        { id: 'havuz', ad: 'Talep havuzum', baslik: 'Talep havuzu',
          aciklama: 'Ürün bazında dört bakiye ve hareket dökümü. Bakiye saklanmaz, hareketlerden hesaplanır.',
          ciz: havuz },
        { id: 'bildirim', ad: 'Bildirimler', baslik: 'Bildirimler',
          aciklama: 'Sipariş ve fatura kapanışlarında portalın gönderdiği bilgilendirmeler.', ciz: bildirimler }
      ]
    });
  };

  function bayiSecici() {
    var db = JP.db, b = aktifBayi();
    if (!db.bayiler.length) return h('span.small.muted', { text: 'Bayi listesi henüz Logo\'dan alınmadı' });
    return h('label.row.tight', {}, [
      h('span.small.muted', { text: 'Oturum:' }),
      h('select', {
        style: { width: 'auto', minWidth: '210px' },
        onchange: function (e) { sessionStorage.setItem('jp.bayi', e.target.value); sepet = {}; location.reload(); }
      }, db.bayiler.map(function (x) {
        return h('option', { value: x.kod, selected: b && x.kod === b.kod, text: x.unvan + (x.siparisAcik ? '' : ' — siparişe kapalı') });
      }))
    ]);
  }

  /* ------------------------------------------------------------- katalog */
  function katalog() {
    var db = JP.db, bayi = aktifBayi();
    if (!bayi) return h('div.note.warn', { html: '<b>Bayi kartı yok.</b> Firma panelinden “Bayileri Logo\'dan al” işlemini çalıştırın.' });

    var urunler = JP.bayiUrunleri(bayi.kod);
    var kap = h('div.stack');

    if (!bayi.siparisAcik) {
      kap.appendChild(h('div.note.warn', { html: '<b>Hesabınız siparişe kapalı.</b> Talepleri görüntüleyebilirsiniz, yeni talep oluşturulamaz.' }));
    }
    if (bayi.kisit.tip !== 'tumu') {
      kap.appendChild(h('div.note', {
        html: '<b>Sınırlı katalog.</b> Firma tarafından yalnızca ' +
          (bayi.kisit.tip === 'gruplar' ? bayi.kisit.gruplar.join(', ') + ' grupları' : bayi.kisit.urunler.length + ' ürün') + ' açılmış.'
      }));
    }
    if (!urunler.length) {
      kap.appendChild(h('div.empty', { text: 'Bu bayiye açık ürün bulunmuyor.' }));
      return kap;
    }

    // grup grup katalog
    var gruplar = [];
    urunler.forEach(function (u) { if (gruplar.indexOf(u.grup) < 0) gruplar.push(u.grup); });

    var ozetEl = h('div');
    function ozetCiz() {
      var kalemler = Object.keys(sepet).filter(function (k) { return sepet[k] > 0; });
      ozetEl.textContent = '';
      if (!kalemler.length) {
        ozetEl.appendChild(h('div.note', { text: 'Miktar girdiğiniz ürünler burada toplanır. Talebi gönderdiğinizde havuza giriş hareketi yazılır.' }));
        return;
      }
      var toplam = kalemler.reduce(function (t, k) { return t + sepet[k]; }, 0);
      ozetEl.appendChild(UI.panel('Talep özeti (' + kalemler.length + ' kalem · ' + JP.fmt.miktar(toplam) + ' birim)',
        h('button.btn.ghost.sm', { text: 'Temizle', onclick: function () { sepet = {}; ciz(); } }),
        h('div.stack', {}, [
          UI.tablo(['Ürün', 'Kod', { t: 'Miktar', num: true }, ''], kalemler.map(function (kod) {
            var u = db.urunler.find(function (x) { return x.kod === kod; });
            return h('tr', {}, [
              h('td', { text: u.ad }),
              h('td.mono.small', { text: kod }),
              h('td.num.mono', { text: JP.fmt.miktar(sepet[kod]) + ' ' + u.birim }),
              h('td.right', {}, h('button.btn.ghost.sm', { text: 'Çıkar', onclick: function () { delete sepet[kod]; ciz(); } }))
            ]);
          })),
          h('div.grid.k2', {}, [
            h('label.f', {}, ['Talep notu', h('textarea', { id: 'b-not', placeholder: bayi.teslimatNotu || 'Teslimat, ambalaj veya ton notu…' })]),
            h('label.f', {}, ['İstenen teslim tarihi (opsiyonel)', h('input', { type: 'date', id: 'b-tarih' })])
          ]),
          h('div.row', {}, [
            h('div.spacer'),
            h('button.btn.primary', {
              text: 'Satın alma talebini gönder', disabled: !bayi.siparisAcik,
              onclick: function () {
                UI.dene(function () {
                  var t = JP.talepOlustur(bayi.kod,
                    kalemler.map(function (k) { return { urunKod: k, miktar: sepet[k] }; }),
                    (document.getElementById('b-not') || {}).value,
                    (document.getElementById('b-tarih') || {}).value || null);
                  sepet = {};
                  UI.toast('Talep gönderildi', t.no + ' · muhasebeye bildirim gitti, havuza giriş hareketi yazıldı.', 'ok');
                });
              }
            })
          ])
        ])));
    }

    var katalogEl = h('div.stack');
    function ciz() {
      katalogEl.textContent = '';
      gruplar.forEach(function (g) {
        var grupUrun = urunler.filter(function (u) { return u.grup === g; });
        katalogEl.appendChild(h('div.grp', {}, [
          h('h2', { text: g }), h('span.rule'), h('span.adet', { text: grupUrun.length + ' ürün' })
        ]));
        katalogEl.appendChild(h('div.cat', {}, grupUrun.map(urunKarti)));
      });
      ozetCiz();
    }

    function urunKarti(u) {
      var girdi = h('input.qty', {
        type: 'number', min: '0', step: '10', value: sepet[u.kod] || '',
        'aria-label': u.ad + ' miktarı', disabled: !bayi.siparisAcik,
        oninput: function (e) {
          var v = parseFloat(e.target.value);
          if (v > 0) sepet[u.kod] = v; else delete sepet[u.kod];
          ozetCiz();
        }
      });
      return h('div.prod', {}, [
        UI.kartela(u),
        h('div.pb', {}, [
          h('div', {}, [h('div.pn', { text: u.ad }), h('div.pc', { text: u.kod })]),
          h('div.pd', { text: u.aciklama || JP.aciklamaOf(u.grup) }),
          h('div.pf', {}, [girdi, h('span.unit', { text: u.gosterimBirimi })])
        ])
      ]);
    }

    ciz();
    kap.appendChild(ozetEl);
    kap.appendChild(katalogEl);
    return kap;
  }

  /* ------------------------------------------------------------ taleplerim */
  function talepler() {
    var db = JP.db, bayi = aktifBayi();
    if (!bayi) return h('div.empty', { text: 'Bayi seçilmedi.' });
    var liste = db.talepler.filter(function (t) { return t.bayiKod === bayi.kod; });
    if (!liste.length) return h('div.empty', { text: 'Henüz satın alma talebiniz yok. Ürün kataloğundan miktar girip talep oluşturun.' });

    return h('div.stack', {}, liste.map(function (t) {
      var durum = JP.talepDurumu(t);
      var kalemler = JP.talepKalemDurum(t);
      return UI.panel(null, null, h('div.stack', {}, [
        h('div.row', {}, [
          h('span.mono', { text: t.no, style: { fontWeight: '600' } }),
          UI.rozet(durum),
          h('span.small.muted', { text: JP.fmt.tarih(t.tarih) + ' · ' + JP.gunFark(t.tarih) + ' gün önce' }),
          t.teslimTarihi ? h('span.tag', { text: 'Teslim ' + JP.fmt.tarih(t.teslimTarihi) }) : null,
          h('div.spacer'),
          h('button.btn.ghost.sm', { text: 'Hareketler', onclick: function () { hareketKip(t.no); } })
        ]),
        t.not ? h('div.small.muted', { text: '“' + t.not + '”' }) : null,
        UI.tablo(['Ürün', { t: 'Talep', num: true }, { t: 'Siparişte', num: true }, { t: 'Faturalanan', num: true }, { t: 'Kalan', num: true }, 'Dağılım', ''],
          kalemler.map(function (k) {
            return h('tr', {}, [
              h('td', {}, [h('div', { text: k.urun.ad }), h('div.pc.mono', { text: k.kalem.urunKod })]),
              h('td.num.mono', { text: JP.fmt.miktar(k.talep) }),
              h('td.num.mono', { text: JP.fmt.miktar(k.rezerv) }),
              h('td.num.mono', { text: JP.fmt.miktar(k.fatura) }),
              h('td.num.mono', { text: JP.fmt.miktar(k.acik), style: { color: k.acik > 0 ? 'var(--warn)' : 'var(--text-3)' } }),
              h('td', { style: { width: '150px' } }, UI.bant(k)),
              h('td.right', {}, k.acik > 0.001 ? h('button.btn.ghost.sm', {
                text: 'Azalt / iptal',
                onclick: function () { azaltKip(t, k); }
              }) : h('span.small.muted', { text: '—' }))
            ]);
          }))
      ]));
    }));
  }

  function azaltKip(t, k) {
    var taban = k.rezerv + k.fatura;
    var girdi = h('input', { type: 'number', min: String(taban), step: '10', value: String(k.talep) });
    UI.modal({
      baslik: 'Talep miktarını azalt', etiket: t.no,
      icerik: h('div.stack', {}, [
        h('p', { text: k.urun.ad + ' (' + k.kalem.urunKod + ')' }),
        taban > 0 ? h('div.note.warn', { text: JP.fmt.miktar(taban) + ' birim siparişe dönmüş veya faturalanmış; bu miktarın altına inilemez.' }) : null,
        h('label.f', {}, ['Yeni talep miktarı', girdi]),
        h('div.small.muted', { text: 'Fark, havuza ters hareket olarak yazılır. Mevcut kayıt değiştirilmez.' })
      ]),
      aksiyonlar: function (kapat) {
        return [
          taban === 0 ? h('button.btn.danger', {
            text: 'Kalemi iptal et',
            onclick: function () { kapat(); UI.dene(function () { JP.talepKalemAzalt(t.no, k.kalem.id, 0); UI.toast('Kalem iptal edildi', 'Havuza ters hareket yazıldı.', 'ok'); }); }
          }) : null,
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', {
            text: 'Kaydet',
            onclick: function () {
              kapat();
              UI.dene(function () { JP.talepKalemAzalt(t.no, k.kalem.id, parseFloat(girdi.value) || 0); UI.toast('Talep güncellendi', null, 'ok'); });
            }
          })
        ];
      }
    });
  }

  function hareketKip(talepNo) {
    var hs = JP.db.havuz.filter(function (x) { return x.talepNo === talepNo; })
      .sort(function (a, b) { return b.ts.localeCompare(a.ts); });
    UI.modal({ baslik: 'Havuz hareketleri', etiket: talepNo, genis: true, icerik: hareketTablosu(hs) });
  }

  function hareketTablosu(hs) {
    return UI.tablo(['Tarih', 'Ürün', 'Tip', { t: 'Miktar', num: true }, 'Kaynak', 'Belge', 'Açıklama'],
      hs.map(function (x) {
        return h('tr.ledger', {}, [
          h('td.small.nowrap', { text: JP.fmt.saat(x.ts) }),
          h('td.mono.small', { text: x.urunKod }),
          h('td', {}, h('span.tag', { text: x.tip })),
          h('td.num.mono' + (x.miktar < 0 ? '.sgn-neg' : '.sgn-pos'), { text: (x.miktar > 0 ? '+' : '') + JP.fmt.miktar(x.miktar) }),
          h('td', {}, h('span.src.' + x.kaynak, { text: x.kaynak })),
          h('td.mono.small', { text: x.belge || '—' }),
          h('td.small.muted', { text: x.aciklama })
        ]);
      }), 'Hareket yok.');
  }
  JP.hareketTablosu = hareketTablosu;

  /* ----------------------------------------------------------------- havuz */
  function havuz() {
    var bayi = aktifBayi();
    if (!bayi) return h('div.empty', { text: 'Bayi seçilmedi.' });
    var satirlar = JP.havuzOzet({ bayiKod: bayi.kod });
    var top = satirlar.reduce(function (t, r) {
      t.talep += r.talep; t.rezerv += r.rezerv; t.fatura += r.fatura; t.acik += r.acik; return t;
    }, { talep: 0, rezerv: 0, fatura: 0, acik: 0 });
    var hs = JP.db.havuz.filter(function (x) { return x.bayiKod === bayi.kod; })
      .sort(function (a, b) { return b.ts.localeCompare(a.ts); });

    return h('div.stack', {}, [
      h('div.grid.k4', {}, [
        UI.kpi('Toplam talep', JP.fmt.miktar(top.talep)),
        UI.kpi('Siparişte', JP.fmt.miktar(top.rezerv)),
        UI.kpi('Faturalanan', JP.fmt.miktar(top.fatura)),
        UI.kpi('Açık', JP.fmt.miktar(top.acik), null, 'Siparişe dönmeyi bekleyen', true)
      ]),
      UI.panel('Ürün bazında bakiye', UI.bantAciklama(),
        UI.tablo(['Ürün', { t: 'Talep', num: true }, { t: 'Siparişte', num: true }, { t: 'Faturalanan', num: true }, { t: 'Açık', num: true }, 'Dağılım', { t: 'Yaş', num: true }],
          satirlar.map(function (r) {
            var u = JP.db.urunler.find(function (x) { return x.kod === r.urunKod; }) || { ad: r.urunKod };
            return h('tr', {}, [
              h('td', {}, [h('div', { text: u.ad }), h('div.pc.mono', { text: r.urunKod })]),
              h('td.num.mono', { text: JP.fmt.miktar(r.talep) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.rezerv) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.fatura) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.acik) }),
              h('td', { style: { width: '150px' } }, UI.bant(r)),
              h('td.num.small.muted', { text: r.yas + ' g' })
            ]);
          }), 'Havuzda hareket yok.'), true),
      UI.panel('Hareket dökümü', h('span.small.muted', { text: hs.length + ' hareket' }), hareketTablosu(hs), true)
    ]);
  }

  function bildirimler() {
    var bayi = aktifBayi();
    var liste = JP.db.bildirim.filter(function (b) { return b.kime === (bayi && bayi.kod); });
    if (!liste.length) return h('div.empty', { text: 'Bildirim yok.' });
    return h('div.stack', {}, liste.map(function (b) {
      return h('div.note', {}, [h('b', { text: b.baslik }), h('div', { text: b.metin }), h('div.small.muted', { text: JP.fmt.saat(b.ts) })]);
    }));
  }
})();
