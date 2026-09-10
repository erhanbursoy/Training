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
  var talepSecim = {};        // birleştirme için seçilen talepler: { no: bayiKod }
  var secSiparis = null;
  var secUrun = null;
  var secBayi = null, bayiGorunum = 'bilgiler';
  var talepGiris = null, tgAgacAcik = {};
  var fTalep = { bas: '', bit: '', ara: '', durum: '' };
  var fSiparis = { bas: '', bit: '', ara: '', durum: '' };
  var fUrun = { ara: '', dugum: null };
  var urunAgacAcik = {};
  var fBayi = { ara: '' };
  var secKullanici = null;
  var fKullanici = { bayi: { ara: '', bayiKod: '', durum: '' }, firma: { ara: '', durum: '' } };
  var kullaniciTipi = 'bayi';
  var fRapor = {
    urun: { bas: '', bit: '', ara: '', durum: '' },
    bayi: { bas: '', bit: '', ara: '', durum: '' },
    performans: { bas: '', bit: '', ara: '', durum: '' }
  };

  function aktifKullanici() {
    var k = JP.oturumKullanici();
    return k && JP.kullaniciTipi(k) === 'firma' ? k : null;
  }
  function yonetebilir() { return JP.kullaniciYonetebilir(aktifKullanici()); }

  JP.firmaEkran = function () {
    var oturum = JP.oturumKullanici();
    if (oturum && JP.kullaniciTipi(oturum) !== 'firma') return UI.yetkisizEkran({ kapi: 'firma', kullanici: oturum });
    if (!oturum) return UI.girisEkrani({ kapi: 'firma' });
    kabuk = UI.kabuk({
      rol: 'firma', rolAdi: 'Firma paneli', altBaslik: 'Muhasebe ve yönetim',
      railBaslik: 'Firma paneli',
      ustSag: function () {
        var kul = aktifKullanici();
        /* Veri sıfırlama demo aracıdır ve giriş sayfasında durur; panelde
           yalnızca oturum menüsü var. */
        return h('div.row.tight', {}, [kul ? profilDugmesi(kul) : null]);
      },
      /* Menü üç öbekte: günlük iş (Operasyon), ana veri (Yönetim) ve raporlar.
         Rozet yalnızca iş bekleyen iki bölümde var: kapanmamış talep ve
         kapanmamış sipariş sayısı. Ana veri ve rapor bölümleri sayı taşımaz. */
      bolumler: [
        { id: 'panel', ad: 'Panel', ciz: panel },
        { id: 'talepler', ad: 'Talepler', grup: 'Operasyon',
          ciz: talepler,
          sayi: function () { return acikTalepSayisi(); },
          sicak: function () { return JP.db.talepler.filter(bekleyen).length > 0; } },
        { id: 'siparisler', ad: 'Siparişler', grup: 'Operasyon',
          ciz: siparisler,
          sayi: function () { return acikSiparisSayisi(); } },
        { id: 'urunler', ad: 'Ürünler', grup: 'Yönetim',
          ciz: urunler, yan: urunAgacPaneli, yanBaslik: 'Ürün ağacı' },
        { id: 'bayiler', ad: 'Bayiler', grup: 'Yönetim',
          ciz: bayiler, yan: talepGirisAgacPaneli, yanBaslik: 'Ürün ağacı' },
        { id: 'bayiKullanicilari', ad: 'Bayi kullanıcıları', grup: 'Yönetim', gizli: !yonetebilir(),
          ciz: function () { kullaniciTipi = 'bayi'; return kullanicilar('bayi'); } },
        { id: 'firmaKullanicilari', ad: 'Firma kullanıcıları', grup: 'Yönetim', gizli: !yonetebilir(),
          ciz: function () { kullaniciTipi = 'firma'; return kullanicilar('firma'); } },
        { id: 'urunRaporu', ad: 'Ürün raporu', grup: 'Raporlar',
          ciz: function () { return raporEkrani('urun'); } },
        { id: 'bayiRaporu', ad: 'Bayi raporu', grup: 'Raporlar',
          ciz: function () { return raporEkrani('bayi'); } },
        { id: 'performansRaporu', ad: 'Performans raporu', grup: 'Raporlar',
          ciz: function () { return raporEkrani('performans'); } }
      ]
    });
  };

  /* Sağ üst hesap menüsü: oturumdaki firma kullanıcısı ve çıkış. */
  function profilDugmesi(kul) {
    var btn = h('button.ikon-btn', {
      title: kul.ad + ' · ' + JP.rolAdi(kul.rol), 'aria-label': 'Hesap', 'aria-expanded': 'false',
      onclick: function () { UI.acilir(btn, panel); }
    }, h('span.avatar.firma', { text: basHarf(kul.ad) }));

    function panel(kapat) {
      return [
        h('div.ac-bas', {}, [
          h('span.avatar.firma', { text: basHarf(kul.ad) }),
          h('div', {}, [h('h3', { text: kul.ad }), h('div.small.muted', { text: kul.eposta })])
        ]),
        h('div.ac-govde', {}, [
          h('div.ac-satir', {}, [
            h('b', { text: 'Rol' }),
            h('div.row.tight', { style: { marginTop: '4px' } }, [
              h('span.tag', { text: JP.rolAdi(kul.rol) }),
              JP.kullaniciYonetebilir(kul) ? UI.rozet('Kullanıcı yönetebilir', 'ok') : UI.rozet('Kullanıcı yönetimi kapalı', 'warn')
            ])
          ]),
          JP.kullaniciYonetebilir(kul) ? h('button.ac-satir', {
            onclick: function () { kapat(); kullaniciAc(kul.id); }
          }, [h('b', { text: 'Hesabım' }), h('div.z', { text: 'Kullanıcı kartını aç' })]) : null
        ]),
        h('div.ac-alt', {}, h('button.btn.block', {
          text: 'Çıkış yap', onclick: function () { kapat(); JP.oturumKapat(); location.reload(); }
        }))
      ];
    }
    return btn;
  }

  /* ------------------------------------------------------------- yardımcı */
  /* Kapanmamış talep: tamamlanmamış ve iptal olmamış (bkz. JP.DURUM). */
  function bekleyen(t) { var d = JP.talepDurumu(t); return d === JP.DURUM.talep || d === JP.DURUM.isleme; }
  /* Menü rozetleri: kapanmamış belge sayısı. Talepte ölçü "Tamamlandı değil",
     siparişte "Tamamlandı ve İptal değil" — iptal edilmiş sipariş listede
     görünür bir son durumdur, iş beklemez. */
  function acikTalepSayisi() {
    return JP.db.talepler.filter(function (t) { return JP.talepDurumu(t) !== JP.DURUM.tamam; }).length;
  }
  function acikSiparisSayisi() {
    return JP.db.siparisler.filter(function (s) { return s.durum !== JP.DURUM.tamam && s.durum !== JP.DURUM.iptal; }).length;
  }
  function bayiAd(kod) { var b = JP.db.bayiler.find(function (x) { return x.kod === kod; }); return b ? b.unvan : kod; }
  function urun(kod) { return JP.db.urunler.find(function (x) { return x.kod === kod; }) || { ad: kod, kod: kod, birim: '', doku: 'diger', renk: '#B9AE99', gosterimBirimi: '' }; }
  function kucult(s) { return (s || '').toLocaleLowerCase('tr'); }
  function gunBasi(d) { return d ? d + 'T00:00:00' : null; }
  function gunSonu(d) { return d ? d + 'T23:59:59' : null; }

  /* "Tamamlanan" = faturası GİB'e gönderilmiş miktar (bkz. JP.DURUM). */
  function tamamSayim(kalemler, alanTalep, alanTamam) {
    var s = { tam: 0, kismi: 0, yok: 0, toplam: kalemler.length };
    kalemler.forEach(function (k) {
      var t = k[alanTalep], f = k[alanTamam];
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
  function filtreCubugu(f, durumlar, yenile, sagEk, araIpucu) {
    function alan(etiket, el) { return h('label.f.filtre-alan', {}, [etiket, el]); }
    var girisler = [
      alan('Başlangıç', h('input', { type: 'date', value: f.bas, onchange: function (e) { f.bas = e.target.value; yenile(); } })),
      alan('Bitiş', h('input', { type: 'date', value: f.bit, onchange: function (e) { f.bit = e.target.value; yenile(); } })),
      alan('Ara', h('input.filtre-ara', {
        type: 'text', value: f.ara, placeholder: araIpucu || 'Belge no, bayi veya ürün ara…',
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

  /* ------------------------------------------------------------------ panel */
  function panel() {
    var db = JP.db;
    var acikTalep = db.talepler.filter(function (t) { return JP.talepDurumu(t) === JP.DURUM.talep; }).length;
    var islemdeTalep = db.talepler.filter(function (t) { return JP.talepDurumu(t) === JP.DURUM.isleme; }).length;
    var acikSiparis = db.siparisler.filter(function (s) { return s.durum === JP.DURUM.isleme; }).length;
    /* Gönderim hatası artık kayıt bırakmaz (sipariş oluşmaz), yerine Logo
       tarafında miktarı değiştirilmiş ve gözden geçirilmesi gereken siparişler. */
    var degisen = db.siparisler.filter(function (s) {
      if (s.durum === JP.DURUM.iptal) return false;
      return JP.siparisKalemDurum(s).some(function (k) { return k.degisti; });
    }).length;
    var gecikmis = db.siparisler.filter(function (s) { return s.durum === JP.DURUM.isleme && JP.gunFark(s.tarih) > 7; }).length;

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
        h('div.row.tight', { style: { marginTop: '8px' } }, [
          db.urunler.length ? null : h('button.btn.primary.sm', { text: 'Ürünleri Logo’dan çek', onclick: logoUrunCek }),
          db.bayiler.length ? null : h('button.btn.primary.sm', { text: 'Bayileri Logo’dan çek', onclick: logoBayiCek }),
          h('button.btn.sm', { text: 'Ürünlere git', onclick: function () { kabuk.git('urunler'); } }),
          h('button.btn.sm', { text: 'Bayilere git', onclick: function () { kabuk.git('bayiler'); } })
        ])
      ]));
    }
    kap.appendChild(otuzGunGrafigi());
    kap.appendChild(h('div.grid.k4', {}, [
      /* Üç durum artı bir istisna: Logo'da miktarı değişmiş siparişler. */
      kart('Talep edilen', acikTalep, 'talep', "Logo'ya gönderilmeyi bekliyor", 'talepler', acikTalep > 0),
      kart('İşleme alınan', islemdeTalep + acikSiparis, 'belge', islemdeTalep + ' talep · ' + acikSiparis + " sipariş, GİB'i bekliyor", 'siparisler'),
      kart("Logo'da değişen", degisen, 'sipariş', degisen ? 'Miktar Logo tarafında değişti' : 'Fark yok', 'siparisler', degisen > 0),
      kart('Gecikmiş', gecikmis, 'sipariş', '7 günden uzun süredir tamamlanmadı', 'siparisler', gecikmis > 0)
    ]));
    return kap;
  }

  /* Son 30 günün üç serisi: talep edilen, işleme alınan, tamamlanan miktar.
     Miktarlar ürünün kendi biriminden geldiği için birimler karıştırılmaz —
     birden çok birimde hareket varsa üstte seçici çıkar. */
  var grafikBirim = null;
  function otuzGunGrafigi() {
    var o = JP.gunlukOzet(30, grafikBirim);
    if (!o.birimler.length) grafikBirim = null;
    else if (grafikBirim && o.birimler.indexOf(grafikBirim) < 0) { grafikBirim = null; o = JP.gunlukOzet(30, null); }

    var etiketler = o.gunler.map(function (g) {
      var p = g.gun.split('-');
      return p[2] + '.' + p[1];
    });
    var grafik = UI.grafik({
      baslik: 'Son 30 gün · talep edilen, işleme alınan ve tamamlanan miktar',
      birim: o.birim,
      etiketler: etiketler,
      bos: 'Son 30 günde hareket yok. Bayi tarafından talep girin ya da örnek veriye dönün.',
      seriler: [
        { ad: 'Talep edilen', renk: 'var(--text-3)', veri: o.gunler.map(function (g) { return g.talep; }) },
        { ad: 'İşleme alınan', renk: 'var(--info)', veri: o.gunler.map(function (g) { return g.isleme; }) },
        { ad: 'Tamamlanan', renk: 'var(--ok)', veri: o.gunler.map(function (g) { return g.tamam; }) }
      ]
    });
    var secici = o.birimler.length > 1
      ? h('div.seg', {}, o.birimler.map(function (b) {
          return h('button', { 'aria-pressed': String(b === o.birim), text: b,
            onclick: function () { grafikBirim = b; kabuk.ciz(); } });
        }))
      : null;
    return UI.panel('Son 30 gün', secici, grafik);
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
    var serit = h('div');

    function secilenNolar() { return Object.keys(talepSecim); }
    function secilenBayi() { var n = secilenNolar(); return n.length ? talepSecim[n[0]] : null; }

    /* Bir sipariş tek bayiye açılır; ilk seçim bayiyi sabitler, diğer bayilerin
       kutuları kapanır ve sebebi kutunun başlığında yazar. */
    function seritCiz() {
      var n = secilenNolar();
      serit.textContent = '';
      if (!n.length) return;
      var kalem = n.reduce(function (t, no) {
        var tp = JP.db.talepler.find(function (x) { return x.no === no; });
        return t + (tp ? JP.talepKalemDurum(tp).filter(function (k) { return k.donusturulebilir > 0.001; }).length : 0);
      }, 0);
      serit.appendChild(h('div.secim-serit', {}, [
        h('span.badge.acc', { text: n.length + ' talep seçildi' }),
        h('span.small.muted', { text: bayiAd(secilenBayi()) + ' · ' + kalem + ' dönüştürülebilir kalem' }),
        h('div.spacer'),
        h('button.btn.ghost.sm', { text: 'Seçimi temizle', onclick: function () { talepSecim = {}; yenile(true); } }),
        h('button.btn.primary', { text: n.length > 1 ? n.length + ' talebi tek siparişe dönüştür' : 'Siparişe dönüştür',
          onclick: function () {
            var tl = n.map(function (no) { return JP.db.talepler.find(function (x) { return x.no === no; }); }).filter(Boolean);
            tl.sort(function (a, b) { return a.tarih < b.tarih ? -1 : 1; });
            donusumKip(tl);
          } })
      ]));
    }

    function tabloCiz() {
      govde.textContent = '';
      govde.appendChild(UI.panel(null, null, UI.tablo(
        ['', 'Tarih', 'Talep no', 'Bayi', 'İstenen teslim', 'Durum', { t: 'Kalem', num: true }, 'Tamamlanma', ''],
        liste.map(function (t) {
          var s = tamamSayim(JP.talepKalemDurum(t), 'talep', 'fatura');
          var donebilir = JP.talepKalemDurum(t).some(function (k) { return k.donusturulebilir > 0.001; });
          var bayiUyum = !secilenBayi() || secilenBayi() === t.bayiKod;
          var kutu = h('input', {
            type: 'checkbox', checked: !!talepSecim[t.no], disabled: !donebilir || !bayiUyum,
            'aria-label': t.no + ' seç',
            title: !donebilir ? 'Bu talepte dönüştürülecek miktar kalmadı'
              : (!bayiUyum ? 'Seçim ' + bayiAd(secilenBayi()) + ' talepleriyle sınırlı; bir sipariş tek bayiye açılır' : 'Siparişte birleştirmek için seç'),
            onclick: function (e) { e.stopPropagation(); },
            onchange: function (e) {
              if (e.target.checked) talepSecim[t.no] = t.bayiKod; else delete talepSecim[t.no];
              yenile(true);
            }
          });
          return h('tr', { style: { cursor: 'pointer' }, onclick: function () { talepAc(t.no); } }, [
            h('td', { style: { width: '34px' } }, kutu),
            h('td.small.nowrap', { text: JP.fmt.tarih(t.tarih) }),
            h('td.mono', {}, [
              h('span', { text: t.no, style: { fontWeight: '600' } }),
              t.kaynak === 'firma' ? h('span.badge.plain', { text: 'firma girişi', style: { marginLeft: '6px' } }) : null
            ]),
            h('td.small', { text: bayiAd(t.bayiKod) }),
            h('td.small.nowrap', { text: t.teslimTarihi ? JP.fmt.tarih(t.teslimTarihi) : '—',
              style: t.teslimTarihi ? null : { color: 'var(--text-3)' } }),
            h('td', {}, UI.rozet(JP.talepDurumu(t))),
            h('td.num.mono', { text: String(s.toplam) }),
            h('td', {}, ilerleme(s)),
            h('td.right', {}, h('button.btn.ghost.sm', { text: 'Detay', onclick: function (e) { e.stopPropagation(); talepAc(t.no); } }))
          ]);
        }), 'Filtreye uyan talep yok.'), true));
    }
    function yenile(yerinde) {
      liste = talepSuz();
      if (yerinde) { tabloCiz(); seritCiz(); } else kabuk.ciz();
    }
    tabloCiz();
    seritCiz();

    return h('div.stack', {}, [
      filtreCubugu(fTalep, JP.DURUMLAR, yenile,
        h('button.btn.ghost.sm', { text: "Excel'e kopyala", onclick: function () { talepKopyala(liste); } })),
      h('div.small.muted', { text: 'Aynı bayinin birden çok talebini seçip tek siparişte birleştirebilirsiniz.' }),
      serit,
      govde
    ]);
  }

  function talepKopyala(liste) {
    var satir = [['Talep no', 'Tarih', 'Bayi', 'Kaynak', 'İstenen teslim', 'Durum', 'Ürün kodu', 'Ürün', 'Birim', 'Talep edilen', 'İşleme alınan', 'Tamamlanan']];
    liste.forEach(function (t) {
      JP.talepKalemDurum(t).forEach(function (k) {
        satir.push([t.no, JP.fmt.tarih(t.tarih), bayiAd(t.bayiKod),
          t.kaynak === 'firma' ? 'Firma girişi' : 'Bayi',
          t.teslimTarihi ? JP.fmt.tarih(t.teslimTarihi) : '', JP.talepDurumu(t),
          k.kalem.urunKod, k.urun.ad, k.urun.birim, k.talep, k.siparis, k.fatura]);
      });
    });
    UI.tabloKopyala('Talepler', satir);
  }

  function talepDetay(t) {
    var kalemler = JP.talepKalemDurum(t);
    var donusturulebilir = kalemler.some(function (k) { return k.donusturulebilir > 0.001; });
    /* Aynı bayinin başka açık talepleri varsa tek siparişte birleştirme kısayolu. */
    var digerAcik = donusturulebilir ? JP.db.talepler.filter(function (x) {
      return x.bayiKod === t.bayiKod && x.no !== t.no &&
        JP.talepKalemDurum(x).some(function (k) { return k.donusturulebilir > 0.001; });
    }) : [];

    var govde = h('div.stack');
    if (talepGorunum === 'gecmis') govde.appendChild(detayGecmis(t));
    else govde.appendChild(detayUrunler(kalemler));

    return h('div.stack', {}, [
      h('div.row', {}, [
        h('button.btn.ghost.sm', { text: '← Talep listesi', onclick: function () { secTalep = null; kabuk.ciz(); } }),
        h('div.spacer'),
        digerAcik.length ? h('button.btn.sm', {
          text: 'Bu bayinin ' + (digerAcik.length + 1) + ' talebini birleştir',
          title: 'Aynı bayinin dönüştürülebilir tüm taleplerini tek siparişte topla',
          onclick: function () { donusumKip([t].concat(digerAcik).sort(function (a, b) { return a.tarih < b.tarih ? -1 : 1; })); }
        }) : null,
        h('button.btn.primary', { text: 'Siparişe dönüştür', disabled: !donusturulebilir, onclick: function () { donusumKip([t]); } })
      ]),
      UI.panel('Talep bilgisi', null, h('div.stack', {}, [
        UI.bilgi([
          ['Talep numarası', h('span.mono', { text: t.no, style: { fontWeight: '600' } })],
          ['Talep tarihi', JP.fmt.tarih(t.tarih) + ' · ' + JP.gunFark(t.tarih) + ' gün önce'],
          ['Talep durumu', UI.rozet(JP.talepDurumu(t))],
          ['Bayi', h('button.btn.ghost.sm', { text: bayiAd(t.bayiKod), onclick: function () { bayiAc(t.bayiKod); } })],
          ['Talep eden kullanıcı', t.kaynak === 'firma'
            ? h('div.row.tight', {}, [h('span', { text: t.kullaniciAd || 'Jalpersan' }), h('span.badge.plain', { text: 'firma girişi (telefon)' })])
            : (t.kullaniciAd || '—')],
          t.teslimTarihi ? ['İstenen teslim tarihi', JP.fmt.tarih(t.teslimTarihi)] : null,
          ['Ürün sayısı', String(kalemler.length)]
        ]),
        t.not ? h('div.small.muted', { text: '“' + t.not + '”' }) : null
      ])),
      h('div.seg', {}, [
        ['urunler', 'Ürünler (' + kalemler.length + ')'],
        ['gecmis', 'Geçmiş']
      ].map(function (o) {
        return h('button', { 'aria-pressed': String(talepGorunum === o[0] || (o[0] === 'urunler' && talepGorunum !== 'gecmis')), text: o[1],
          onclick: function () { talepGorunum = o[0]; kabuk.ciz(); } });
      })),
      govde
    ]);
  }

  /* Bir talep kaleminin girdiği siparişler — kalem kimliği üzerinden. */
  function kalemSiparisleri(kalemId) {
    return JP.db.siparisler.filter(function (s) {
      return s.kalemler.some(function (k) { return k.talepKalemId === kalemId; });
    });
  }

  function detayUrunler(kalemler) {
    /* Üç durumun üç sütunu: istenen, Logo'ya giden, GİB'e gidip tamamlanan.
       Tamamlanan, işleme alınanın içindedir — sütunlar alt alta toplanmaz.
       İşleme alınmayı bekleyen miktar talep − işleme alınandır; ayrı sütun
       tutulmaz, dönüştürme kipinde "Kalan" olarak çıkar. */
    return UI.panel('Talep kalemleri',
      h('span.small.muted', { text: 'Tamamlanan, işleme alınanın içindedir' }),
      UI.tablo(['Ürün', 'Birim', { t: 'Talep edilen', num: true }, { t: 'İşleme alınan', num: true }, { t: 'Tamamlanan', num: true }, 'Sipariş'],
        kalemler.map(function (k) {
          return h('tr', {}, [
            h('td', {}, h('button.urun-link', { onclick: function () { urunAc(k.kalem.urunKod); } }, [
              UI.kartela(k.urun, '26px', '40px'),
              h('span', {}, [h('span.small', { text: k.urun.ad }), h('span.pc.mono', { text: k.kalem.urunKod })])
            ])),
            h('td.small.muted.nowrap', { text: k.urun.gosterimBirimi }),
            h('td.num.mono', { text: JP.fmt.miktar(k.talep) }),
            h('td.num.mono', { text: JP.fmt.miktar(k.siparis) }),
            h('td.num.mono', { text: JP.fmt.miktar(k.fatura), style: { color: k.fatura > 0 ? 'var(--ok)' : 'var(--text-3)' } }),
            /* Bu kalem hangi siparişlere girdi: numara rozeti, tıklayınca sipariş açılır. */
            h('td', {}, kalemSiparisleri(k.kalem.id).length
              ? h('div.row.tight', {}, kalemSiparisleri(k.kalem.id).map(function (sp) {
                  return h('button.tag', { text: sp.no, title: sp.durum + ' · ' + JP.fmt.tarih(sp.tarih),
                    onclick: function () { secTalep = null; siparisAc(sp.no); } });
                }))
              : h('span.small.muted', { text: '—' }))
          ]);
        })), true);
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

  /* ------------------------------------------------ talep → sipariş dönüşümü
   * Bir sipariş birden çok talepten oluşabilir: bayi haftalar içinde altı talep
   * girmişse hepsi tek siparişte birleştirilir. Her sipariş kalemi kendi talep
   * kalemine bağlı kalır (hareket defteri bağlantısı korunur), kip ise aynı
   * ürünü isteyen kalemleri bir arada gösterir. Karıştırma sınırı tek: bir
   * sipariş yalnızca tek bayinin taleplerinden oluşur (Logo fişi tek cari). */
  function donusumKip(talepler) {
    if (!Array.isArray(talepler)) talepler = [talepler];
    var bayiKod = talepler[0].bayiKod;

    // her talebin dönüştürülebilir kalemleri, ürün bazında gruplanmış
    var satirlar = [];
    talepler.forEach(function (t) {
      JP.talepKalemDurum(t).forEach(function (k) {
        if (k.donusturulebilir > 0.001) satirlar.push({ talep: t, k: k });
      });
    });
    if (!satirlar.length) { UI.toast('Dönüştürülecek kalem yok', null, 'bad'); return; }

    var gruplar = [];
    satirlar.forEach(function (r) {
      var g = gruplar.find(function (x) { return x.kod === r.k.kalem.urunKod; });
      if (!g) { g = { kod: r.k.kalem.urunKod, urun: r.k.urun, satir: [] }; gruplar.push(g); }
      g.satir.push(r);
    });

    var secim = {};
    satirlar.forEach(function (r) { secim[r.k.kalem.id] = { dahil: true, miktar: r.k.donusturulebilir, talepNo: r.talep.no }; });

    var ozet = h('div.small.muted');
    function ozetGuncelle() {
      var n = 0, tNo = {};
      satirlar.forEach(function (r) {
        var sc = secim[r.k.kalem.id];
        if (sc.dahil && sc.miktar > 0) { n++; tNo[r.talep.no] = true; }
      });
      ozet.textContent = n + ' kalem, ' + Object.keys(tNo).length + ' talepten siparişe dönüşecek. ' +
        'Girilmeyen miktar talepte açık kalır.';
    }

    var govde = [];
    gruplar.forEach(function (g) {
      var toplamEl = h('span.num.mono');
      function grupToplam() {
        var t = 0;
        g.satir.forEach(function (r) { var sc = secim[r.k.kalem.id]; if (sc.dahil) t += sc.miktar || 0; });
        toplamEl.textContent = JP.fmt.miktar(Math.round(t * 100) / 100) + ' ' + (g.urun.gosterimBirimi || '');
      }
      var kutular = [];
      var alt = g.satir.map(function (r) {
        var mik = h('input.qty', {
          type: 'number', min: '0', max: String(r.k.donusturulebilir), step: '10',
          value: String(r.k.donusturulebilir),
          oninput: function (e) { secim[r.k.kalem.id].miktar = parseFloat(e.target.value) || 0; grupToplam(); ozetGuncelle(); }
        });
        var kutu = h('input', { type: 'checkbox', checked: true,
          onchange: function (e) {
            secim[r.k.kalem.id].dahil = e.target.checked;
            mik.disabled = !e.target.checked;
            grupToplam(); ozetGuncelle();
          } });
        kutular.push(kutu);
        return h('tr.sub', {}, [
          h('td', {}, h('label.chk', {}, [kutu, h('span.mono.small', { text: r.talep.no })])),
          h('td.small.muted', { text: JP.fmt.tarih(r.talep.tarih) + ' · ' + JP.gunFark(r.talep.tarih) + ' gün önce' }),
          h('td.num.mono.small', { text: JP.fmt.miktar(r.k.talep) }),
          h('td.num.mono.small', { text: JP.fmt.miktar(r.k.donusturulebilir) }),
          h('td', {}, mik)
        ]);
      });
      grupToplam();
      govde.push(h('tr', {}, [
        h('td', {}, h('div.row.tight', {}, [
          UI.kartela(g.urun, '26px', '38px'),
          h('div', {}, [h('div.small', { text: g.urun.ad, style: { fontWeight: '600' } }),
            h('div.pc.mono', { text: g.kod })])
        ])),
        h('td.small.muted', { text: g.satir.length + ' talep kalemi' }),
        h('td'),
        h('td.small.muted', { text: 'Sipariş toplamı' }),
        h('td.num', {}, toplamEl)
      ]));
      alt.forEach(function (x) { govde.push(x); });
    });
    ozetGuncelle();

    /* Teslim tarihi önerisi: taleplerdeki en yakın tarih (en acil olan). */
    var tarihler = talepler.map(function (t) { return t.teslimTarihi; }).filter(Boolean).sort();
    var teslim = h('input', { type: 'date', value: tarihler[0] || '' });
    var hataKutu = h('input', { type: 'checkbox' });

    UI.modal({
      baslik: talepler.length > 1 ? talepler.length + ' talebi tek siparişe dönüştür' : null,
      etiket: (talepler.length > 1 ? talepler.length + ' talep' : talepler[0].no) + ' · ' + bayiAd(bayiKod),
      genis: true,
      icerik: h('div.stack', {}, [
        talepler.length > 1 ? h('div.note', {
          text: 'Seçilen talepler tek siparişte birleşir. Her kalem kendi talebine bağlı kalır; ' +
                "fatura GİB'e gönderildiğinde ilgili talep kapanır."
        }) : null,
        UI.tablo(['Ürün / talep', 'Tarih', { t: 'Talep edilen', num: true }, { t: 'Kalan', num: true }, 'İşleme alınacak'], govde),
        ozet,
        h('div.grid.k2', {}, [
          h('label.f', {}, ['Talep edilen teslim tarihi (opsiyonel)', teslim]),
          h('div.small.muted', { style: { alignSelf: 'end', paddingBottom: '8px' },
            text: tarihler.length > 1
              ? 'Taleplerdeki en yakın tarih önerildi (' + tarihler.length + ' talepte tarih var).'
              : (tarihler.length === 1
                ? 'Bayinin talebindeki tarih önerildi; değiştirebilir veya boş bırakabilirsiniz.'
                : 'Taleplerde tarih belirtilmemiş. Boş bırakılabilir.') })
        ]),
        h('label.chk', {}, [hataKutu, h('span.small', { text: 'Logo gönderim hatasını simüle et (demo)' })]),
        h('div.note', { text: 'Sipariş oluşturulurken aynı işlemde Logo’da sipariş fişi açılır. Fiş açılamazsa sipariş de oluşmaz; talep miktarı açıkta kalır ve yeniden denenebilir.' })
      ]),
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', { text: "Sipariş oluştur ve Logo'ya gönder",
            onclick: function () {
              UI.dene(function () {
                var s = JP.siparisOlustur(bayiKod, satirlar
                  .filter(function (r) { return secim[r.k.kalem.id].dahil; })
                  .map(function (r) { return { talepNo: r.talep.no, kalemId: r.k.kalem.id, miktar: secim[r.k.kalem.id].miktar }; }),
                  'muhasebe', teslim.value || null, hataKutu.checked);
                kapat();
                UI.toast('Sipariş oluşturuldu',
                  s.no + ' · ' + s.kalemler.length + ' kalem · Logo fiş ' + s.logoFisNo, 'ok');
                secTalep = null; talepSecim = {}; siparisAc(s.no);
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
        r.okunanFis + ' fiş · ' + r.miktarDegisimi + ' miktar değişimi · ' + (r.faturaHareketi + r.fifo) + ' tamamlanma · ' +
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
        ['Tarih', 'Sipariş no', 'Bayi', 'Durum', 'Logo fiş', { t: 'Kalem', num: true }, 'Tamamlanma', ''],
        liste.map(function (s) {
          var sy = tamamSayim(JP.siparisKalemDurum(s), 'logoMiktar', 'sevk');
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
      if (yerinde) tabloCiz(); else kabuk.ciz();
    }
    tabloCiz();

    return h('div.stack', {}, [
      filtreCubugu(fSiparis, [JP.DURUM.isleme, JP.DURUM.tamam, JP.DURUM.iptal], yenile,
        h('button.btn.ghost.sm', { text: "Excel'e kopyala", onclick: function () { siparisKopyala(liste); } })),
      h('div.row', {}, [
        h('button.btn.primary', { text: "Logo'dan sorgula", title: 'Açık siparişlerin fiş ve fatura durumunu Logo’dan okur', onclick: logoSorgula }),
        UI.senkronBilgi(db.senkron.siparis)
      ]),
      govde
    ]);
  }

  function siparisKopyala(liste) {
    var satir = [['Sipariş no', 'Tarih', 'Bayi', 'Talep edilen teslim', 'Durum', 'Logo fiş', 'Talep no', 'Ürün kodu', 'Ürün', 'Birim', 'Miktar', 'Tamamlanan']];
    liste.forEach(function (s) {
      JP.siparisKalemDurum(s).forEach(function (k) {
        satir.push([s.no, JP.fmt.tarih(s.tarih), bayiAd(s.bayiKod),
          s.teslimTarihi ? JP.fmt.tarih(s.teslimTarihi) : '', s.durum, s.logoFisNo || '',
          k.kalem.talepNo, k.kalem.urunKod, k.urun.ad, k.urun.birim, k.logoMiktar, k.sevk]);
      });
    });
    UI.tabloKopyala('Siparişler', satir);
  }

  /* Siparişin beslendiği talep numaraları — künyede rozet olarak çıkar. */
  function siparisTalepleri(s) {
    var g = {};
    s.kalemler.forEach(function (k) { if (k.talepNo) g[k.talepNo] = true; });
    return Object.keys(g);
  }

  function siparisDetay(s) {
    var db = JP.db;
    var kl = JP.siparisKalemDurum(s);
    var fis = db.logo.fisler.find(function (f) { return f.portalRef === s.logoRef; });
    var faturalar = fis ? db.logo.faturalar.filter(function (f) { return f.fisNo === fis.fisNo; }) : [];
    var degisen = kl.filter(function (k) { return k.degisti; }).length;

    return h('div.stack', {}, [
      h('div.row', {}, [
        h('button.btn.ghost.sm', { text: '← Sipariş listesi', onclick: function () { secSiparis = null; kabuk.ciz(); } }),
        h('div.spacer'),
        (s.durum !== 'Tamamlandı' && s.durum !== 'İptal') ? h('button.btn.primary', { text: "Logo'dan sorgula",
          onclick: function () { UI.dene(function () { JP.durumSorgula(s.no); UI.toast('Sorgulandı', s.no, 'ok'); }); } }) : null,
        (s.durum !== 'Tamamlandı' && s.durum !== 'İptal') ? h('button.btn.ghost.sm', { text: 'İptal et',
          onclick: function () { UI.onay('Siparişi iptal et', s.no + ' iptal edilecek ve bağlı miktar talepte tekrar açılacak. Logo fişi elle iptal edilmelidir.', function () { JP.siparisIptal(s.no); UI.toast('Sipariş iptal edildi', null, 'ok'); }, true); } }) : null
      ]),
      s.hataMetni ? h('div.note.bad', { text: s.hataMetni }) : null,
      degisen ? h('div.note.warn', { text: degisen + ' kalemin miktarı Logo tarafında değiştirilmiş. Talep bakiyeleri buna göre düzeltildi.' }) : null,

      UI.panel('Sipariş bilgisi', null, UI.bilgi([
        ['Sipariş numarası', h('span.mono', { text: s.no, style: { fontWeight: '600' } })],
        ['Sipariş tarihi', JP.fmt.tarih(s.tarih) + ' · ' + JP.gunFark(s.tarih) + ' gün önce'],
        ['Sipariş durumu', UI.rozet(s.durum)],
        ['Bayi', h('button.btn.ghost.sm', { text: bayiAd(s.bayiKod), onclick: function () { bayiAc(s.bayiKod); } })],
        ['Logo fişi', s.logoFisNo ? h('span.mono', { text: s.logoFisNo }) : '—'],
        ['Portal referansı', h('span.mono', { text: s.logoRef })],
        s.teslimTarihi ? ['Talep edilen teslim tarihi', JP.fmt.tarih(s.teslimTarihi)] : null,
        ['Ürün sayısı', String(kl.length)],
        ['Talepler', h('div.row.tight', {}, siparisTalepleri(s).map(function (no) {
          return h('button.tag', { text: no, onclick: function () { secSiparis = null; talepAc(no); } });
        }))]
      ])),

      /* Sipariş satırında iki sayı yeter: Logo'daki güncel miktar ve bunun
         tamamlanan kısmı. Logo'da miktar değiştiyse satır sarıya döner ve
         siparişteki ilk miktar rozette yazar. */
      UI.panel('Sipariş kalemleri', null,
        UI.tablo(['Ürün', 'Birim', 'Talep no', { t: 'Miktar', num: true }, { t: 'Tamamlanan', num: true }],
          kl.map(function (k) {
            return h('tr', {}, [
              h('td', {}, h('button.urun-link', { onclick: function () { urunAc(k.kalem.urunKod); } }, [
                UI.kartela(k.urun, '26px', '40px'),
                h('span', {}, [h('span.small', { text: k.urun.ad }), h('span.pc.mono', { text: k.kalem.urunKod })])
              ])),
              h('td.small.muted.nowrap', { text: k.urun.gosterimBirimi }),
              h('td', {}, h('button.tag', { text: k.kalem.talepNo, onclick: function () { secSiparis = null; talepAc(k.kalem.talepNo); } })),
              h('td.num.mono', {}, [
                h('span', { text: JP.fmt.miktar(k.logoMiktar),
                  style: k.degisti ? { color: 'var(--warn)', fontWeight: '600' } : null }),
                k.degisti ? h('span.pc.mono', { text: 'siparişte ' + JP.fmt.miktar(k.siparis) }) : null
              ]),
              h('td.num.mono', { text: JP.fmt.miktar(k.sevk), style: { color: k.sevk > 0 ? 'var(--ok)' : 'var(--text-3)' } })
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

  /* ------------------------------------------------------------------ raporlar
   * Üç rapor menüde ayrı bölümdür ama tek iskeleti paylaşır: ortak tarih
   * aralığı + arama çubuğu, raporun ne ölçtüğünü söyleyen bir satır ve tek
   * tablo. Üstte ölçüm kartı yok — sayılar tablonun kendisinde.
   *
   * Miktarlar ürünün kendi biriminden olduğu için satırlar arası toplanmaz;
   * kalem ve belge sayıları toplanır.
   *
   * Süzgeç durumu rapor başına ayrı tutulur: bayi raporunda yazılan arama
   * ürün raporunu boşaltmasın. */
  var RAPORLAR = [
    { id: 'urun', ad: 'Ürün raporu',
      olcum: 'Ürün bazında kaç talep gelmiş, kaçı işleme alınmış, kaçı tamamlanmış. Tarih aralığı talep tarihine bakar.',
      not: "Miktarlar ürünün kendi birimindedir; satırlar arası toplanmaz. Tamamlanma yüzdesi tamamlanan miktarın talep edilene oranıdır.",
      ipucu: 'Ürün adı, stok kodu veya kategori ara…' },
    { id: 'bayi', ad: 'Bayi raporu',
      olcum: 'Bayi bazında sipariş ve kalem sayısı ile siparişlerin tamamlanma oranı. Tarih aralığı sipariş tarihine bakar.',
      not: "Tamamlanma, bütün kalemlerinin faturası GİB'e gönderilmiş sipariş sayısıdır. İptal edilen siparişler sayılmaz.",
      ipucu: 'Bayi unvanı, cari kodu veya şehir ara…' },
    { id: 'performans', ad: 'Performans raporu',
      olcum: 'Ürün bazında talepten tamamlanmaya kadar geçen en kısa, en uzun ve ortalama gün.',
      not: "Süre talep kalemi düzeyinde ölçülür: talebin açıldığı an ile faturanın GİB'e gönderildiği an arasındaki gün. Yalnızca tamamı tamamlanmış kalemler süreye girer.",
      ipucu: 'Ürün adı, stok kodu veya kategori ara…' }
  ];

  function raporAra(id, metin) {
    var q = kucult(fRapor[id].ara).trim();
    return !q || kucult(metin).indexOf(q) >= 0;
  }

  function raporUrunHucre(u) {
    return h('td', {}, h('button.urun-link', { onclick: function () { urunAc(u.kod); } }, [
      UI.kartela(u, '26px', '40px'),
      h('span', {}, [h('span.small', { text: u.ad }), h('span.pc.mono', { text: u.kod })])
    ]));
  }
  function raporBayiHucre(b) {
    return h('td', {}, h('button.urun-link', { onclick: function () { bayiAc(b.kod); } },
      h('span', {}, [
        h('span.small', { text: b.unvan }),
        h('span.pc.mono', { text: b.kod + ((b.sehir || b.ulke) ? ' · ' + [b.sehir, b.ulke].filter(Boolean).join(' / ') : '') })
      ])));
  }
  function gunHucre(v, vurgu) {
    if (v === null || v === undefined) return h('td.num.small.muted', { text: '—' });
    return h('td.num.mono', { text: JP.fmt.miktar(v), style: vurgu ? { color: 'var(--warn)', fontWeight: '600' } : null });
  }
  function yuzdeHucre(v, adet) {
    if (!adet) return h('td.num.small.muted', { text: '—' });
    return h('td.num.mono', { text: v + '%', style: { color: v >= 100 ? 'var(--ok)' : (v > 0 ? null : 'var(--text-3)'), fontWeight: v >= 100 ? '600' : null } });
  }

  /* --- 1: ürün raporu --- */
  function raporUrun(f) {
    var satir = JP.raporUrun(f).filter(function (r) {
      return raporAra('urun', r.urun.ad + ' ' + r.urunKod + ' ' + r.urun.grup);
    });
    return {
      basliklar: ['Ürün', 'Kategori', 'Birim', { t: 'Talep edilen', num: true },
        { t: 'İşleme alınan', num: true }, { t: 'Tamamlanan', num: true }, { t: 'Tamamlanma', num: true }],
      satirlar: satir.map(function (r) {
        return h('tr', {}, [
          raporUrunHucre(r.urun),
          h('td.small.muted', { text: r.urun.grup || '—' }),
          h('td.small.muted.nowrap', { text: r.urun.gosterimBirimi }),
          h('td.num.mono', { text: JP.fmt.miktar(r.talep), style: { fontWeight: '600' } }),
          h('td.num.mono', { text: JP.fmt.miktar(r.siparis) }),
          h('td.num.mono', { text: JP.fmt.miktar(r.sevk), style: { color: r.sevk > 0 ? 'var(--ok)' : 'var(--text-3)' } }),
          yuzdeHucre(r.miktarYuzde, r.talep)
        ]);
      }),
      bos: 'Bu aralıkta talep görmüş ürün yok.',
      excel: [['Ürün kodu', 'Ürün', 'Kategori', 'Birim', 'Talep edilen', 'İşleme alınan',
        'Tamamlanan', 'Tamamlanma %']]
        .concat(satir.map(function (r) {
          return [r.urunKod, r.urun.ad, r.urun.grup, r.urun.gosterimBirimi,
            r.talep, r.siparis, r.sevk, r.miktarYuzde];
        }))
    };
  }

  /* --- 2: bayi raporu --- */
  function raporBayi(f) {
    var satir = JP.raporBayiSiparis(f).filter(function (r) {
      return raporAra('bayi', r.bayi.unvan + ' ' + r.bayiKod + ' ' + r.bayi.sehir);
    });
    return {
      basliklar: ['Bayi', { t: 'Sipariş', num: true }, { t: 'Kalem', num: true },
        { t: 'Tamamlanan', num: true }, 'Son sipariş'],
      satirlar: satir.map(function (r) {
        return h('tr', {}, [
          raporBayiHucre(r.bayi),
          h('td.num.mono', { text: String(r.siparis), style: { fontWeight: '600' } }),
          h('td.num.mono', { text: String(r.siparisKalem) }),
          h('td.num.mono', { text: String(r.tamamlanan) }),
          h('td.small.muted.nowrap', { text: r.sonTarih ? JP.fmt.tarih(r.sonTarih) : '—' })
        ]);
      }),
      bos: 'Aramaya uyan bayi yok.',
      excel: [['Cari kodu', 'Bayi', 'Şehir', 'Ülke', 'Sipariş', 'Kalem', 'Tamamlanan', 'Son sipariş']]
        .concat(satir.map(function (r) {
          return [r.bayiKod, r.bayi.unvan, r.bayi.sehir, r.bayi.ulke, r.siparis, r.siparisKalem,
            r.tamamlanan, r.sonTarih ? JP.fmt.tarih(r.sonTarih) : ''];
        }))
    };
  }

  /* --- 3: performans raporu --- */
  function raporPerformans(f) {
    var satir = JP.raporSure(f).filter(function (r) {
      return raporAra('performans', r.urun.ad + ' ' + r.urunKod + ' ' + r.urun.grup);
    });
    return {
      basliklar: ['Ürün', 'Kategori', 'Birim', { t: 'En kısa (gün)', num: true },
        { t: 'En uzun (gün)', num: true }, { t: 'Ortalama (gün)', num: true }],
      satirlar: satir.map(function (r) {
        return h('tr', {}, [
          raporUrunHucre(r.urun),
          h('td.small.muted', { text: r.urun.grup || '—' }),
          h('td.small.muted.nowrap', { text: r.urun.gosterimBirimi }),
          gunHucre(r.enKisaTam),
          gunHucre(r.enUzunTam, r.enUzunTam !== null && r.enUzunTam > 7),
          gunHucre(r.ortTam)
        ]);
      }),
      bos: 'Bu aralıkta talep görmüş ürün yok.',
      excel: [['Ürün kodu', 'Ürün', 'Kategori', 'Birim', 'En kısa gün', 'En uzun gün', 'Ortalama gün']]
        .concat(satir.map(function (r) {
          return [r.urunKod, r.urun.ad, r.urun.grup, r.urun.gosterimBirimi,
            r.enKisaTam === null ? '' : r.enKisaTam,
            r.enUzunTam === null ? '' : r.enUzunTam,
            r.ortTam === null ? '' : r.ortTam];
        }))
    };
  }

  function raporEkrani(id) {
    var secili = RAPORLAR.find(function (r) { return r.id === id; }) || RAPORLAR[0];
    var uret = { urun: raporUrun, bayi: raporBayi, performans: raporPerformans }[secili.id];
    var fs = fRapor[secili.id];
    var f = { bas: gunBasi(fs.bas), bit: gunSonu(fs.bit) };

    var govde = h('div.stack');
    var sonRapor = null;
    function ciz() {
      var r = uret(f);
      govde.textContent = '';
      govde.appendChild(UI.panel(null, null, UI.tablo(r.basliklar, r.satirlar, r.bos), true));
      sonRapor = r;
    }
    /* Diğer ekranlarla aynı sözleşme: arama yerinde çizer, tarih ve temizleme
       tüm ekranı yeniler (filtre çubuğundaki "Temizle" düğmesi de yenilenmeli). */
    function yenile(yerinde) {
      f = { bas: gunBasi(fs.bas), bit: gunSonu(fs.bit) };
      if (yerinde) ciz(); else kabuk.ciz();
    }
    ciz();

    return h('div.stack', {}, [
      filtreCubugu(fs, null, yenile,
        h('button.btn.ghost.sm', { text: "Excel'e kopyala",
          onclick: function () { UI.tabloKopyala(secili.ad, sonRapor.excel); } }),
        secili.ipucu),
      h('div.small.muted', { text: secili.olcum }),
      secili.not ? h('div.small.muted', { text: secili.not }) : null,
      govde
    ]);
  }

  /* --------------------------------------------------- ürünler: katalog + ekran
   * Yerleşim bayi kataloğuyla aynıdır — sol yan panelde ürün ağacı, üstte arama
   * ve Liste/Kart geçişi, satırlarda kırılım ürünün üzerinde. Tek fark eylemdir:
   * bayi sepete ekler, firma ürün detayına girip portal alanlarını düzenler. */
  function urunAc(kod) { secUrun = kod; kabuk.git('urunler'); }

  function urunKaynak() {
    return JP.db.urunler.slice().sort(function (a, b) {
      return a.grup.localeCompare(b.grup, 'tr') || a.sira - b.sira;
    });
  }
  function urunSuz() { return JP.urunSuzListe(urunKaynak(), fUrun.dugum, fUrun.ara); }

  function logoUrunCek() {
    UI.dene(function () {
      var r = JP.logoUrunleriCek();
      UI.toast('Ürünler güncellendi', r.toplam + ' kart okundu · ' + r.yeni + ' yeni, ' + r.guncel + ' değişti.', 'ok');
    });
  }

  /* --- sol yan panel: ürün ağacı (detay ekranındayken gizlenir) --- */
  function urunAgacPaneli() {
    if (secUrun) return null;
    var agac = JP.urunAgaciListe(urunKaynak());

    function dugum(ad, adet, secili, tikla) {
      return h('button.dugum', { 'aria-current': String(secili), onclick: tikla },
        [h('span.ad', { text: ad }), h('span.adet', { text: String(adet) })]);
    }

    var kok = h('div.agac');
    kok.appendChild(h('div.dal', {}, [
      h('span.kanca.bos'),
      dugum('Tüm ürünler', agac.toplam, !fUrun.dugum, function () { fUrun.dugum = null; kabuk.ciz(); })
    ]));

    agac.gruplar.forEach(function (g) {
      var acik = urunAgacAcik[g.ad] !== false && (urunAgacAcik[g.ad] || (fUrun.dugum && fUrun.dugum.grup === g.ad));
      var secili = !!(fUrun.dugum && fUrun.dugum.grup === g.ad && !fUrun.dugum.seri);
      kok.appendChild(h('div.dal', {}, [
        g.seriler.length > 1 ? h('button.kanca', {
          'aria-expanded': String(!!acik), 'aria-label': g.ad + ' alt kırılımı',
          onclick: function () { urunAgacAcik[g.ad] = !acik; kabuk.ciz(); }
        }, UI.ikon('ok', 13)) : h('span.kanca.bos'),
        dugum(g.ad, g.adet, secili, function () { fUrun.dugum = { grup: g.ad }; urunAgacAcik[g.ad] = true; kabuk.ciz(); })
      ]));
      if (acik && g.seriler.length > 1) {
        kok.appendChild(h('div.cocuk', {}, g.seriler.map(function (se) {
          var s2 = !!(fUrun.dugum && fUrun.dugum.grup === g.ad && fUrun.dugum.seri === se.kod);
          return h('div.dal', {}, [
            h('span.kanca.bos'),
            dugum(se.ad, se.adet, s2, function () { fUrun.dugum = { grup: g.ad, seri: se.kod }; kabuk.ciz(); })
          ]);
        })));
      }
    });

    return [
      h('div.eyebrow', { text: 'Ürün ağacı' }),
      kok,
      h('div.yan-alt', {}, h('div.small.muted', { text: 'Kırılım Logo ürün ağacından gelir: kategori → seri → model.' }))
    ];
  }

  /* --- durum rozetleri: satırda ve kartta aynı --- */
  function urunDurumu(u) {
    /* Yeşil yalnızca "bayi görebiliyor" anlamına ayrıldı; Logo durumu sapma
       olduğunda öne çıksın diye normalde sessiz bir etikettir. */
    return h('span.row.tight', {}, [
      u.siparieAcik ? UI.rozet('Siparişe açık', 'ok') : UI.rozet('Kapalı', ''),
      u.logodaYok ? UI.rozet("Logo'da yok", 'bad')
        : (u.logoAktif ? h('span.badge.plain', { text: 'Logo: aktif' }) : UI.rozet('Logo: pasif', 'warn'))
    ]);
  }

  function urunSatiri(u) {
    return h('div.urow' + (u.siparieAcik ? '' : '.kapali'), {}, [
      h('button.uthumb', { type: 'button', 'aria-label': u.ad + ' — ürün detayı',
        onclick: function () { urunAc(u.kod); } }, UI.kartela(u)),
      h('div.ubilgi', {}, [
        h('div.ukirilim', { text: JP.urunKirilim(u) }),
        h('button.uad', { type: 'button', text: u.ad, title: u.ad, onclick: function () { urunAc(u.kod); } }),
        h('div.umeta', {}, h('span.kod', { text: u.kod }))
      ]),
      h('span.ubirim', { text: u.gosterimBirimi }),
      urunDurumu(u),
      h('button.btn.sm', { text: 'Düzenle', onclick: function () { urunAc(u.kod); } })
    ]);
  }

  function urunKarti(u) {
    return h('div.prod' + (u.siparieAcik ? '' : '.kapali'), {}, [
      h('button.gorsel', { type: 'button', 'aria-label': u.ad + ' — ürün detayı',
        onclick: function () { urunAc(u.kod); } }, [
        UI.kartela(u),
        u.siparieAcik ? null : h('span.sepette-rozet', { text: 'Kapalı' }),
        h('span.buyut', { text: 'Düzenle' })
      ]),
      h('div.pb', {}, [
        h('div.ukirilim', { text: JP.urunKirilim(u) }),
        h('button.pn', { type: 'button', text: u.ad, title: u.ad, onclick: function () { urunAc(u.kod); } }),
        h('div.pc', { text: u.kod + ' · ' + u.gosterimBirimi }),
        urunDurumu(u),
        h('div.pf', {}, h('button.btn.sm', { text: 'Düzenle', onclick: function () { urunAc(u.kod); } }))
      ])
    ]);
  }

  function urunler() {
    var db = JP.db;
    if (secUrun) {
      var u = db.urunler.find(function (x) { return x.kod === secUrun; });
      if (u) return urunEkrani(u);
      secUrun = null;
    }
    /* Liste boşken de eylem ekranda kalmalı: aksi halde "Logo'dan güncelle ile
       çekin" diyen bir uyarı çıkıyor ama düğme çizilmediği için basılamıyordu. */
    if (!db.urunler.length) {
      return h('div.stack', {}, [
        h('div.cat-bar', {}, [
          h('button.btn.primary', { text: "Logo'dan güncelle", title: 'Stok kartlarını Logo’dan okur', onclick: logoUrunCek }),
          UI.senkronBilgi(db.senkron.urun)
        ]),
        h('div.note.warn', { html: '<b>Ürün yok.</b> Yukarıdaki “Logo’dan güncelle” ile stok kartlarını çekin. Ana veri sahibi Logo’dur; portal kartların kopyasını tutar.' })
      ]);
    }

    var tumu = urunKaynak();
    var gorunum = UI.gorunumOku();
    var izgara = h('div.stack');
    var sayimEl = h('span.small.muted.sayim');
    var secEl = h('div.gorunum-sec', { role: 'group', 'aria-label': 'Görünüm' });

    var araGirdi = h('input.ara', {
      type: 'text', value: fUrun.ara, placeholder: 'Ürün adı, stok kodu, kategori veya özellik ara…',
      'aria-label': 'Ürünlerde ara',
      oninput: function (e) { fUrun.ara = e.target.value; izgaraCiz(); }
    });

    function secCiz() {
      secEl.textContent = '';
      [['liste', 'Liste'], ['kart', 'Kart']].forEach(function (o) {
        secEl.appendChild(h('button', {
          type: 'button', 'aria-pressed': String(gorunum === o[0]), title: o[1] + ' görünümü',
          onclick: function () { gorunum = o[0]; UI.gorunumYaz(o[0]); secCiz(); izgaraCiz(); }
        }, [UI.ikon(o[0], 14), h('span', { text: o[1] })]));
      });
    }

    function izgaraCiz() {
      var liste = urunSuz();
      sayimEl.textContent = liste.length + ' / ' + tumu.length + ' ürün';
      izgara.textContent = '';
      if (!liste.length) { izgara.appendChild(h('div.empty', { text: 'Bu kırılımda ürün yok.' })); return; }
      if (gorunum === 'kart') {
        izgara.appendChild(h('div.cat', {}, liste.map(urunKarti)));
      } else {
        izgara.appendChild(h('div.ulist.yonetim', {}, [
          h('div.ubas', {}, [
            h('span', { text: 'Görsel' }), h('span', { text: 'Ürün' }),
            h('span', { text: 'Birim' }), h('span', { text: 'Durum' }), h('span')
          ])
        ].concat(liste.map(urunSatiri))));
      }
    }

    secCiz();
    izgaraCiz();

    return h('div.stack', {}, [
      h('div.cat-bar', {}, [
        fUrun.dugum ? h('button.chip', {
          'aria-pressed': 'true',
          text: (fUrun.dugum.grup || '') + (fUrun.dugum.seri ? ' · ' + fUrun.dugum.seri : '') + '  ✕',
          title: 'Kırılımı temizle',
          onclick: function () { fUrun.dugum = null; kabuk.ciz(); }
        }) : null,
        araGirdi,
        sayimEl,
        secEl,
        h('button.btn.primary.sm', { text: "Logo'dan güncelle", title: 'Stok kartlarını Logo’dan yeniden okur', onclick: logoUrunCek }),
        UI.senkronBilgi(db.senkron.urun)
      ]),
      izgara
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

      h('div.grid.k2.ust', {}, [
        h('div.stack', {}, [
          UI.panel('Logo alanları', h('span.small.muted', { text: 'Salt okunur' }), h('div.stack', {}, [
            h('dl.kv', {}, [
              h('dt', { text: 'Stok kodu' }), h('dd.mono', { text: u.kod }),
              h('dt', { text: 'Ad' }), h('dd', { text: u.ad }),
              h('dt', { text: 'Kategori · seri' }), h('dd', { text: JP.urunKirilim(u) }),
              h('dt', { text: 'Birim' }), h('dd.mono', { text: u.birim }),
              h('dt', { text: 'Durum' }), h('dd', {}, u.logodaYok ? UI.rozet("Logo'da yok", 'bad') : (u.logoAktif ? UI.rozet('Aktif', 'ok') : UI.rozet('Pasif', 'warn')))
            ])
          ])),
          gorselPaneli(u)
        ]),
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

      UI.panel('Bu üründe tamamlanmayı bekleyen talepler', h('span.small.muted', { text: bekleyenSatir.length + ' bayi' }),
        UI.tablo(['Bayi', { t: 'Talep edilen', num: true }, { t: 'İşleme alınan', num: true }, { t: 'Tamamlanan', num: true }, { t: 'Kalan', num: true }, { t: 'Yaş', num: true }],
          bekleyenSatir.map(function (r) {
            return h('tr', {}, [
              h('td.small', {}, h('button.btn.ghost.sm', { text: bayiAd(r.bayiKod), onclick: function () { secUrun = null; bayiAc(r.bayiKod); } })),
              h('td.num.mono', { text: JP.fmt.miktar(r.talep) }),
              h('td.num.mono', { text: JP.fmt.miktar(r.siparis) }),
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
    if (talepGiris) return talepGirisEkrani();
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
        ? UI.panel(null, null, UI.tablo(['Bayi', 'Şehir / Ülke', 'Logo', 'Siparişe', 'Katalog', { t: 'Kullanıcı', num: true }, { t: 'Açık talep', num: true }, ''],
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
                h('td.right', {}, h('div.row.tight', { style: { justifyContent: 'flex-end' } }, [
                  b.siparisAcik ? h('button.btn.primary.sm', { text: 'Talep oluştur',
                    title: 'Telefonla gelen talebi bu bayi adına gir',
                    onclick: function (e) { e.stopPropagation(); talepGirisAc(b.kod); } }) : null,
                  h('button.btn.ghost.sm', { text: 'Detay', onclick: function (e) { e.stopPropagation(); bayiAc(b.kod); } })
                ]))
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

  /* ------------------------------------- bayi adına talep girişi (telefon talebi)
   * Bayi telefonla arayıp sipariş verdiğinde muhasebe talebi onun adına girer.
   * Ekran bayi kataloğunun aynısıdır: ürün ağacı, arama, Liste/Kart, miktar
   * sayacı ve sepete ekleme. Sepet ayrı bir kutuda durur (firma:<bayiKod>),
   * bayinin kendi taslak sepetine karışmaz. */
  function talepGirisAc(bayiKod) {
    talepGiris = { bayiKod: bayiKod, gorunum: 'katalog', ara: '', dugum: null };
    secBayi = null;
    kabuk.git('bayiler');
  }
  function talepGirisKutusu() { return JP.firmaSepetKodu(talepGiris.bayiKod); }
  function tgAdim(u) { return u.birim === 'ADET' ? 1 : 10; }
  function tgVarsayilan(u) { return u.birim === 'ADET' ? 1 : 50; }

  function talepGirisAgacPaneli() {
    if (!talepGiris || talepGiris.gorunum !== 'katalog') return null;
    var agac = JP.urunAgaci(talepGiris.bayiKod);

    function dugum(ad, adet, secili, tikla) {
      return h('button.dugum', { 'aria-current': String(secili), onclick: tikla },
        [h('span.ad', { text: ad }), h('span.adet', { text: String(adet) })]);
    }
    var kok = h('div.agac');
    kok.appendChild(h('div.dal', {}, [
      h('span.kanca.bos'),
      dugum('Tüm ürünler', agac.toplam, !talepGiris.dugum, function () { talepGiris.dugum = null; kabuk.ciz(); })
    ]));
    agac.gruplar.forEach(function (g) {
      var acik = tgAgacAcik[g.ad] !== false && (tgAgacAcik[g.ad] || (talepGiris.dugum && talepGiris.dugum.grup === g.ad));
      var secili = !!(talepGiris.dugum && talepGiris.dugum.grup === g.ad && !talepGiris.dugum.seri);
      kok.appendChild(h('div.dal', {}, [
        g.seriler.length > 1 ? h('button.kanca', {
          'aria-expanded': String(!!acik), 'aria-label': g.ad + ' alt kırılımı',
          onclick: function () { tgAgacAcik[g.ad] = !acik; kabuk.ciz(); }
        }, UI.ikon('ok', 13)) : h('span.kanca.bos'),
        dugum(g.ad, g.adet, secili, function () { talepGiris.dugum = { grup: g.ad }; tgAgacAcik[g.ad] = true; kabuk.ciz(); })
      ]));
      if (acik && g.seriler.length > 1) {
        kok.appendChild(h('div.cocuk', {}, g.seriler.map(function (se) {
          var s2 = !!(talepGiris.dugum && talepGiris.dugum.grup === g.ad && talepGiris.dugum.seri === se.kod);
          return h('div.dal', {}, [
            h('span.kanca.bos'),
            dugum(se.ad, se.adet, s2, function () { talepGiris.dugum = { grup: g.ad, seri: se.kod }; kabuk.ciz(); })
          ]);
        })));
      }
    });
    return [h('div.eyebrow', { text: 'Ürün ağacı' }), kok,
      h('div.yan-alt', {}, h('div.small.muted', { text: 'Yalnızca bu bayinin kataloğuna açık ürünler listelenir.' }))];
  }

  /* Bayi kataloğuyla aynı davranış: sayaç sepetteki miktarı gösterir, sepetteki
     ürünün miktarı doğrudan buradan değişir, düğme "Çıkar" olur. */
  function tgHizliEkle(u, bayiKod) {
    var kutu = talepGirisKutusu();
    var sepette = tgSepetteMiktar(bayiKod, u.kod);
    var sayac = UI.sayac({
      deger: sepette || tgVarsayilan(u), adim: tgAdim(u), enAz: 0, etiket: u.ad + ' miktarı',
      onDegisim: sepette ? function (v) { UI.dene(function () { JP.sepetAyarla(bayiKod, u.kod, v, kutu); }); } : null
    });
    function ekle() {
      UI.dene(function () {
        var yeni = JP.sepetAyarla(bayiKod, u.kod, sayac.deger(), kutu);
        UI.toast(yeni ? 'Sepete eklendi' : 'Sepetten çıkarıldı',
          u.ad + (yeni ? ' · sepette ' + JP.fmt.miktar(yeni) + ' ' + u.birim : ''), 'ok');
      });
    }
    function cikar() {
      UI.dene(function () { JP.sepetAyarla(bayiKod, u.kod, 0, kutu); UI.toast('Sepetten çıkarıldı', u.ad, 'ok'); });
    }
    sayac.girdi.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); if (!sepette) ekle(); else sayac.girdi.blur(); }
    });
    return {
      sayac: sayac,
      dugme: sepette
        ? h('button.btn.sm', { text: 'Çıkar', title: 'Ürünü sepetten çıkar', onclick: cikar })
        : h('button.btn.primary.sm', { text: 'Sepete ekle', title: 'Miktarı girip Enter’a da basabilirsiniz', onclick: ekle })
    };
  }

  function tgSepetteMiktar(bayiKod, urunKod) {
    var s = JP.sepetOku(bayiKod, talepGirisKutusu()).find(function (x) { return x.urunKod === urunKod; });
    return s ? s.miktar : 0;
  }

  function tgSatir(u, bayiKod) {
    var sepette = tgSepetteMiktar(bayiKod, u.kod);
    var he = tgHizliEkle(u, bayiKod);
    return h('div.urow' + (sepette ? '.sepette' : ''), {}, [
      h('span.uthumb', {}, UI.kartela(u)),
      h('div.ubilgi', {}, [
        h('div.ukirilim', { text: JP.urunKirilim(u) }),
        h('span.uad', { text: u.ad, title: u.ad }),
        h('div.umeta', {}, [
          h('span.kod', { text: u.kod }),
          sepette ? h('span.usepette', { text: ' · sepette ' + JP.fmt.miktar(sepette) + ' ' + u.birim }) : null
        ])
      ]),
      h('span.ubirim', { text: u.gosterimBirimi }),
      he.sayac,
      he.dugme
    ]);
  }

  function tgKart(u, bayiKod) {
    var sepette = tgSepetteMiktar(bayiKod, u.kod);
    var he = tgHizliEkle(u, bayiKod);
    return h('div.prod' + (sepette ? '.sepette' : ''), {}, [
      h('span.gorsel', {}, [
        UI.kartela(u),
        sepette ? h('span.sepette-rozet', { text: 'sepette ' + JP.fmt.miktar(sepette) }) : null
      ]),
      h('div.pb', {}, [
        h('div.ukirilim', { text: JP.urunKirilim(u) }),
        h('span.pn', { text: u.ad, title: u.ad }),
        h('div.pc', { text: u.kod + ' · ' + u.gosterimBirimi }),
        h('div.pf', {}, [he.sayac, he.dugme])
      ])
    ]);
  }

  function talepGirisEkrani() {
    var db = JP.db;
    var b = db.bayiler.find(function (x) { return x.kod === talepGiris.bayiKod; });
    if (!b) { talepGiris = null; return h('div.empty', { text: 'Bayi bulunamadı.' }); }
    var kutu = talepGirisKutusu();
    var sepet = JP.sepetOku(b.kod, kutu);

    var bas = h('div.stack', {}, [
      h('div.row', {}, [
        h('button.btn.ghost.sm', { text: '← Bayi listesi', onclick: function () { talepGiris = null; kabuk.ciz(); } }),
        h('div.spacer'),
        h('div.seg', {}, [
          h('button', { 'aria-pressed': String(talepGiris.gorunum === 'katalog'), text: 'Ürün kataloğu',
            onclick: function () { talepGiris.gorunum = 'katalog'; kabuk.ciz(); } }),
          h('button', { 'aria-pressed': String(talepGiris.gorunum === 'sepet'),
            text: 'Sepet' + (sepet.length ? ' (' + sepet.length + ')' : ''),
            onclick: function () { talepGiris.gorunum = 'sepet'; kabuk.ciz(); } })
        ])
      ]),
      UI.panel(null, null, h('div.row', {}, [
        h('span.eyebrow', { text: 'Bayi adına talep' }),
        h('h2', { text: b.unvan }),
        h('span.tag', { text: b.kod }),
        h('button.btn.ghost.sm', { text: 'Bayi kartı', onclick: function () { talepGiris = null; bayiAc(b.kod); } }),
        h('div.spacer'),
        h('span.small.muted', { text: 'Telefonla gelen talepler için. Talep bayi adına, kaynağı “firma girişi” olarak kaydedilir.' })
      ]))
    ]);

    if (!b.siparisAcik) {
      bas.appendChild(h('div.note.bad', { text: 'Bu bayi siparişe kapalı; adına talep oluşturulamaz. Bayi kartından siparişe açın.' }));
      return bas;
    }

    if (talepGiris.gorunum === 'sepet') { bas.appendChild(tgSepetEkrani(b, sepet)); return bas; }

    var tumu = JP.bayiUrunleri(b.kod);
    if (!tumu.length) {
      bas.appendChild(h('div.note.warn', { text: 'Bu bayiye açık ürün yok. Bayi kartındaki katalog kısıtını gözden geçirin.' }));
      return bas;
    }
    if (b.kisit.tip !== 'tumu') {
      bas.appendChild(h('div.note', { html: '<b>Sınırlı katalog.</b> Bu bayiye ' + kisitMetni(b).toLocaleLowerCase('tr') + ' açık.' }));
    }

    var gorunum = UI.gorunumOku();
    var izgara = h('div.stack');
    var sayimEl = h('span.small.muted.sayim');
    var secEl = h('div.gorunum-sec', { role: 'group', 'aria-label': 'Görünüm' });
    var araGirdi = h('input.ara', {
      type: 'text', value: talepGiris.ara, placeholder: 'Ürün adı, stok kodu, kategori veya özellik ara…',
      'aria-label': 'Katalogda ara',
      oninput: function (e) { talepGiris.ara = e.target.value; izgaraCiz(); }
    });

    function secCiz() {
      secEl.textContent = '';
      [['liste', 'Liste'], ['kart', 'Kart']].forEach(function (o) {
        secEl.appendChild(h('button', {
          type: 'button', 'aria-pressed': String(gorunum === o[0]), title: o[1] + ' görünümü',
          onclick: function () { gorunum = o[0]; UI.gorunumYaz(o[0]); secCiz(); izgaraCiz(); }
        }, [UI.ikon(o[0], 14), h('span', { text: o[1] })]));
      });
    }
    function izgaraCiz() {
      var liste = JP.urunSuz(b.kod, talepGiris.dugum, talepGiris.ara);
      sayimEl.textContent = liste.length + ' / ' + tumu.length + ' ürün';
      izgara.textContent = '';
      if (!liste.length) { izgara.appendChild(h('div.empty', { text: 'Bu kırılımda ürün yok.' })); return; }
      if (gorunum === 'kart') {
        izgara.appendChild(h('div.cat', {}, liste.map(function (u) { return tgKart(u, b.kod); })));
      } else {
        izgara.appendChild(h('div.ulist', {}, [
          h('div.ubas', {}, [h('span', { text: 'Görsel' }), h('span', { text: 'Ürün' }),
            h('span', { text: 'Birim' }), h('span', { text: 'Miktar' }), h('span')])
        ].concat(liste.map(function (u) { return tgSatir(u, b.kod); }))));
      }
    }
    secCiz();
    izgaraCiz();

    bas.appendChild(h('div.cat-bar', {}, [
      talepGiris.dugum ? h('button.chip', {
        'aria-pressed': 'true',
        text: (talepGiris.dugum.grup || '') + (talepGiris.dugum.seri ? ' · ' + talepGiris.dugum.seri : '') + '  ✕',
        title: 'Kırılımı temizle',
        onclick: function () { talepGiris.dugum = null; kabuk.ciz(); }
      }) : null,
      araGirdi, sayimEl, secEl
    ]));
    bas.appendChild(izgara);
    return bas;
  }

  function tgSepetEkrani(b, sepet) {
    var kutu = talepGirisKutusu();
    if (!sepet.length) {
      return h('div.stack', {}, [
        h('div.empty', { text: 'Sepet boş. Katalogdan ürün ekleyin.' }),
        h('div.row', {}, [h('div.spacer'),
          h('button.btn.primary', { text: 'Ürün kataloğuna git', onclick: function () { talepGiris.gorunum = 'katalog'; kabuk.ciz(); } }),
          h('div.spacer')])
      ]);
    }
    var gecersiz = sepet.filter(function (s) { return s.gecersiz; });
    var notAlan = h('textarea', { rows: 3, placeholder: b.teslimatNotu || 'Telefon notu, teslimat veya ton bilgisi…' });
    var tarihAlan = h('input', { type: 'date' });

    function olustur() {
      UI.dene(function () {
        var t = JP.sepetOnayla(b.kod, notAlan.value, tarihAlan.value || null, null, kutu);
        talepGiris = null;
        UI.toast('Talep oluşturuldu', t.no + ' · ' + b.unvan + ' adına kaydedildi.', 'ok');
        talepAc(t.no);
      });
    }

    return h('div.stack', {}, [
      gecersiz.length ? h('div.note.bad', {
        html: '<b>' + gecersiz.map(function (s) { return s.urunKod; }).join(', ') + ' artık siparişe kapalı.</b> Talebi oluşturmadan önce sepetten çıkarın.'
      }) : null,
      UI.panel('Sepet (' + sepet.length + ' kalem)',
        h('button.btn.ghost.sm', { text: 'Sepeti boşalt',
          onclick: function () { UI.onay('Sepeti boşalt', 'Bu bayi için girilen tüm kalemler silinecek.', function () { JP.sepetTemizle(b.kod, kutu); }, true); } }),
        h('div', {}, [
          h('div', {}, sepet.map(function (s) {
            var sayac = UI.sayac({ deger: s.miktar, adim: tgAdim(s.urun || {}), enAz: 0, etiket: 'Miktar',
              onDegisim: function (v) { UI.dene(function () { JP.sepetMiktar(b.kod, s.urunKod, v, kutu); }); } });
            return h('div.sepet-satir', {}, [
              UI.kartela(s.urun || { doku: 'diger', renk: '#B9AE99' }, '40px'),
              h('div', {}, [
                h('div.ad', { text: s.urun ? s.urun.ad : s.urunKod }),
                h('div.alt', { text: s.urunKod + (s.gecersiz ? ' · siparişe kapalı' : '') })
              ]),
              sayac,
              h('button.btn.ghost.sm', { text: 'Çıkar', onclick: function () { JP.sepetCikar(b.kod, s.urunKod, kutu); } })
            ]);
          })),
          h('div.sepet-ozet', {}, [
            h('span.mono', { text: sepet.length + ' kalem' }),
            h('span.small.muted', { text: 'Miktarlar her ürünün kendi biriminden' }),
            h('div.spacer'),
            h('button.btn', { text: 'Katalogda devam et', onclick: function () { talepGiris.gorunum = 'katalog'; kabuk.ciz(); } })
          ])
        ]), true),
      UI.panel('Talep bilgileri', null, h('div.grid.k2', {}, [
        h('label.f', {}, ['Talep notu', notAlan]),
        h('label.f', {}, ['İstenen teslim tarihi (opsiyonel)', tarihAlan])
      ])),
      h('div.row', {}, [
        h('div.small.muted', { text: 'Talep ' + b.unvan + ' adına, kaynağı “firma girişi” olarak oluşur. Sipariş ayrı bir adımdır.' }),
        h('div.spacer'),
        h('button.btn.primary', { text: 'Talep oluştur', disabled: gecersiz.length > 0, onclick: olustur })
      ])
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
        h('button.btn.sm', { text: "Logo'dan güncelle", onclick: logoBayiCek }),
        b.siparisAcik ? h('button.btn.primary', { text: 'Talep oluştur',
          title: 'Telefonla gelen talebi bu bayi adına gir',
          onclick: function () { talepGirisAc(b.kod); } }) : null
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
      UI.tablo(['Tarih', 'Talep no', 'Durum', { t: 'Kalem', num: true }, 'Tamamlanma', ''],
        liste.map(function (t) {
          var s = tamamSayim(JP.talepKalemDurum(t), 'talep', 'fatura');
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
      UI.tablo(['Tarih', 'Sipariş no', 'Durum', 'Logo fiş', { t: 'Kalem', num: true }, 'Tamamlanma', ''],
        liste.map(function (s) {
          var sy = tamamSayim(JP.siparisKalemDurum(s), 'logoMiktar', 'sevk');
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
  function kullaniciAc(id) {
    var k = JP.kullanici(id);
    secKullanici = id;
    kullaniciTipi = JP.kullaniciTipi(k) === 'firma' ? 'firma' : 'bayi';
    kabuk.git(kullaniciTipi === 'firma' ? 'firmaKullanicilari' : 'bayiKullanicilari');
  }

  function kullaniciSuz(tip) {
    var f = fKullanici[tip];
    var q = kucult(f.ara).trim();
    return JP.kullanicilar(null, tip).filter(function (k) {
      if (tip === 'bayi' && f.bayiKod && k.bayiKod !== f.bayiKod) return false;
      if (f.durum && k.durum !== f.durum) return false;
      if (!q) return true;
      var alan = k.ad + ' ' + k.eposta + ' ' + JP.rolAdi(k.rol) +
        (tip === 'bayi' ? ' ' + bayiAd(k.bayiKod) + ' ' + k.bayiKod : ' jalpersan');
      return kucult(alan).indexOf(q) >= 0;
    });
  }

  function durumRozeti(d) {
    return UI.rozet(d, d === 'Aktif' ? 'ok' : (d === 'Davet gönderildi' ? 'warn' : ''));
  }

  /* Bayi ve firma kullanıcıları aynı ekranı paylaşır; tek fark bayi sütunu ve
     filtresidir. Firma kullanıcısı cari karta bağlı değildir. */
  function kullanicilar(tip) {
    var db = JP.db;
    var f = fKullanici[tip];
    if (secKullanici) {
      var k = JP.kullanici(secKullanici);
      if (k && JP.kullaniciTipi(k) === tip) return kullaniciEkrani(k);
      secKullanici = null;
    }

    var liste = kullaniciSuz(tip);
    var tumu = JP.kullanicilar(null, tip);
    var govde = h('div');
    function tabloCiz() {
      govde.textContent = '';
      var basliklar = tip === 'bayi'
        ? ['Ad soyad', 'E-posta', 'Bayi', 'Rol', 'Durum', 'Son giriş', '']
        : ['Ad soyad', 'E-posta', 'Rol', 'Durum', 'Son giriş', ''];
      govde.appendChild(UI.panel(null, null, UI.tablo(basliklar,
        liste.map(function (k) {
          var hucre = [
            h('td', { text: k.ad, style: { fontWeight: '500' } }),
            h('td.small.mono', { text: k.eposta })
          ];
          if (tip === 'bayi') hucre.push(h('td.small', { text: bayiAd(k.bayiKod) }));
          hucre.push(h('td.small.muted', { text: JP.rolAdi(k.rol) }));
          hucre.push(h('td', {}, durumRozeti(k.durum)));
          hucre.push(h('td.small.muted.nowrap', { text: k.sonGiris ? JP.fmt.tarih(k.sonGiris) : '—' }));
          hucre.push(h('td.right', {}, h('button.btn.ghost.sm', { text: 'Detay', onclick: function (e) { e.stopPropagation(); kullaniciAc(k.id); } })));
          return h('tr', { style: { cursor: 'pointer' }, onclick: function () { kullaniciAc(k.id); } }, hucre);
        }), tumu.length ? 'Filtreye uyan kullanıcı yok.' : 'Henüz kullanıcı tanımlanmadı.'), true));
    }
    function yenile(yerinde) {
      liste = kullaniciSuz(tip);
      sayimEl.textContent = liste.length + ' / ' + tumu.length + ' kullanıcı';
      if (yerinde) tabloCiz(); else kabuk.ciz();
    }
    var sayimEl = h('span.small.muted', { text: liste.length + ' / ' + tumu.length + ' kullanıcı' });
    tabloCiz();

    var alanlar = [
      h('label.f.filtre-alan', {}, ['Ara', h('input.filtre-ara', {
        type: 'text', value: f.ara,
        placeholder: tip === 'bayi' ? 'Ad, e-posta veya bayi ara…' : 'Ad, e-posta veya rol ara…',
        oninput: function (e) { f.ara = e.target.value; yenile(true); } })])
    ];
    if (tip === 'bayi') {
      alanlar.push(h('label.f.filtre-alan', {}, ['Bayi', h('select', { onchange: function (e) { f.bayiKod = e.target.value; yenile(); } },
        [h('option', { value: '', text: 'Tümü', selected: !f.bayiKod })].concat(
          db.bayiler.map(function (b) { return h('option', { value: b.kod, selected: f.bayiKod === b.kod, text: b.unvan }); })))]));
    }
    alanlar.push(h('label.f.filtre-alan', {}, ['Durum', h('select', { onchange: function (e) { f.durum = e.target.value; yenile(); } },
      [h('option', { value: '', text: 'Tümü', selected: !f.durum })].concat(
        JP.KULLANICI_DURUM.map(function (d) { return h('option', { value: d, selected: f.durum === d, text: d }); })))]));
    alanlar.push(h('div.filtre-son', {}, [
      sayimEl,
      h('button.btn.primary.sm', {
        text: tip === 'bayi' ? 'Bayi kullanıcısı ekle' : 'Firma kullanıcısı ekle',
        onclick: function () { kullaniciEkleKip(tip, tip === 'bayi' ? f.bayiKod : null); } })
    ]));

    return h('div.stack', {}, [
      h('div.filtre', {}, alanlar),
      h('div.small.muted', { text: tip === 'bayi'
        ? 'Bayi kullanıcıları bir cari karta bağlıdır ve bayi portalına girer.'
        : 'Firma kullanıcıları bu panele girer; cari karta bağlı değildir. Kullanıcı yönetimi yalnızca Yönetici rolündedir.' }),
      govde
    ]);
  }

  function kullaniciEkleKip(tip, bayiKod) {
    var db = JP.db;
    if (tip === 'bayi' && !db.bayiler.length) { UI.hata(new Error('Önce Logo’dan bayileri çekin.')); return; }
    var roller = JP.roller(tip);
    var ad = h('input', { type: 'text', placeholder: 'Ad Soyad' });
    var eposta = h('input', {
      type: 'text', inputmode: 'email',
      placeholder: tip === 'bayi' ? 'ad.soyad@bayi.example' : 'ad.soyad@jalpersan.example'
    });
    var bayiSec = tip === 'bayi' ? h('select', {}, db.bayiler.map(function (b) {
      return h('option', { value: b.kod, selected: b.kod === bayiKod, text: b.unvan + ' (' + b.kod + ')' });
    })) : null;
    /* En az yetkili rol öntanımlı gelsin: firma hesabı Muhasebe, bayi hesabı
       günlük kullanımdaki Sipariş yetkilisi. */
    var varsayilanRol = tip === 'firma' ? 'muhasebe' : 'yetkili';
    var rolSec = h('select', {}, roller.map(function (r) {
      return h('option', { value: r.kod, selected: r.kod === varsayilanRol, text: r.ad });
    }));
    var dilSec = h('select', {}, [h('option', { value: 'tr', text: 'Türkçe' }), h('option', { value: 'en', text: 'İngilizce' })]);
    var rolNot = h('div.small.muted', { text: (roller.find(function (r) { return r.kod === varsayilanRol; }) || roller[0]).aciklama });
    rolSec.addEventListener('change', function () {
      var r = roller.find(function (x) { return x.kod === rolSec.value; });
      rolNot.textContent = r ? r.aciklama : '';
    });

    UI.modal({
      baslik: tip === 'bayi' ? 'Bayi kullanıcısı ekle' : 'Firma kullanıcısı ekle',
      etiket: 'Davet bağlantısı gönderilir',
      icerik: h('div.stack', {}, [
        h('div.grid.k2', {}, [
          h('label.f', {}, ['Ad soyad', ad]),
          h('label.f', {}, ['E-posta', eposta]),
          bayiSec ? h('label.f', {}, ['Bağlı bayi', bayiSec]) : null,
          h('label.f', {}, ['Dil tercihi', dilSec])
        ]),
        h('label.f', {}, ['Rol', rolSec]),
        rolNot,
        h('div.note', { text: tip === 'bayi'
          ? 'Hesap “Davet gönderildi” durumunda oluşur. Kullanıcı davet bağlantısından şifresini belirleyip giriş yapınca “Aktif” olur ve bayi portalına girer.'
          : 'Hesap “Davet gönderildi” durumunda oluşur. Firma kullanıcısı giriş yaptığında bu panele gelir; cari karta bağlanmaz.' })
      ]),
      aksiyonlar: function (kapat) {
        return [
          h('button.btn', { text: 'Vazgeç', onclick: kapat }),
          h('button.btn.primary', { text: 'Oluştur ve davet gönder',
            onclick: function () {
              UI.dene(function () {
                var k = JP.kullaniciEkle({
                  tip: tip, ad: ad.value, eposta: eposta.value,
                  bayiKod: bayiSec ? bayiSec.value : null, rol: rolSec.value, dil: dilSec.value
                });
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
    var tip = JP.kullaniciTipi(k);
    var bayi = tip === 'bayi'
      ? (db.bayiler.find(function (b) { return b.kod === k.bayiKod; }) || { unvan: k.bayiKod, kod: k.bayiKod, siparisAcik: false })
      : null;
    var ad = h('input', { type: 'text', value: k.ad });
    var eposta = h('input', { type: 'text', value: k.eposta, inputmode: 'email' });
    var bayiSec = tip === 'bayi'
      ? h('select', {}, db.bayiler.map(function (b) { return h('option', { value: b.kod, selected: b.kod === k.bayiKod, text: b.unvan + ' (' + b.kod + ')' }); }))
      : null;
    var rolSec = h('select', {}, JP.roller(tip).map(function (r) { return h('option', { value: r.kod, selected: r.kod === k.rol, text: r.ad }); }));
    var dilSec = h('select', {}, [
      h('option', { value: 'tr', selected: k.dil === 'tr', text: 'Türkçe' }),
      h('option', { value: 'en', selected: k.dil === 'en', text: 'İngilizce' })
    ]);
    var yetki = tip === 'bayi' ? JP.talepYetkisi(k) : { olur: true, sebep: '' };
    var kendisi = aktifKullanici() && aktifKullanici().id === k.id;

    function kaydet() {
      UI.dene(function () {
        var alanlar = { ad: ad.value, eposta: eposta.value, rol: rolSec.value, dil: dilSec.value };
        if (bayiSec) alanlar.bayiKod = bayiSec.value;
        JP.kullaniciGuncelle(k.id, alanlar);
        UI.toast('Kullanıcı kaydedildi', ad.value, 'ok');
      });
    }

    return h('div.stack', {}, [
      h('div.row', {}, [
        h('button.btn.ghost.sm', { text: tip === 'firma' ? '← Firma kullanıcıları' : '← Bayi kullanıcıları',
          onclick: function () { secKullanici = null; kabuk.ciz(); } }),
        h('div.spacer'),
        h('button.btn.sm', { text: 'Daveti yeniden gönder',
          onclick: function () { UI.dene(function () { JP.kullaniciDavet(k.id); UI.toast('Davet gönderildi', k.eposta, 'ok'); }); } }),
        h('button.btn.sm', { text: 'Şifre sıfırlama gönder',
          onclick: function () { UI.dene(function () { JP.kullaniciDavet(k.id, 'sifre'); UI.toast('Bağlantı gönderildi', k.eposta, 'ok'); }); } }),
        k.durum === 'Pasif'
          ? h('button.btn.sm', { text: 'Aktife al', onclick: function () { UI.dene(function () { JP.kullaniciDurum(k.id, 'Aktif'); UI.toast('Hesap aktif', k.ad, 'ok'); }); } })
          : h('button.btn.sm', { text: 'Pasife al', disabled: kendisi,
              title: kendisi ? 'Kendi hesabınızı pasife alamazsınız' : '',
              onclick: function () { UI.onay('Hesabı pasife al', k.ad + ' portala giriş yapamayacak. Talep ve sipariş kayıtları korunur.', function () { JP.kullaniciDurum(k.id, 'Pasif'); }, true); } }),
        h('button.btn.ghost.sm.danger', { text: 'Sil', disabled: kendisi,
          title: kendisi ? 'Kendi hesabınızı silemezsiniz' : '',
          onclick: function () { UI.onay('Kullanıcıyı sil', k.ad + ' silinecek. Oluşturduğu talepler kayıtta kalır.', function () { JP.kullaniciSil(k.id); secKullanici = null; kabuk.ciz(); UI.toast('Kullanıcı silindi', k.ad, 'ok'); }, true); } }),
        h('button.btn.primary', { text: 'Kaydet', onclick: kaydet })
      ]),

      UI.panel(null, null, h('div.row', {}, [
        h('span.avatar', { text: basHarf(k.ad) }),
        h('h2', { text: k.ad }),
        durumRozeti(k.durum),
        h('span.tag', { text: JP.rolAdi(k.rol) }),
        bayi ? h('button.btn.ghost.sm', { text: bayi.unvan, onclick: function () { secKullanici = null; bayiAc(k.bayiKod); } })
             : h('span.badge.plain', { text: 'Jalpersan · firma kullanıcısı' }),
        kendisi ? h('span.badge.acc', { text: 'oturumdaki hesap' }) : null,
        h('span.small.muted', { text: k.eposta })
      ])),

      (tip === 'bayi' && !yetki.olur) ? h('div.note.warn', { text: 'Bu kullanıcı şu anda talep oluşturamaz: ' + yetki.sebep }) : null,

      h('div.grid.k2', {}, [
        UI.panel('Hesap bilgileri', h('span.small.muted', { text: 'Düzenlenebilir' }), h('div.stack', {}, [
          h('div.grid.k2', {}, [
            h('label.f', {}, ['Ad soyad', ad]),
            h('label.f', {}, ['E-posta (giriş adresi)', eposta])
          ]),
          h('div.grid.k2', {}, [
            bayiSec ? h('label.f', {}, ['Bağlı bayi', bayiSec]) : null,
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
            h('dt', { text: 'Girdiği ekran' }), h('dd', { text: tip === 'firma' ? 'Firma paneli' : 'Bayi portalı' }),
            bayi ? h('dt', { text: 'Bayi durumu' }) : null,
            bayi ? h('dd', {}, bayi.siparisAcik ? UI.rozet('Siparişe açık', 'ok') : UI.rozet('Siparişe kapalı', 'warn')) : null
          ]),
          h('div.small.muted', { text: 'Gerçek kurulumda kimlik doğrulama ASP.NET Core Identity ile yapılır: davet bağlantısı, şifre politikası, hesap kilitleme ve opsiyonel iki adımlı doğrulama.' })
        ]))
      ]),

      tip !== 'bayi' ? null : UI.panel('Bu kullanıcının oluşturduğu talepler', null,
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
      h('button.btn.primary.sm', { text: 'Kullanıcı ekle', onclick: function () { kullaniciEkleKip('bayi', b.kod); } })
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

  /* ------------------------------------------------------ ürün görselleri
   * Görsel bir portal ek alanıdır (teknik doküman 3.2): birden fazla görsel ve
   * sıralama. İlk sıradaki görsel katalogda ve listelerde gösterilir. Portal
   * görseli yoksa Jalpersan kataloğundan gelen seri görseli kullanılır. */
  function gorselPaneli(u) {
    var liste = JP.urunGorselListe(u);
    var portalVar = (u.gorseller || []).length > 0;

    var dosya = h('input', {
      type: 'file', accept: 'image/*', style: { display: 'none' },
      onchange: function (e) {
        var f = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!f) return;
        UI.gorselKucult(f, 640, 0.72).then(function (veri) {
          UI.dene(function () {
            JP.urunGorselEkle(u.kod, veri, 'yerel');
            UI.toast('Görsel eklendi', u.kod, 'ok');
          });
        }).catch(UI.hata);
      }
    });

    function adresKip() {
      var adres = h('input', { type: 'text', placeholder: 'https://…/gorsel.jpg' });
      UI.modal({
        baslik: 'Adres ile görsel ekle', etiket: u.kod,
        icerik: h('div.stack', {}, [
          h('label.f', {}, ['Görsel adresi', adres]),
          h('div.small.muted', { text: 'Dış adresler bazı ortamlarda engellenebilir; kalıcı sonuç için dosya yüklemek daha güvenlidir.' })
        ]),
        aksiyonlar: function (kapat) {
          return [
            h('button.btn', { text: 'Vazgeç', onclick: kapat }),
            h('button.btn.primary', { text: 'Ekle',
              onclick: function () { UI.dene(function () { JP.urunGorselEkle(u.kod, adres.value.trim(), 'adres'); kapat(); UI.toast('Görsel eklendi', u.kod, 'ok'); }); } })
          ];
        }
      });
    }

    var kartlar = liste.map(function (g, i) {
      var kutu = h('div.swatch.sw-' + (u.doku || 'diger'), { style: { '--sw': u.renk || '#B9AE99' } });
      var im = h('img.kartela-foto', {
        src: g.src, alt: '', decoding: 'async',
        onerror: function () { im.remove(); UI.tuvaleCiz(kutu, g.src); }   // CSP img-src'yi engellerse tuvale çiz
      });
      kutu.appendChild(im);
      return h('div.gorsel-kart' + (i === 0 && g.portal ? '.ilk' : ''), {}, [
        h('div.on', {}, [
          kutu,
          i === 0 && g.portal ? h('span.rozet', { text: 'Katalogda' }) : null,
          g.tip === 'adres' ? h('span.rozet.dis', { text: 'Adres' }) : null
        ]),
        g.portal ? h('div.arac', {}, [
          h('button', { text: '←', title: 'Sola al', disabled: i === 0, onclick: function () { UI.dene(function () { JP.urunGorselTasi(u.kod, i, -1); }); } }),
          h('button', { text: '→', title: 'Sağa al', disabled: i === liste.length - 1, onclick: function () { UI.dene(function () { JP.urunGorselTasi(u.kod, i, 1); }); } }),
          h('button.sil', { text: 'Sil', onclick: function () { UI.onay('Görseli sil', 'Bu görsel üründen kaldırılacak.', function () { JP.urunGorselSil(u.kod, i); }, true); } })
        ]) : h('div.arac', {}, h('button', { text: 'Katalog görseli', disabled: true, title: 'Jalpersan kataloğundan gelir' }))
      ]);
    });

    if (!kartlar.length) kartlar.push(h('div.gorsel-bos', { text: 'Bu ürün için görsel yok' }));

    return UI.panel('Görseller', h('div.row.tight', {}, [
      h('span.small.muted', { text: portalVar ? (u.gorseller.length + ' portal görseli') : 'Katalog görseli kullanılıyor' }),
      h('button.btn.primary.sm', { text: 'Görsel yükle', onclick: function () { dosya.click(); } }),
      h('button.btn.sm', { text: 'Adres ile ekle', onclick: adresKip })
    ]), h('div.stack', {}, [
      dosya,
      h('div.gorsel-serit', {}, kartlar),
      h('div.small.muted', { text: portalVar
        ? 'İlk sıradaki görsel bayi kataloğunda ve listelerde gösterilir. Yüklenen dosyalar tarayıcıda 640 piksele küçültülür.'
        : 'Henüz portal görseli eklenmedi; Jalpersan kataloğundan gelen seri görseli kullanılıyor. Yüklediğiniz görsel bunun yerine geçer.' })
    ]));
  }

})();
