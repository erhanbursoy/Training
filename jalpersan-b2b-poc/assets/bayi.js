/* Bayi portalı — standart web uygulaması yerleşimi:
   üstte Dashboard / Ürün kataloğu / Taleplerim, sağ üstte sepet, bildirim ve profil.
   Katalogda sol yan panel ürün ağacıdır (grup → seri → renk varyantları).
   Sepet yalnızca taslaktır; havuza hareket ancak sepet onaylanınca yazılır. */
(function () {
  'use strict';
  var JP = window.JP, UI = JP.UI, h = UI.h;
  var kabuk = null;
  var filtre = { ara: '', dugum: null };
  var agacAcik = {};

  function aktifBayi() {
    var db = JP.db;
    var kod = sessionStorage.getItem('jp.bayi');
    if (!kod || !db.bayiler.some(function (b) { return b.kod === kod; })) {
      kod = (db.bayiler[0] || {}).kod || null;
      if (kod) sessionStorage.setItem('jp.bayi', kod);
    }
    return db.bayiler.find(function (b) { return b.kod === kod; }) || null;
  }

  function adim(u) { return u.birim === 'ADET' ? 1 : 10; }
  function varsayilan(u) { return u.birim === 'ADET' ? 1 : 50; }
  function bassiz(unvan) {
    return unvan.split(/\s+/).filter(function (p) { return /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(p[0]); })
      .slice(0, 2).map(function (p) { return p[0]; }).join('').toLocaleUpperCase('tr');
  }

  JP.bayiEkran = function () {
    kabuk = UI.kabuk({
      rol: 'bayi', rolAdi: 'Bayi portalı', baslik: 'Bayi portalı', altBaslik: 'Bayi portalı',
      ustMenu: true, ustSag: ustSag,
      bolumler: [
        { id: 'dashboard', ad: 'Dashboard', baslik: 'Dashboard',
          aciklama: 'Talep havuzunuzun dört bakiyesi, açık talepleriniz ve hareket dökümü.',
          ciz: dashboard },
        { id: 'katalog', ad: 'Ürün kataloğu', baslik: 'Ürün kataloğu',
          aciklama: 'Ürünleri sepete ekleyin; sepeti onayladığınızda satın alma talebi oluşur. Fiyat ve stok gösterilmez.',
          ciz: katalog, yan: agacPaneli, yanBaslik: 'Ürün ağacı' },
        { id: 'talepler', ad: 'Taleplerim', baslik: 'Satın alma taleplerim',
          aciklama: 'Her kalemin talep, siparişe dönen, faturalanan ve kalan miktarı.',
          ciz: talepler,
          sayi: function () { var b = aktifBayi(); return b ? JP.db.talepler.filter(function (t) { return t.bayiKod === b.kod; }).length : 0; } },
        { id: 'sepet', gizli: true, ad: 'Sepetim', baslik: 'Sepetim',
          aciklama: 'Miktarları gözden geçirin, notu ekleyin ve talebi gönderin.', ciz: sepetEkrani }
      ]
    });
  };

  /* ------------------------------------------------------- sağ üst eylemler */
  function ustSag(k) {
    var db = JP.db, bayi = aktifBayi();
    if (!db.bayiler.length) return h('span.small.muted', { text: "Bayi listesi henüz Logo'dan alınmadı" });

    var sepetAdet = JP.sepetSayisi(bayi.kod);
    var bildirimler = db.bildirim.filter(function (b) { return b.kime === bayi.kod; });
    var okunmamis = bildirimler.filter(function (b) { return !b.okundu; }).length;

    var sepetBtn = h('button.ikon-btn', {
      'aria-label': 'Sepetim, ' + sepetAdet + ' kalem', title: 'Sepetim',
      onclick: function () { k.git('sepet'); }
    }, [UI.ikon('sepet'), sepetAdet ? h('span.sayi', { text: String(sepetAdet) }) : null]);

    var zilBtn = h('button.ikon-btn', {
      'aria-label': 'Bildirimler' + (okunmamis ? ', ' + okunmamis + ' yeni' : ''),
      'aria-expanded': 'false', title: 'Bildirimler',
      onclick: function () { UI.acilir(zilBtn, function (kapat) { return bildirimPaneli(bayi, bildirimler, kapat); }); }
    }, [UI.ikon('zil'), okunmamis ? h('span.sayi.uyari', { text: String(okunmamis) }) : null]);

    var profilBtn = h('button.ikon-btn', {
      'aria-label': 'Profil ve oturum', 'aria-expanded': 'false', title: bayi.unvan,
      style: { width: 'auto', padding: '0 3px' },
      onclick: function () { UI.acilir(profilBtn, function (kapat) { return profilPaneli(bayi, kapat); }); }
    }, h('span.avatar', { text: bassiz(bayi.unvan) }));

    return h('div.eylemler', {}, [
      h('span.poc-flag', { text: 'Prototip', title: JP.SURUM }),
      h('span.ikon-ayrac'),
      sepetBtn, zilBtn, h('span.ikon-ayrac'), profilBtn
    ]);
  }

  function bildirimPaneli(bayi, liste, kapat) {
    return [
      h('div.ac-bas', {}, [
        h('h3', { text: 'Bildirimler' }), h('div.spacer'),
        liste.length ? h('button.btn.ghost.sm', {
          text: 'Tümünü okundu işaretle',
          onclick: function () { JP.tx(function (d) { d.bildirim.forEach(function (b) { if (b.kime === bayi.kod) b.okundu = true; }); }); kapat(); }
        }) : null
      ]),
      h('div.ac-govde', {}, liste.length
        ? liste.slice(0, 12).map(function (b) {
            return h('div.ac-satir', {}, [
              h('b', { text: b.baslik }),
              h('div.small', { text: b.metin }),
              h('div.z', { text: JP.fmt.saat(b.ts) + (b.okundu ? '' : ' · yeni') })
            ]);
          })
        : h('div.empty', { text: 'Bildirim yok.' }))
    ];
  }

  function profilPaneli(bayi, kapat) {
    var db = JP.db;
    return [
      h('div.ac-bas', {}, [
        h('span.avatar', { text: bassiz(bayi.unvan) }),
        h('div', {}, [
          h('h3', { text: bayi.unvan }),
          h('div.small.muted', { text: bayi.kod + ' · ' + bayi.sehir + '/' + bayi.ulke })
        ])
      ]),
      h('div.ac-govde', {}, [
        h('div.ac-satir', {}, [
          h('b', { text: 'Durum' }),
          h('div.row.tight', { style: { marginTop: '4px' } }, [
            bayi.siparisAcik ? UI.rozet('Siparişe açık', 'ok') : UI.rozet('Siparişe kapalı', 'warn'),
            h('span.small.muted', { text: kisitMetni(bayi) })
          ])
        ]),
        h('div.ac-satir', {}, [
          h('b', { text: 'E-posta' }), h('div.small.muted', { text: bayi.eposta })
        ]),
        h('div.ac-satir', {}, [
          h('b', { text: 'Oturum' }),
          h('div.z', { text: 'Prototipte bayi hesapları arasında geçiş yapabilirsiniz.' }),
          h('select', {
            style: { marginTop: '6px' },
            onchange: function (e) { sessionStorage.setItem('jp.bayi', e.target.value); kapat(); location.reload(); }
          }, db.bayiler.map(function (x) {
            return h('option', { value: x.kod, selected: x.kod === bayi.kod, text: x.unvan + (x.siparisAcik ? '' : ' — kapalı') });
          }))
        ])
      ]),
      h('div.ac-alt', {}, h('span.small.muted', { text: 'Gerçek kurulumda kimlik doğrulama ASP.NET Core Identity ile yapılır.' }))
    ];
  }

  function kisitMetni(b) {
    if (b.kisit.tip === 'tumu') return 'Tüm katalog açık';
    if (b.kisit.tip === 'gruplar') return b.kisit.gruplar.join(', ') + ' grupları';
    return b.kisit.urunler.length + ' seçili ürün';
  }

  /* ------------------------------------------------------------- dashboard */
  function dashboard() {
    var db = JP.db, bayi = aktifBayi();
    if (!bayi) return h('div.note.warn', { html: '<b>Bayi kartı yok.</b> Firma panelinden “Bayileri Logo’dan al” işlemini çalıştırın.' });

    var satirlar = JP.havuzOzet({ bayiKod: bayi.kod });
    var top = satirlar.reduce(function (t, r) {
      t.talep += r.talep; t.rezerv += r.rezerv; t.fatura += r.fatura; t.acik += r.acik; return t;
    }, { talep: 0, rezerv: 0, fatura: 0, acik: 0 });
    var hs = db.havuz.filter(function (x) { return x.bayiKod === bayi.kod; })
      .sort(function (a, b) { return b.ts.localeCompare(a.ts); });
    var talepler = db.talepler.filter(function (t) { return t.bayiKod === bayi.kod; });
    var yasli = satirlar.filter(function (r) { return r.acik > 0 && r.yas > 30; });
    var sepetAdet = JP.sepetSayisi(bayi.kod);

    return h('div.stack', {}, [
      sepetAdet ? h('div.note', {}, [
        h('b', { text: 'Sepetinizde ' + sepetAdet + ' kalem bekliyor. ' }),
        h('span', { text: 'Onaylamadan talep oluşmaz. ' }),
        h('button.btn.sm', { text: 'Sepete git', onclick: function () { kabuk.git('sepet'); } })
      ]) : null,
      yasli.length ? h('div.note.warn', {
        html: '<b>' + yasli.length + ' üründe 30 günü aşan açık talep var.</b> Muhasebe henüz siparişe dönüştürmedi.'
      }) : null,

      h('div.grid.k4', {}, [
        UI.kpi('Toplam talep', JP.fmt.miktar(top.talep), 'birim'),
        UI.kpi('Siparişte', JP.fmt.miktar(top.rezerv), 'birim', 'Rezerve edildi'),
        UI.kpi('Faturalanan', JP.fmt.miktar(top.fatura), 'birim', 'Süreci kapanan'),
        UI.kpi('Açık', JP.fmt.miktar(top.acik), 'birim', 'Siparişe dönmeyi bekleyen', true)
      ]),

      h('div.grid.k2', {}, [
        UI.panel('Son taleplerim', h('button.btn.ghost.sm', { text: 'Tümü', onclick: function () { kabuk.git('talepler'); } }),
          talepler.length
            ? UI.tablo(['Talep', 'Tarih', 'Durum', { t: 'Kalem', num: true }], talepler.slice(0, 6).map(function (t) {
                return h('tr', {}, [
                  h('td.mono.small', { text: t.no }),
                  h('td.small.muted', { text: JP.fmt.tarih(t.tarih) }),
                  h('td', {}, UI.rozet(JP.talepDurumu(t))),
                  h('td.num.mono', { text: String(t.kalemler.length) })
                ]);
              }))
            : h('div.stack', {}, [
                h('div.empty', { text: 'Henüz talebiniz yok.' }),
                h('div.row', {}, [h('div.spacer'), h('button.btn.primary', { text: 'Ürün kataloğuna git', onclick: function () { kabuk.git('katalog'); } }), h('div.spacer')])
              ]), true),
        UI.panel('Havuz dağılımı', UI.bantAciklama(),
          satirlar.length
            ? h('div.stack', { style: { gap: '10px' } }, satirlar.slice(0, 6).map(function (r) {
                var u = JP.db.urunler.find(function (x) { return x.kod === r.urunKod; }) || { ad: r.urunKod };
                return h('div', {}, [
                  h('div.row', { style: { justifyContent: 'space-between' } }, [
                    h('span.small', { text: u.ad }),
                    h('span.small.mono.muted', { text: JP.fmt.miktar(r.acik) + ' açık' })
                  ]),
                  UI.bant(r)
                ]);
              }))
            : h('div.empty', { text: 'Havuzda hareket yok.' }))
      ]),

      UI.panel('Ürün bazında bakiye', h('span.small.muted', { text: satirlar.length + ' ürün' }),
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

      UI.panel('Hareket dökümü', h('span.small.muted', { text: hs.length + ' hareket · bakiye bu hareketlerden hesaplanır' }),
        hareketTablosu(hs.slice(0, 40)), true)
    ]);
  }

  /* --------------------------------------------------------- ürün ağacı */
  function agacPaneli() {
    var bayi = aktifBayi();
    if (!bayi) return h('div.small.muted', { text: 'Bayi seçilmedi.' });
    var agac = JP.urunAgaci(bayi.kod);

    function dugum(ad, adet, secili, tikla, cocukMu) {
      return h('button.dugum', {
        'aria-current': String(secili), onclick: tikla
      }, [h('span.ad', { text: ad }), h('span.adet', { text: String(adet) })]);
    }

    var kok = h('div.agac');
    kok.appendChild(h('div.dal', {}, [
      h('span.kanca.bos'),
      dugum('Tüm ürünler', agac.toplam, !filtre.dugum, function () { filtre.dugum = null; kabuk.ciz(); })
    ]));

    agac.gruplar.forEach(function (g) {
      var acik = agacAcik[g.ad] !== false && (agacAcik[g.ad] || (filtre.dugum && filtre.dugum.grup === g.ad));
      var secili = !!(filtre.dugum && filtre.dugum.grup === g.ad && !filtre.dugum.seri);
      var kanca = h('button.kanca', {
        'aria-expanded': String(!!acik), 'aria-label': g.ad + ' alt kırılımı',
        onclick: function () { agacAcik[g.ad] = !acik; kabuk.ciz(); }
      }, UI.ikon('ok', 13));
      kok.appendChild(h('div.dal', {}, [
        g.seriler.length > 1 ? kanca : h('span.kanca.bos'),
        dugum(g.ad, g.adet, secili, function () { filtre.dugum = { grup: g.ad }; agacAcik[g.ad] = true; kabuk.ciz(); })
      ]));
      if (acik && g.seriler.length > 1) {
        kok.appendChild(h('div.cocuk', {}, g.seriler.map(function (se) {
          var s2 = !!(filtre.dugum && filtre.dugum.grup === g.ad && filtre.dugum.seri === se.kod);
          return h('div.dal', {}, [
            h('span.kanca.bos'),
            dugum(se.ad, se.adet, s2, function () { filtre.dugum = { grup: g.ad, seri: se.kod }; kabuk.ciz(); })
          ]);
        })));
      }
    });

    return [
      h('div.eyebrow', { text: 'Ürün ağacı' }),
      kok,
      h('div.yan-alt', {}, [
        h('div.small.muted', { text: 'Kırılım Logo stok kodundan türetilir: grup → seri → renk varyantı.' })
      ])
    ];
  }

  /* ------------------------------------------------------------- katalog */
  function katalog() {
    var bayi = aktifBayi();
    if (!bayi) return h('div.note.warn', { html: '<b>Bayi kartı yok.</b> Firma panelinden “Bayileri Logo’dan al” işlemini çalıştırın.' });

    var tumu = JP.bayiUrunleri(bayi.kod);
    var kap = h('div.stack');

    if (!bayi.siparisAcik) {
      kap.appendChild(h('div.note.warn', { html: '<b>Hesabınız siparişe kapalı.</b> Kataloğu görüntüleyebilirsiniz, sepete ürün eklenemez.' }));
    }
    if (bayi.kisit.tip !== 'tumu') {
      kap.appendChild(h('div.note', { html: '<b>Sınırlı katalog.</b> Firma tarafından ' + kisitMetni(bayi).toLocaleLowerCase('tr') + ' açılmış.' }));
    }
    if (!tumu.length) { kap.appendChild(h('div.empty', { text: 'Bu bayiye açık ürün bulunmuyor.' })); return kap; }

    var izgara = h('div.stack');
    var sayimEl = h('span.small.muted');
    var araGirdi = h('input.ara', {
      type: 'text', value: filtre.ara, placeholder: 'Ürün adı, stok kodu veya özellik ara…',
      'aria-label': 'Katalogda ara',
      oninput: function (e) { filtre.ara = e.target.value; izgaraCiz(); }
    });

    function izgaraCiz() {
      var liste = JP.urunSuz(bayi.kod, filtre.dugum, filtre.ara);
      sayimEl.textContent = liste.length + ' / ' + tumu.length + ' ürün';
      izgara.textContent = '';
      if (!liste.length) { izgara.appendChild(h('div.empty', { text: 'Bu kırılımda ürün yok.' })); return; }
      var gruplar = [];
      liste.forEach(function (u) { if (gruplar.indexOf(u.grup) < 0) gruplar.push(u.grup); });
      gruplar.forEach(function (g) {
        var grupUrun = liste.filter(function (u) { return u.grup === g; });
        if (gruplar.length > 1 || !filtre.dugum) {
          izgara.appendChild(h('div.grp', {}, [h('h2', { text: g }), h('span.rule'), h('span.adet', { text: grupUrun.length + ' ürün' })]));
        }
        izgara.appendChild(h('div.cat', {}, grupUrun.map(function (u) { return urunKarti(u, bayi); })));
      });
    }
    izgaraCiz();

    kap.appendChild(h('div.cat-bar', {}, [
      araGirdi,
      filtre.dugum ? h('button.chip', {
        'aria-pressed': 'true',
        text: (filtre.dugum.grup || '') + (filtre.dugum.seri ? ' · ' + filtre.dugum.seri : '') + '  ✕',
        title: 'Kırılımı temizle',
        onclick: function () { filtre.dugum = null; kabuk.ciz(); }
      }) : null,
      h('div.spacer'),
      sayimEl
    ]));
    kap.appendChild(izgara);
    return kap;
  }

  function sepetteMiktar(bayiKod, urunKod) {
    var s = JP.sepetOku(bayiKod).find(function (x) { return x.urunKod === urunKod; });
    return s ? s.miktar : 0;
  }

  function urunKarti(u, bayi) {
    var sepette = sepetteMiktar(bayi.kod, u.kod);
    var sayac = UI.sayac({ deger: varsayilan(u), adim: adim(u), enAz: 0, etiket: u.ad + ' miktarı' });

    return h('div.prod' + (sepette ? '.sepette' : ''), {}, [
      h('button.gorsel', {
        type: 'button', 'aria-label': u.ad + ' — ürün bilgisi',
        onclick: function () { urunDetay(u, bayi); }
      }, [
        UI.kartela(u, '96px'),
        sepette ? h('span.sepette-rozet', { text: 'sepette ' + JP.fmt.miktar(sepette) }) : null,
        h('span.buyut', { text: 'Detay' })
      ]),
      h('div.pb', {}, [
        h('div.pg', { text: u.grup }),
        h('div.pn', { text: u.ad, title: u.ad }),
        h('div.pc', { text: u.kod }),
        h('div.po', { text: u.ozellik || u.aciklama || '' }),
        h('div.pf', {}, [
          sayac,
          h('button.btn.primary.sm', {
            text: sepette ? 'Ekle' : 'Sepete ekle', disabled: !bayi.siparisAcik,
            onclick: function () {
              UI.dene(function () {
                var yeni = JP.sepetEkle(bayi.kod, u.kod, sayac.deger());
                UI.toast('Sepete eklendi', u.ad + ' · sepette ' + JP.fmt.miktar(yeni) + ' ' + u.birim, 'ok');
              });
            }
          })
        ]),
        h('div.small.muted', { text: 'Birim: ' + u.gosterimBirimi })
      ])
    ]);
  }

  function urunDetay(u, bayi) {
    var sayac = UI.sayac({ deger: varsayilan(u), adim: adim(u), enAz: 0, etiket: 'Miktar' });
    var sepette = sepetteMiktar(bayi.kod, u.kod);
    UI.modal({
      baslik: u.ad, etiket: u.kod, genis: true,
      icerik: h('div.grid.k2', {}, [
        h('div', {}, UI.kartela(u, '190px')),
        h('div.stack', {}, [
          h('dl.kv', {}, [
            h('dt', { text: 'Stok kodu' }), h('dd.mono', { text: u.kod }),
            h('dt', { text: 'Katalog grubu' }), h('dd', { text: u.grup }),
            h('dt', { text: 'Sipariş birimi' }), h('dd', { text: u.gosterimBirimi + ' (' + u.birim + ')' }),
            h('dt', { text: 'Teknik özellik' }), h('dd', { text: u.ozellik || '—' })
          ]),
          u.aciklama ? h('p.small.muted', { text: u.aciklama }) : null,
          sepette ? h('div.note', { text: 'Bu üründen sepetinizde ' + JP.fmt.miktar(sepette) + ' ' + u.birim + ' var. Ekleyeceğiniz miktar üstüne eklenir.' }) : null,
          h('div.small.muted', { text: 'Fiyat ve stok bilgisi bayi ekranında gösterilmez.' })
        ])
      ]),
      aksiyonlar: function (kapat) {
        return [
          h('div.row.tight', {}, [h('span.small.muted', { text: 'Miktar' }), sayac]),
          h('div.spacer'),
          h('button.btn', { text: 'Kapat', onclick: kapat }),
          h('button.btn.primary', {
            text: 'Sepete ekle', disabled: !bayi.siparisAcik,
            onclick: function () {
              UI.dene(function () {
                var yeni = JP.sepetEkle(bayi.kod, u.kod, sayac.deger());
                kapat();
                UI.toast('Sepete eklendi', u.ad + ' · sepette ' + JP.fmt.miktar(yeni) + ' ' + u.birim, 'ok');
              });
            }
          })
        ];
      }
    });
  }

  /* --------------------------------------------------------------- sepet */
  function sepetEkrani() {
    var bayi = aktifBayi();
    if (!bayi) return h('div.empty', { text: 'Bayi seçilmedi.' });
    var satirlar = JP.sepetOku(bayi.kod);

    if (!satirlar.length) {
      return h('div.stack', {}, [
        h('div.empty', { text: 'Sepetiniz boş.' }),
        h('div.row', {}, [h('div.spacer'), h('button.btn.primary', { text: 'Ürün kataloğuna git', onclick: function () { kabuk.git('katalog'); } }), h('div.spacer')])
      ]);
    }

    var toplam = satirlar.reduce(function (t, s) { return t + s.miktar; }, 0);
    var gecersiz = satirlar.filter(function (s) { return s.gecersiz; });
    var notAlan = h('textarea', { placeholder: bayi.teslimatNotu || 'Teslimat, ambalaj veya ton notu…' });
    var tarihAlan = h('input', { type: 'date' });

    function onayla() {
      UI.modal({
        baslik: 'Talebi gönder', etiket: bayi.unvan, genis: true,
        icerik: h('div.stack', {}, [
          UI.tablo(['Ürün', 'Kod', { t: 'Miktar', num: true }], satirlar.map(function (s) {
            return h('tr', {}, [
              h('td', { text: s.urun.ad }),
              h('td.mono.small', { text: s.urunKod }),
              h('td.num.mono', { text: JP.fmt.miktar(s.miktar) + ' ' + s.urun.birim })
            ]);
          })),
          notAlan.value ? h('div.small.muted', { text: 'Not: ' + notAlan.value }) : null,
          tarihAlan.value ? h('div.small.muted', { text: 'İstenen teslim tarihi: ' + JP.fmt.tarih(tarihAlan.value) }) : null,
          h('div.note', { text: 'Onayladığınızda numaralı bir satın alma talebi oluşur, muhasebeye bildirim gider ve havuza giriş hareketleri yazılır. Bu bir sipariş değildir; siparişi muhasebe oluşturur.' })
        ]),
        aksiyonlar: function (kapat) {
          return [
            h('button.btn', { text: 'Vazgeç', onclick: kapat }),
            h('button.btn.primary', {
              text: 'Onayla ve gönder',
              onclick: function () {
                UI.dene(function () {
                  var t = JP.sepetOnayla(bayi.kod, notAlan.value, tarihAlan.value || null);
                  kapat();
                  UI.toast('Talep oluşturuldu', t.no + ' · muhasebeye bildirim gitti.', 'ok');
                  kabuk.git('talepler');
                });
              }
            })
          ];
        }
      });
    }

    return h('div.stack', {}, [
      gecersiz.length ? h('div.note.bad', {
        html: '<b>' + gecersiz.map(function (s) { return s.urunKod; }).join(', ') + ' artık siparişe kapalı.</b> Talebi göndermeden önce sepetten çıkarın.'
      }) : null,
      UI.panel('Sepet (' + satirlar.length + ' kalem)',
        h('button.btn.ghost.sm', { text: 'Sepeti boşalt', onclick: function () { UI.onay('Sepeti boşalt', 'Sepetteki tüm kalemler silinecek.', function () { JP.sepetTemizle(bayi.kod); }, true); } }),
        h('div', {}, [
          h('div', {}, satirlar.map(function (s) { return sepetSatiri(bayi, s); })),
          h('div.sepet-ozet', {}, [
            h('span.small.muted', { text: satirlar.length + ' kalem' }),
            h('span.mono', { text: JP.fmt.miktar(toplam) + ' birim' }),
            h('div.spacer'),
            h('button.btn', { text: 'Alışverişe devam et', onclick: function () { kabuk.git('katalog'); } })
          ])
        ]), true),
      UI.panel('Talep bilgileri', null, h('div.grid.k2', {}, [
        h('label.f', {}, ['Talep notu', notAlan]),
        h('label.f', {}, ['İstenen teslim tarihi (opsiyonel)', tarihAlan])
      ])),
      h('div.row', {}, [
        h('div.spacer'),
        h('button.btn.primary', {
          text: 'Sepeti onayla ve talebi gönder',
          disabled: !bayi.siparisAcik || !!gecersiz.length, onclick: onayla
        })
      ])
    ]);
  }

  function sepetSatiri(bayi, s) {
    var u = s.urun || { ad: s.urunKod, birim: '', doku: 'diger', renk: '#B9AE99', gosterimBirimi: '' };
    var sayac = UI.sayac({
      deger: s.miktar, adim: adim(u), enAz: 0, etiket: u.ad + ' miktarı',
      onDegisim: function (v) { UI.dene(function () { JP.sepetMiktar(bayi.kod, s.urunKod, v); }); }
    });
    return h('div.sepet-satir', {}, [
      UI.kartela(u, '40px'),
      h('div', {}, [
        h('div.ad', { text: u.ad }),
        h('div.alt', { text: s.urunKod + ' · ' + (u.ozellik || u.gosterimBirimi) }),
        s.gecersiz ? UI.rozet('Siparişe kapalı', 'bad') : null
      ]),
      h('div.row.tight', {}, [sayac, h('span.small.muted', { text: u.birim })]),
      h('button.btn.ghost.sm', { text: 'Çıkar', onclick: function () { JP.sepetCikar(bayi.kod, s.urunKod); } })
    ]);
  }

  /* ------------------------------------------------------------ taleplerim */
  function talepler() {
    var db = JP.db, bayi = aktifBayi();
    if (!bayi) return h('div.empty', { text: 'Bayi seçilmedi.' });
    var liste = db.talepler.filter(function (t) { return t.bayiKod === bayi.kod; });
    if (!liste.length) {
      return h('div.stack', {}, [
        h('div.empty', { text: 'Henüz satın alma talebiniz yok.' }),
        h('div.row', {}, [h('div.spacer'), h('button.btn.primary', { text: 'Ürün kataloğuna git', onclick: function () { kabuk.git('katalog'); } }), h('div.spacer')])
      ]);
    }

    return h('div.stack', {}, liste.map(function (t) {
      var kalemler = JP.talepKalemDurum(t);
      return UI.panel(null, null, h('div.stack', {}, [
        h('div.row', {}, [
          h('span.mono', { text: t.no, style: { fontWeight: '600' } }),
          UI.rozet(JP.talepDurumu(t)),
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
                text: 'Azalt / iptal', onclick: function () { azaltKip(t, k); }
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
})();
