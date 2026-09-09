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
          aciklama: 'Açık talepleriniz ve hangi üründen ne kadarının henüz sevk edilmediği.',
          ciz: dashboard },
        { id: 'katalog', ad: 'Ürün kataloğu', baslik: 'Ürün kataloğu',
          aciklama: 'Ürünleri sepete ekleyin; sepeti onayladığınızda satın alma talebi oluşur. Fiyat ve stok gösterilmez.',
          ciz: katalog, yan: agacPaneli, yanBaslik: 'Ürün ağacı' },
        { id: 'talepler', ad: 'Taleplerim', baslik: 'Satın alma taleplerim',
          aciklama: 'Taleplerinizin listesi. Bir talebe girince ürünleri, işlemleri ve hareketleri görürsünüz.',
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
  /* Bayi havuzu, rezervi, birimi görmez. Yalnızca kaç talebi açık ve açık
     taleplerinde hangi üründen ne kadarı henüz sevk edilmedi. */
  function acikTalepler(bayiKod) {
    return JP.db.talepler.filter(function (t) {
      if (t.bayiKod !== bayiKod) return false;
      var d = JP.talepDurumu(t);
      return d === 'Açık' || d === 'Kısmen Karşılandı';
    });
  }

  function sevkBekleyen(bayiKod) {
    var kutu = {};
    acikTalepler(bayiKod).forEach(function (t) {
      JP.talepKalemDurum(t).forEach(function (k) {
        var bekleyen = Math.max(0, k.talep - k.fatura);
        if (bekleyen <= 0.001) return;
        var r = (kutu[k.kalem.urunKod] = kutu[k.kalem.urunKod] || {
          urun: k.urun, kod: k.kalem.urunKod, talep: 0, sevk: 0, talepler: [], enEski: t.tarih
        });
        r.talep += k.talep;
        r.sevk += k.fatura;
        if (r.talepler.indexOf(t.no) < 0) r.talepler.push(t.no);
        if (t.tarih < r.enEski) r.enEski = t.tarih;
      });
    });
    return Object.keys(kutu).map(function (x) { return kutu[x]; })
      .sort(function (a, b) { return (b.talep - b.sevk) - (a.talep - a.sevk); });
  }

  function dashboard() {
    var bayi = aktifBayi();
    if (!bayi) return h('div.note.warn', { html: '<b>Bayi kartı yok.</b> Firma panelinden “Bayileri Logo’dan al” işlemini çalıştırın.' });

    var acik = acikTalepler(bayi.kod);
    var urunler = sevkBekleyen(bayi.kod);
    var sepetAdet = JP.sepetSayisi(bayi.kod);

    return h('div.stack', {}, [
      sepetAdet ? h('div.note', {}, [
        h('b', { text: 'Sepetinizde ' + sepetAdet + ' kalem bekliyor. ' }),
        h('span', { text: 'Onaylamadan talep oluşmaz. ' }),
        h('button.btn.sm', { text: 'Sepete git', onclick: function () { kabuk.git('sepet'); } })
      ]) : null,

      h('div.grid.k3', {}, [
        UI.kpi('Açık talep', String(acik.length), acik.length === 1 ? 'talep' : 'talep',
          acik.length ? 'Tamamı sevk edilmemiş talepleriniz' : 'Bekleyen talebiniz yok', true)
      ]),

      UI.panel('Sevkiyat bekleyen ürünler',
        h('div.row.tight', {}, [
          h('span.small.muted', { text: urunler.length + ' ürün' }),
          h('button.btn.ghost.sm', { text: 'Taleplerim', onclick: function () { kabuk.git('talepler'); } })
        ]),
        UI.tablo(['Ürün', { t: 'Talep edilen', num: true }, { t: 'Sevk edilen', num: true }, { t: 'Bekleyen', num: true }, 'Talepler'],
          urunler.map(function (r) {
            var bekleyen = r.talep - r.sevk;
            return h('tr', {}, [
              h('td', {}, h('div.row.tight', {}, [UI.kartela(r.urun, '26px', '40px'), h('div', {}, [
                h('div', { text: r.urun.ad }),
                h('div.pc.mono', { text: r.kod + ' · ' + r.urun.gosterimBirimi })
              ])])),
              h('td.num.mono', { text: JP.fmt.miktar(r.talep) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.sevk), style: { color: r.sevk > 0 ? 'var(--ok)' : 'var(--text-3)' } }),
              h('td.num.mono', { text: JP.fmt.miktar(bekleyen), style: { color: 'var(--warn)', fontWeight: '600' } }),
              h('td.small.muted', {}, h('div.row.tight', {}, r.talepler.map(function (no) {
                return h('button.tag', { style: { cursor: 'pointer' }, text: no, onclick: function () { talepAc(no); } });
              })))
            ]);
          }), 'Sevkiyat bekleyen ürününüz yok. Ürün kataloğundan sepete ekleyip talep oluşturabilirsiniz.'), true)
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
            h('span.mono', { text: satirlar.length + ' kalem' }),
            h('span.small.muted', { text: 'Miktarlar her ürünün kendi biriminden' }),
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
  var secilen = null;                 // açık talep detayı (talep no)
  var detayGorunum = 'urunler';       // urunler | islemler | hareketler

  function talepAc(no) { secilen = no; detayGorunum = 'urunler'; kabuk.git('talepler'); }

  /* Bir talebin kalemleri farklı birimlerde olabilir (metre, adet, top…), bu yüzden
     talep düzeyinde miktar toplanmaz. Özet kalem sayısıyla verilir. */
  function sevkDurumu(k) {
    if (k.fatura >= k.talep - 0.001) return 'tam';
    return k.fatura > 0.001 ? 'kismi' : 'yok';
  }

  function sevkSayim(kalemler) {
    var s = { tam: 0, kismi: 0, yok: 0, toplam: kalemler.length };
    kalemler.forEach(function (k) { s[sevkDurumu(k)]++; });
    return s;
  }

  function sevkBandi(s) {
    var t = Math.max(s.toplam, 1);
    return h('div.row.tight', { style: { width: '164px' } }, [
      h('div.bar', { style: { flex: '1 1 auto' }, title: s.tam + ' kalem tamamlandı, ' + s.kismi + ' kalem kısmen sevk edildi' }, [
        h('i', { style: { width: (s.tam / t * 100) + '%', background: 'var(--ok)' } }),
        h('i', { style: { width: (s.kismi / t * 100) + '%', background: 'var(--warn)' } })
      ]),
      h('span.small.mono.muted', { text: s.tam + ' / ' + s.toplam })
    ]);
  }

  function talepler() {
    var db = JP.db, bayi = aktifBayi();
    if (!bayi) return h('div.empty', { text: 'Bayi seçilmedi.' });

    if (secilen) {
      var t = db.talepler.find(function (x) { return x.no === secilen && x.bayiKod === bayi.kod; });
      if (t) return talepDetay(t);
      secilen = null;
    }

    var liste = db.talepler.filter(function (t) { return t.bayiKod === bayi.kod; });
    if (!liste.length) {
      return h('div.stack', {}, [
        h('div.empty', { text: 'Henüz satın alma talebiniz yok.' }),
        h('div.row', {}, [h('div.spacer'), h('button.btn.primary', { text: 'Ürün kataloğuna git', onclick: function () { kabuk.git('katalog'); } }), h('div.spacer')])
      ]);
    }

    return UI.panel('Talep listesi', h('span.small.muted', { text: liste.length + ' talep' }),
      UI.tablo(['Tarih', 'Talep no', 'Durum', { t: 'Kalem', num: true }, 'Sevkiyat', ''],
        liste.map(function (t) {
          var s2 = sevkSayim(JP.talepKalemDurum(t));
          return h('tr', { style: { cursor: 'pointer' }, onclick: function () { talepAc(t.no); } }, [
            h('td.small.nowrap', { text: JP.fmt.tarih(t.tarih) }),
            h('td.mono', { text: t.no, style: { fontWeight: '600' } }),
            h('td', {}, UI.rozet(JP.talepDurumu(t))),
            h('td.num.mono', { text: String(s2.toplam) }),
            h('td', {}, sevkBandi(s2)),
            h('td.right', {}, h('button.btn.ghost.sm', { text: 'Detay', onclick: function (e) { e.stopPropagation(); talepAc(t.no); } }))
          ]);
        })), true);
  }

  function talepDetay(t) {
    var kalemler = JP.talepKalemDurum(t);
    var islem = JP.talepIslemleri(t.no);
    var sayim = sevkSayim(kalemler);

    var govde = h('div.stack');
    function govdeCiz() {
      govde.textContent = '';
      if (detayGorunum === 'urunler') govde.appendChild(detayUrunler(t, kalemler));
      else if (detayGorunum === 'islemler') govde.appendChild(detayIslemler(t, islem));
      else govde.appendChild(detayHareketler(t));
    }
    govdeCiz();

    return h('div.stack', {}, [
      h('div.row', {}, [
        h('button.btn.ghost.sm', { text: '← Talep listesi', onclick: function () { secilen = null; kabuk.ciz(); } }),
        h('div.spacer')
      ]),
      UI.panel(null, null, h('div.stack', {}, [
        h('div.row', {}, [
          h('h2.mono', { text: t.no }),
          UI.rozet(JP.talepDurumu(t)),
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
        ['urunler', 'Ürünler (' + t.kalemler.length + ')'],
        ['islemler', 'İşlemler (' + (islem.siparisler.length + islem.faturalar.length) + ')'],
        ['hareketler', 'Hareketler']
      ].map(function (o) {
        return h('button', {
          'aria-pressed': String(detayGorunum === o[0]), text: o[1],
          onclick: function () { detayGorunum = o[0]; kabuk.ciz(); }
        });
      })),
      govde
    ]);
  }

  function detayUrunler(t, kalemler) {
    return UI.panel('Talep kalemleri', h('span.small.muted', { text: 'Miktarlar ürünün sipariş biriminden' }),
      UI.tablo(['Ürün', 'Birim', { t: 'Talep edilen', num: true }, { t: 'Sipariş oluşturulan', num: true }, { t: 'Sevk edilen', num: true }, { t: 'Bekleyen', num: true }, ''],
        kalemler.map(function (k) {
          var bekleyen = Math.max(0, k.talep - k.fatura);
          return h('tr', {}, [
            h('td', {}, h('div.row.tight', {}, [UI.kartela(k.urun, '26px', '40px'), h('div', {}, [
              h('div', { text: k.urun.ad }),
              h('div.pc.mono', { text: k.kalem.urunKod })
            ])])),
            h('td.small.muted.nowrap', { text: k.urun.gosterimBirimi + ' (' + k.urun.birim + ')' }),
            h('td.num.mono', { text: JP.fmt.miktar(k.talep) }),
            h('td.num.mono', { text: JP.fmt.miktar(k.siparis) }),
            h('td.num.mono', { text: JP.fmt.miktar(k.fatura), style: { color: k.fatura > 0 ? 'var(--ok)' : 'var(--text-3)' } }),
            h('td.num.mono', { text: JP.fmt.miktar(bekleyen), style: { color: bekleyen > 0 ? 'var(--warn)' : 'var(--text-3)', fontWeight: '600' } }),
            h('td.right', {}, k.acik > 0.001
              ? h('button.btn.ghost.sm', { text: 'Azalt / iptal', onclick: function () { azaltKip(t, k); } })
              : h('span.small.muted', { text: '—' }))
          ]);
        })), true);
  }

  function detayIslemler(t, islem) {
    return h('div.stack', {}, [
      UI.panel('Oluşturulan siparişler', h('span.small.muted', { text: 'Siparişi muhasebe oluşturur' }),
        UI.tablo(['Sipariş no', 'Tarih', 'Durum', 'Logo fiş', { t: 'Miktar', num: true }, { t: 'Faturalanan', num: true }],
          islem.siparisler.map(function (s) {
            return h('tr', {}, [
              h('td.mono', { text: s.no }),
              h('td.small.muted', { text: JP.fmt.tarih(s.tarih) }),
              h('td', {}, UI.rozet(s.durum)),
              h('td.mono.small', { text: s.logoFisNo || '—' }),
              h('td.num.mono', { text: JP.fmt.miktar(s.miktar) }),
              h('td.num.mono', { text: JP.fmt.miktar(s.faturalanan) })
            ]);
          }), 'Bu talepten henüz sipariş oluşturulmadı.'), true),
      UI.panel('Sevkiyat ve faturalar', h('span.small.muted', { text: 'Fatura kesildiğinde sevkiyat gerçekleşmiş sayılır' }),
        UI.tablo(['Fatura no', 'Tarih', 'Tip', 'Durum', { t: 'Sevk edilen', num: true }],
          islem.faturalar.map(function (f) {
            return h('tr', {}, [
              h('td.mono', { text: f.no }),
              h('td.small.muted', { text: JP.fmt.tarih(f.ts) }),
              h('td.small', { text: f.tur }),
              h('td', {}, f.gib === '—' ? h('span.small.muted', { text: '—' }) : UI.rozet(f.gib)),
              h('td.num.mono', { text: JP.fmt.miktar(f.miktar) })
            ]);
          }), 'Bu talepten henüz sevkiyat yapılmadı.'), true)
    ]);
  }

  /* Talebin geçmişi — iç hareket tipleri (dTalep/dRezerv/dFatura) yerine
     bayinin anlayacağı işlem adları. Faturayla birlikte yazılan rezerv
     çözümü teknik bir kayıt olduğu için listelenmez. */
  function islemAdi(x) {
    if (x.tip === 'dTalep') return x.miktar > 0 ? 'Talep oluşturuldu' : 'Talep azaltıldı';
    if (x.tip === 'dRezerv') return x.miktar > 0 ? 'Siparişe alındı' : 'Sipariş miktarı düşürüldü';
    return 'Sevk edildi';
  }

  function detayHareketler(t) {
    var hs = JP.db.havuz.filter(function (x) { return x.talepNo === t.no && !x.rezervKapanis; })
      .sort(function (a, b) { return b.ts.localeCompare(a.ts); });
    return UI.panel('Talep geçmişi', h('span.small.muted', { text: hs.length + ' kayıt' }),
      UI.tablo(['Tarih', 'Ürün', 'İşlem', { t: 'Miktar', num: true }, 'Belge'],
        hs.map(function (x) {
          var ad = islemAdi(x);
          return h('tr', {}, [
            h('td.small.nowrap', { text: JP.fmt.saat(x.ts) }),
            h('td.mono.small', { text: x.urunKod }),
            h('td', {}, UI.rozet(ad, x.tip === 'dFatura' ? 'ok' : (x.miktar > 0 ? 'info' : 'warn'))),
            h('td.num.mono', { text: JP.fmt.miktar(Math.abs(x.miktar)) }),
            h('td.mono.small.muted', { text: x.belge || '—' })
          ]);
        }), 'Kayıt yok.'), true);
  }

  function azaltKip(t, k) {
    var taban = k.rezerv + k.fatura;
    var girdi = h('input', { type: 'number', min: String(taban), step: '10', value: String(k.talep) });
    UI.modal({
      baslik: 'Talep miktarını azalt', etiket: t.no,
      icerik: h('div.stack', {}, [
        h('p', { text: k.urun.ad + ' (' + k.kalem.urunKod + ')' }),
        taban > 0 ? h('div.note.warn', { text: JP.fmt.miktar(taban) + ' birim siparişe alınmış veya sevk edilmiş; bu miktarın altına inilemez.' }) : null,
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

})();
