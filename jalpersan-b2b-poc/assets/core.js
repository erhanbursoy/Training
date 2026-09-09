/* Jalpersan B2B PoC — çekirdek veri modeli ve iş kuralları
 *
 * Tasarım ilkeleri (teknik doküman v0.6, bölüm 3.6–3.7):
 *  - Ana veri sahibi Logo'dur. Ürün ve bayi kartları db.logo altında durur;
 *    portal kopyası ancak "Logo'dan al" tetiklendiğinde oluşur.
 *  - Havuz bakiyesi HİÇBİR YERDE saklanmaz. Yalnızca db.havuz hareketlerinden
 *    türetilir. Kayıt güncellenmez; düzeltme ters hareketle yapılır.
 *  - Fatura yazılırken rezerv aynı işlemde kapatılır (dFatura + / dRezerv -),
 *    aksi halde sipariş faturalanınca miktar iki kez düşer.
 *  - Logo kaynaklı her hareketin benzersiz bir ref'i vardır; sorgu kaç kez
 *    tetiklenirse tetiklensin aynı hareket ikinci kez yazılmaz.
 */
(function () {
  'use strict';
  var JP = (window.JP = window.JP || {});

  JP.KEY = 'jalpersan.poc.v5';
  JP.SURUM = 'PoC 1.0 · doküman v0.6';

  /* ---------------------------------------------------------------- yardımcı */
  var _ts = null;                              // seed sırasında tarih geriye alınır
  function now() { return _ts || new Date().toISOString(); }
  function uid(p) { return (p || 'x') + Math.random().toString(36).slice(2, 9); }
  function gunFark(iso) { return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); }
  function gecmis(gun) {
    var d = new Date(); d.setDate(d.getDate() - gun); d.setHours(9, 30, 0, 0);
    return d.toISOString();
  }
  function pad(n, w) { return String(n).padStart(w, '0'); }
  function yil() { return new Date().getFullYear(); }
  function r2(n) { return Math.round(n * 100) / 100; }

  JP.gunFark = gunFark;
  JP.fmt = {
    miktar: function (n) { return (Math.round(n * 100) / 100).toLocaleString('tr-TR'); },
    tarih: function (iso) {
      if (!iso) return '—';
      var d = new Date(iso);
      return pad(d.getDate(), 2) + '.' + pad(d.getMonth() + 1, 2) + '.' + d.getFullYear();
    },
    saat: function (iso) {
      if (!iso) return '—';
      var d = new Date(iso);
      return JP.fmt.tarih(iso) + ' ' + pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2);
    }
  };

  /* ------------------------------------------------------------------ depo */
  var mem = null, dinleyiciler = [], kanal = null;
  JP.depoEngeli = false;

  try { kanal = new BroadcastChannel('jalpersan-poc'); } catch (e) { kanal = null; }

  function oku() {
    try {
      var ham = localStorage.getItem(JP.KEY);
      if (ham) return JSON.parse(ham);
    } catch (e) { JP.depoEngeli = true; }
    return null;
  }
  function yaz(db) {
    mem = db;
    try { localStorage.setItem(JP.KEY, JSON.stringify(db)); }
    catch (e) { JP.depoEngeli = true; }
  }

  Object.defineProperty(JP, 'db', {
    get: function () {
      if (!mem) { mem = oku(); if (!mem) { mem = tohum(); yaz(mem); } }
      return mem;
    }
  });

  /** Tek yazma noktası: değişikliği kaydeder, diğer sekmeleri uyandırır. */
  JP.tx = function (fn) {
    var db = JP.db;
    var sonuc = fn(db);
    db.meta.rev = (db.meta.rev || 0) + 1;
    db.meta.sonYazma = now();
    yaz(db);
    if (kanal) { try { kanal.postMessage({ rev: db.meta.rev }); } catch (e) {} }
    yayinla();
    return sonuc;
  };

  function yayinla() { dinleyiciler.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
  JP.abone = function (fn) { dinleyiciler.push(fn); };
  JP.aboneSifirla = function () { dinleyiciler.length = 0; };   // rol değişiminde ölü kabuk yeniden çizilmesin

  function disaridanDegisti() { mem = oku() || mem; yayinla(); }
  if (kanal) kanal.onmessage = disaridanDegisti;
  window.addEventListener('storage', function (e) { if (e.key === JP.KEY) disaridanDegisti(); });

  JP.sifirla = function (bos) {
    mem = tohum(bos);
    JP.tx(function () {});
  };

  /* --------------------------------------------------------- ana veri (Logo) */
  function logoStok() {
    var s = [
      ['ZEB-1200-KREM', 'Zebra Perde Kumaşı 1200 · Krem', 'Zebra', 'MTR', '#D8C9AC', 'zebra', '200 cm en · çift kat gündüz/gece'],
      ['ZEB-1200-ANTR', 'Zebra Perde Kumaşı 1200 · Antrasit', 'Zebra', 'MTR', '#5A6068', 'zebra', '200 cm en · çift kat gündüz/gece'],
      ['ZEB-2400-BEJ', 'Zebra Perde Kumaşı 2400 · Bej', 'Zebra', 'MTR', '#C9B394', 'zebra', '280 cm en · çift kat gündüz/gece'],
      ['STR-3000-BEYAZ', 'Stor Perde Kumaşı 3000 · Beyaz', 'Stor', 'MTR', '#EDE9E1', 'stor', '280 cm en · leke tutmaz apre'],
      ['STR-3000-GRI', 'Stor Perde Kumaşı 3000 · Gri', 'Stor', 'MTR', '#9AA0A3', 'stor', '280 cm en · leke tutmaz apre'],
      ['TUL-0500-EKRU', 'Tül Stor 0500 · Ekru', 'Tül Stor', 'MTR', '#E7E2D6', 'tul', '300 cm en · şeffaf dokuma'],
      ['SSC-0310-GUMUS', 'Sun Screen %3 Açıklık · Gümüş', 'Sun Screen', 'MTR', '#A9AEB2', 'screen', '%3 açıklık · 280 cm en · PVC/cam elyaf'],
      ['SSC-0510-BEYAZ', 'Sun Screen %5 Açıklık · Beyaz', 'Sun Screen', 'MTR', '#DDD9D2', 'screen', '%5 açıklık · 280 cm en · PVC/cam elyaf'],
      ['PLS-0900-VIZON', 'Plise Perde Kumaşı 0900 · Vizon', 'Plise', 'MTR', '#B9A791', 'plise', '45 mm katlama · cam üstü montaj'],
      ['SNK-1800-SIYAH', 'Sineklik Tülü 1800 · Siyah', 'Sineklik', 'MTR', '#3C4145', 'sineklik', '180 cm en · 18×16 göz fiberglas'],
      ['PLS-KASET-VIZON', 'Plise Kaset Profili · Vizon', 'Plise', 'ADET', '#B0A08B', 'diger', '45 mm kaset · 3 m boy'],
      ['ZEB-1200-KARTELA', 'Zebra Kartela Seti (12 renk)', 'Zebra', 'ADET', '#C2A87C', 'diger', '12 renk · sunum kutusu']
    ];
    return s.map(function (x, i) {
      return {
        kod: x[0], ad: x[1], grup: x[2], birim: x[3], renk: x[4], doku: x[5], ozellik: x[6],
        aktif: x[0] !== 'SNK-1800-SIYAH',      // Logo'da bir kart pasif — senkron davranışı gösterilsin
        sira: i
      };
    });
  }

  function logoCari() {
    return [
      { kod: 'BYI-0001', unvan: 'Anadolu Perde Dekorasyon Ltd. Şti.', sehir: 'Ankara', ulke: 'TR', aktif: true, eposta: 'siparis@anadoluperde.example' },
      { kod: 'BYI-0002', unvan: 'Ege Stor Sistemleri A.Ş.', sehir: 'İzmir', ulke: 'TR', aktif: true, eposta: 'satinalma@egestor.example' },
      { kod: 'BYI-0003', unvan: 'Marmara Tekstil Dış Tic. Ltd.', sehir: 'İstanbul', ulke: 'TR', aktif: true, eposta: 'info@marmaratekstil.example' },
      { kod: 'BYI-0004', unvan: 'Balkan Home Textile DOO', sehir: 'Belgrad', ulke: 'RS', aktif: true, eposta: 'orders@balkanhome.example' },
      { kod: 'BYI-0005', unvan: 'Lefkoşa Perde Ltd.', sehir: 'Lefkoşa', ulke: 'KKTC', aktif: false, eposta: 'lefkosa@perde.example' }
    ];
  }

  function bosDb() {
    return {
      meta: { rev: 0, kuruldu: now(), sonYazma: now() },
      sayac: { talep: 0, siparis: 0, logoFis: 0, fatura: 0 },
      urunler: [], bayiler: [], talepler: [], siparisler: [], sepet: {},
      havuz: [], talepDisi: [], log: [], bildirim: [],
      senkron: { urun: null, cari: null, siparis: null, fatura: null },
      logo: { stok: logoStok(), cari: logoCari(), fisler: [], faturalar: [] }
    };
  }

  /* ------------------------------------------------------- havuz hareketleri */
  /** Tek hareket ekleme noktası. Logo kaynaklı hareketler ref ile tekilleştirilir. */
  function hareket(db, h) {
    if (h.ref && db.havuz.some(function (x) { return x.ref === h.ref; })) return null;   // idempotency
    var kayit = {
      id: uid('h'), ts: h.ts || now(),
      bayiKod: h.bayiKod, urunKod: h.urunKod,
      tip: h.tip,                       // dTalep | dRezerv | dFatura
      miktar: r2(h.miktar),
      kaynak: h.kaynak || 'portal',     // portal | logo | elle
      ref: h.ref || null,
      talepNo: h.talepNo || null, talepKalemId: h.talepKalemId || null,
      rezervKapanis: !!h.rezervKapanis,   // fatura ile birlikte çözülen rezerv
      siparisNo: h.siparisNo || null, belge: h.belge || null,
      eslesme: h.eslesme || null,       // baglantili | fifo | elle
      sebep: h.sebep || null,
      kullanici: h.kullanici || 'sistem',
      aciklama: h.aciklama || ''
    };
    db.havuz.push(kayit);
    return kayit;
  }

  function topla(hareketler, tip) {
    return r2(hareketler.reduce(function (t, h) { return h.tip === tip ? t + h.miktar : t; }, 0));
  }

  /** Bir hareket kümesinin dört bakiyesi. Açık = talep − siparişte − faturalanan. */
  function bakiye(hareketler) {
    var talep = topla(hareketler, 'dTalep');
    var rezerv = topla(hareketler, 'dRezerv');
    var fatura = topla(hareketler, 'dFatura');
    return { talep: talep, rezerv: rezerv, fatura: fatura, acik: r2(talep - rezerv - fatura) };
  }
  JP.bakiye = bakiye;

  JP.havuzBakiye = function (bayiKod, urunKod) {
    return bakiye(JP.db.havuz.filter(function (h) {
      return (!bayiKod || h.bayiKod === bayiKod) && (!urunKod || h.urunKod === urunKod);
    }));
  };

  JP.kalemBakiye = function (talepKalemId) {
    return bakiye(JP.db.havuz.filter(function (h) { return h.talepKalemId === talepKalemId; }));
  };

  /** Havuzu bayi × ürün kırılımında döker. */
  JP.havuzOzet = function (filtre) {
    filtre = filtre || {};
    var grup = {};
    JP.db.havuz.forEach(function (h) {
      if (filtre.bayiKod && h.bayiKod !== filtre.bayiKod) return;
      var k = h.bayiKod + '|' + h.urunKod;
      (grup[k] = grup[k] || { bayiKod: h.bayiKod, urunKod: h.urunKod, hareketler: [] }).hareketler.push(h);
    });
    return Object.keys(grup).map(function (k) {
      var g = grup[k], b = bakiye(g.hareketler);
      var enEski = g.hareketler.filter(function (h) { return h.tip === 'dTalep' && h.miktar > 0; })
        .map(function (h) { return h.ts; }).sort()[0];
      return {
        bayiKod: g.bayiKod, urunKod: g.urunKod,
        talep: b.talep, rezerv: b.rezerv, fatura: b.fatura, acik: b.acik,
        yas: enEski ? gunFark(enEski) : 0, hareketSayisi: g.hareketler.length
      };
    }).filter(function (r) { return filtre.sadeceAcik ? r.acik > 0.001 : true; })
      .sort(function (a, b) { return b.acik - a.acik || a.bayiKod.localeCompare(b.bayiKod); });
  };

  /* ------------------------------------------------------------- kayıt/günlük */
  function log(db, yon, islem, ozet, hata) {
    db.log.unshift({ id: uid('l'), ts: now(), yon: yon, islem: islem, ozet: ozet, hata: !!hata });
    if (db.log.length > 400) db.log.length = 400;
  }
  function bildir(db, kime, baslik, metin) {
    db.bildirim.unshift({ id: uid('n'), ts: now(), kime: kime, baslik: baslik, metin: metin, okundu: false });
    if (db.bildirim.length > 120) db.bildirim.length = 120;
  }
  JP.log = log;

  /* --------------------------------------------- Logo → portal ana veri çekme */
  JP.logoUrunleriCek = function () {
    return JP.tx(function (db) {
      var yeni = 0, guncel = 0, pasif = 0;
      db.logo.stok.forEach(function (s) {
        var p = db.urunler.find(function (u) { return u.kod === s.kod; });
        if (!p) {
          db.urunler.push({
            kod: s.kod, ad: s.ad, grup: s.grup, birim: s.birim, renk: s.renk, doku: s.doku,
            logoAktif: s.aktif, logodaYok: false,
            siparieAcik: s.aktif, ozellik: s.ozellik || '', aciklama: aciklamaOf(s.grup),
            gosterimBirimi: s.birim === 'MTR' ? 'metre' : 'adet', sira: s.sira
          });
          yeni++;
        } else {
          if (p.ad !== s.ad || p.logoAktif !== s.aktif || p.grup !== s.grup) guncel++;
          p.ad = s.ad; p.grup = s.grup; p.birim = s.birim; p.renk = s.renk; p.doku = s.doku;
          p.logoAktif = s.aktif; p.logodaYok = false;                 // portal ek alanları korunur
        }
      });
      db.urunler.forEach(function (u) {
        if (!db.logo.stok.some(function (s) { return s.kod === u.kod; })) { u.logodaYok = true; pasif++; }
      });
      db.senkron.urun = { ts: now(), yeni: yeni, guncel: guncel, pasif: pasif, toplam: db.logo.stok.length };
      log(db, 'logo', 'Stok kartı okuma', 'LG_025_ITEMS · ' + db.logo.stok.length + ' kart okundu, ' + yeni + ' yeni, ' + guncel + ' güncellendi');
      return db.senkron.urun;
    });
  };

  JP.logoBayileriCek = function () {
    return JP.tx(function (db) {
      var yeni = 0, guncel = 0, pasif = 0;
      db.logo.cari.forEach(function (c) {
        var b = db.bayiler.find(function (x) { return x.kod === c.kod; });
        if (!b) {
          db.bayiler.push({
            kod: c.kod, unvan: c.unvan, sehir: c.sehir, ulke: c.ulke, eposta: c.eposta,
            logoAktif: c.aktif, logodaYok: false,
            siparisAcik: c.aktif, kisit: { tip: 'tumu', gruplar: [], urunler: [] }, teslimatNotu: ''
          });
          yeni++;
        } else {
          if (b.unvan !== c.unvan || b.logoAktif !== c.aktif) guncel++;
          b.unvan = c.unvan; b.sehir = c.sehir; b.ulke = c.ulke; b.logoAktif = c.aktif; b.logodaYok = false;
        }
      });
      db.bayiler.forEach(function (b) {
        if (!db.logo.cari.some(function (c) { return c.kod === b.kod; })) { b.logodaYok = true; pasif++; }
      });
      db.senkron.cari = { ts: now(), yeni: yeni, guncel: guncel, pasif: pasif, toplam: db.logo.cari.length };
      log(db, 'logo', 'Cari kartı okuma', 'LG_025_CLCARD · ' + db.logo.cari.length + ' kart okundu, ' + yeni + ' yeni, ' + guncel + ' güncellendi');
      return db.senkron.cari;
    });
  };

  /* -------------------------------------------------------- bayi görünürlüğü */
  JP.bayiUrunleri = function (bayiKod) {
    var db = JP.db, b = db.bayiler.find(function (x) { return x.kod === bayiKod; });
    if (!b) return [];
    return db.urunler.filter(function (u) {
      if (!u.siparieAcik || !u.logoAktif || u.logodaYok) return false;
      if (b.kisit.tip === 'gruplar') return b.kisit.gruplar.indexOf(u.grup) >= 0;
      if (b.kisit.tip === 'urunler') return b.kisit.urunler.indexOf(u.kod) >= 0;
      return true;
    }).sort(function (a, b2) { return a.grup.localeCompare(b2.grup) || a.sira - b2.sira; });
  };

  /* ------------------------------------------------------------------ sepet */
  /* Bayi sepeti taslak bir listedir; havuza dokunmaz. Talep ancak sepet
     onaylandığında oluşur ve o anda dTalep hareketleri yazılır. */
  function sepetKutusu(db, bayiKod) {
    db.sepet = db.sepet || {};
    db.sepet[bayiKod] = db.sepet[bayiKod] || [];
    return db.sepet[bayiKod];
  }

  JP.sepetOku = function (bayiKod) {
    var db = JP.db;
    return ((db.sepet || {})[bayiKod] || []).map(function (s) {
      var u = db.urunler.find(function (x) { return x.kod === s.urunKod; });
      return { urunKod: s.urunKod, miktar: s.miktar, urun: u || null, gecersiz: !u || !u.siparieAcik || !u.logoAktif };
    });
  };

  JP.sepetSayisi = function (bayiKod) { return ((JP.db.sepet || {})[bayiKod] || []).length; };

  /** Aynı ürün ikinci kez eklenirse miktar üstüne eklenir (e-ticaret davranışı). */
  JP.sepetEkle = function (bayiKod, urunKod, miktar) {
    return JP.tx(function (db) {
      miktar = r2(miktar);
      if (!(miktar > 0)) throw new Error('Miktar girin.');
      var bayi = db.bayiler.find(function (b) { return b.kod === bayiKod; });
      if (!bayi) throw new Error('Bayi bulunamadı.');
      if (!bayi.siparisAcik) throw new Error('Bu bayi siparişe kapalı; sepete ürün eklenemez.');
      if (!JP.bayiUrunleri(bayiKod).some(function (u) { return u.kod === urunKod; })) {
        throw new Error('Bu ürün bayinin kataloğunda değil.');
      }
      var kutu = sepetKutusu(db, bayiKod);
      var satir = kutu.find(function (x) { return x.urunKod === urunKod; });
      if (satir) satir.miktar = r2(satir.miktar + miktar); else kutu.push({ urunKod: urunKod, miktar: miktar });
      return satir ? satir.miktar : miktar;
    });
  };

  JP.sepetMiktar = function (bayiKod, urunKod, miktar) {
    return JP.tx(function (db) {
      var kutu = sepetKutusu(db, bayiKod);
      var i = kutu.findIndex(function (x) { return x.urunKod === urunKod; });
      if (i < 0) return;
      miktar = r2(miktar);
      if (miktar > 0) kutu[i].miktar = miktar; else kutu.splice(i, 1);
    });
  };

  JP.sepetCikar = function (bayiKod, urunKod) {
    return JP.tx(function (db) {
      var kutu = sepetKutusu(db, bayiKod);
      var i = kutu.findIndex(function (x) { return x.urunKod === urunKod; });
      if (i >= 0) kutu.splice(i, 1);
    });
  };

  JP.sepetTemizle = function (bayiKod) {
    return JP.tx(function (db) { sepetKutusu(db, bayiKod).length = 0; });
  };

  /** Sepeti onaylar: talebi oluşturur ve sepeti boşaltır. */
  JP.sepetOnayla = function (bayiKod, not, teslimTarihi) {
    var kutu = JP.sepetOku(bayiKod);
    if (!kutu.length) throw new Error('Sepetiniz boş.');
    var gecersiz = kutu.filter(function (s) { return s.gecersiz; });
    if (gecersiz.length) {
      throw new Error(gecersiz.map(function (s) { return s.urunKod; }).join(', ') + ' artık siparişe kapalı. Sepetten çıkarın.');
    }
    var talep = JP.talepOlustur(bayiKod, kutu.map(function (s) { return { urunKod: s.urunKod, miktar: s.miktar }; }), not, teslimTarihi);
    JP.sepetTemizle(bayiKod);
    return talep;
  };

  /** Katalog ağacı: grup → seri (stok kodunun orta bölümü) → renk varyantları.
      Logo kodlama yapısı ZEB-1200-KREM biçiminde olduğu için seri koddan türetilir. */
  JP.urunAgaci = function (bayiKod) {
    var urunler = JP.bayiUrunleri(bayiKod);
    var gruplar = [];
    urunler.forEach(function (u) {
      var g = gruplar.find(function (x) { return x.ad === u.grup; });
      if (!g) { g = { ad: u.grup, adet: 0, seriler: [] }; gruplar.push(g); }
      g.adet++;
      var parca = u.kod.split('-');
      var seriKod = parca.length > 1 ? parca[1] : 'DIGER';
      var seriAd = u.birim === 'ADET' ? 'Kartela ve aksesuar' : seriKod + ' serisi';
      var se = g.seriler.find(function (x) { return x.kod === seriKod && x.ad === seriAd; });
      if (!se) { se = { kod: seriKod, ad: seriAd, adet: 0 }; g.seriler.push(se); }
      se.adet++;
    });
    gruplar.forEach(function (g) { g.seriler.sort(function (a, b) { return a.ad.localeCompare(b.ad, 'tr'); }); });
    return { toplam: urunler.length, gruplar: gruplar };
  };

  /** Ağaç düğümüne göre süzme: {grup, seri} */
  JP.urunSuz = function (bayiKod, dugum, arama) {
    var q = (arama || '').trim().toLocaleLowerCase('tr');
    return JP.bayiUrunleri(bayiKod).filter(function (u) {
      if (dugum && dugum.grup && u.grup !== dugum.grup) return false;
      if (dugum && dugum.seri) {
        var parca = u.kod.split('-');
        if ((parca.length > 1 ? parca[1] : 'DIGER') !== dugum.seri) return false;
      }
      if (!q) return true;
      return (u.ad + ' ' + u.kod + ' ' + (u.ozellik || '')).toLocaleLowerCase('tr').indexOf(q) >= 0;
    });
  };

  /* --------------------------------------------------- 3.4 satın alma talebi */
  JP.talepOlustur = function (bayiKod, satirlar, not, teslimTarihi) {
    return JP.tx(function (db) {
      var bayi = db.bayiler.find(function (b) { return b.kod === bayiKod; });
      if (!bayi) throw new Error('Bayi bulunamadı.');
      if (!bayi.siparisAcik) throw new Error('Bu bayi siparişe kapalı; yeni talep oluşturulamaz.');
      var temiz = satirlar.filter(function (s) { return s.miktar > 0; });
      if (!temiz.length) throw new Error('En az bir ürüne miktar girin.');

      db.sayac.talep++;
      var no = 'ST-' + yil() + '-' + pad(db.sayac.talep, 6);
      var talep = {
        no: no, bayiKod: bayiKod, tarih: now(), not: not || '',
        teslimTarihi: teslimTarihi || null, iptal: false,
        kalemler: temiz.map(function (s) {
          return { id: uid('k'), urunKod: s.urunKod, miktar: r2(s.miktar) };
        })
      };
      db.talepler.unshift(talep);
      talep.kalemler.forEach(function (k) {
        hareket(db, {
          bayiKod: bayiKod, urunKod: k.urunKod, tip: 'dTalep', miktar: k.miktar,
          kaynak: 'portal', talepNo: no, talepKalemId: k.id, belge: no,
          kullanici: bayiKod, aciklama: 'Satın alma talebi açıldı'
        });
      });
      log(db, 'portal', 'Talep oluşturuldu', no + ' · ' + bayi.unvan + ' · ' + talep.kalemler.length + ' kalem');
      bildir(db, 'muhasebe', 'Yeni satın alma talebi', no + ' — ' + bayi.unvan + ' (' + talep.kalemler.length + ' kalem)');
      return talep;
    });
  };

  /** Bayi/muhasebe kalem miktarını düşürür. Siparişe dönen veya faturalanan kısım düşürülemez. */
  JP.talepKalemAzalt = function (talepNo, kalemId, yeniMiktar, kullanici) {
    return JP.tx(function (db) {
      var t = db.talepler.find(function (x) { return x.no === talepNo; });
      var k = t && t.kalemler.find(function (x) { return x.id === kalemId; });
      if (!k) throw new Error('Kalem bulunamadı.');
      var b = bakiye(db.havuz.filter(function (h) { return h.talepKalemId === kalemId; }));
      var taban = r2(b.rezerv + b.fatura);
      yeniMiktar = r2(Math.max(0, yeniMiktar));
      if (yeniMiktar < taban) throw new Error('Bu kalemin ' + JP.fmt.miktar(taban) + ' birimi siparişe dönmüş veya faturalanmış; altına inilemez.');
      var fark = r2(yeniMiktar - b.talep);
      if (!fark) return;
      hareket(db, {
        bayiKod: t.bayiKod, urunKod: k.urunKod, tip: 'dTalep', miktar: fark,
        kaynak: 'portal', talepNo: talepNo, talepKalemId: kalemId, belge: talepNo,
        kullanici: kullanici || t.bayiKod,
        aciklama: fark < 0 ? 'Talep azaltıldı / iptal' : 'Talep artırıldı'
      });
      log(db, 'portal', 'Talep kalemi güncellendi', talepNo + ' · ' + k.urunKod + ' → ' + JP.fmt.miktar(yeniMiktar));
    });
  };

  JP.talepDurumu = function (talep) {
    if (talep.iptal) return 'İptal';
    var db = JP.db, toplam = 0, rezerv = 0, fatura = 0;
    talep.kalemler.forEach(function (k) {
      var b = bakiye(db.havuz.filter(function (h) { return h.talepKalemId === k.id; }));
      toplam += b.talep; rezerv += b.rezerv; fatura += b.fatura;
    });
    if (toplam <= 0.001) return 'İptal';
    if (fatura >= toplam - 0.001) return 'Tamamlandı';
    if (rezerv + fatura >= toplam - 0.001) return 'Karşılandı';
    if (rezerv + fatura > 0.001) return 'Kısmen Karşılandı';
    return 'Açık';
  };

  /** Bir talebin kalem kalem durumu.
   *  talep    → talep edilen  (Σ dTalep)
   *  siparis  → sipariş oluşturulan, kümülatif (rezerv hareketleri; fatura ile
   *             çözülen rezerv hariç, yoksa faturalanınca sıfıra düşerdi)
   *  fatura   → tahsis edilen  (Σ dFatura)
   *  acik     → bekleyen = talep − açık rezerv − tahsis
   */
  JP.talepKalemDurum = function (talep) {
    var db = JP.db;
    return talep.kalemler.map(function (k) {
      var hs = db.havuz.filter(function (h) { return h.talepKalemId === k.id; });
      var b = bakiye(hs);
      var siparis = r2(hs.reduce(function (t, h) {
        return (h.tip === 'dRezerv' && !h.rezervKapanis) ? t + h.miktar : t;
      }, 0));
      var u = db.urunler.find(function (x) { return x.kod === k.urunKod; }) || { ad: k.urunKod, birim: '', doku: 'diger', renk: '#B9AE99' };
      return {
        kalem: k, urun: u,
        talep: b.talep, rezerv: b.rezerv, fatura: b.fatura, acik: b.acik,
        siparis: siparis, donusturulebilir: Math.max(0, b.acik)
      };
    });
  };

  /** Bir talebe bağlı belgeler: siparişler ve faturalar. */
  JP.talepIslemleri = function (talepNo) {
    var db = JP.db;
    var siparisler = db.siparisler.filter(function (s) {
      return s.kalemler.some(function (k) { return k.talepNo === talepNo; });
    }).map(function (s) {
      var kalemler = s.kalemler.filter(function (k) { return k.talepNo === talepNo; });
      return {
        no: s.no, tarih: s.tarih, durum: s.durum, logoFisNo: s.logoFisNo,
        miktar: r2(kalemler.reduce(function (t, k) { return t + k.logoMiktar; }, 0)),
        faturalanan: r2(kalemler.reduce(function (t, k) { return t + k.faturalanan; }, 0)),
        kalemler: kalemler
      };
    });

    var fatura = {};
    db.havuz.forEach(function (h) {
      if (h.talepNo !== talepNo || h.tip !== 'dFatura' || !h.belge) return;
      var f = (fatura[h.belge] = fatura[h.belge] || { no: h.belge, miktar: 0, ts: h.ts, eslesme: h.eslesme, kaynak: h.kaynak });
      f.miktar = r2(f.miktar + h.miktar);
      if (h.ts < f.ts) f.ts = h.ts;
    });
    var faturalar = Object.keys(fatura).map(function (n) {
      var f = fatura[n];
      var lf = db.logo.faturalar.find(function (x) { return x.no === n; });
      f.gib = lf ? lf.gib : '—';
      f.tur = lf ? lf.tur : 'elle tahsis';
      return f;
    }).sort(function (a, b) { return b.ts.localeCompare(a.ts); });

    return { siparisler: siparisler, faturalar: faturalar };
  };

  /* ------------------------------------------- 3.5 talep → sipariş dönüşümü */
  JP.siparisOlustur = function (bayiKod, secim, kullanici) {
    return JP.tx(function (db) {
      var temiz = secim.filter(function (s) { return s.miktar > 0; });
      if (!temiz.length) throw new Error('Siparişe dönüştürmek için en az bir kaleme miktar girin.');

      temiz.forEach(function (s) {
        var b = bakiye(db.havuz.filter(function (h) { return h.talepKalemId === s.kalemId; }));
        if (s.miktar > b.acik + 0.001) {
          throw new Error('Talep kaleminde yalnızca ' + JP.fmt.miktar(b.acik) + ' birim açıkta; ' + JP.fmt.miktar(s.miktar) + ' sipariş edilemez.');
        }
      });

      db.sayac.siparis++;
      var no = 'S-' + yil() + '-' + pad(db.sayac.siparis, 6);
      var siparis = {
        no: no, bayiKod: bayiKod, tarih: now(), durum: 'Taslak',
        logoFisNo: null, logoRef: 'PORTAL-' + no, hataMetni: null,
        kalemler: temiz.map(function (s) {
          var t = db.talepler.find(function (x) { return x.no === s.talepNo; });
          var k = t.kalemler.find(function (x) { return x.id === s.kalemId; });
          return {
            id: uid('sk'), urunKod: k.urunKod, miktar: r2(s.miktar),
            talepNo: s.talepNo, talepKalemId: s.kalemId,
            logoMiktar: r2(s.miktar),     // Logo'da bilinen son miktar
            faturalanan: 0
          };
        })
      };
      db.siparisler.unshift(siparis);
      siparis.kalemler.forEach(function (sk) {
        hareket(db, {
          bayiKod: bayiKod, urunKod: sk.urunKod, tip: 'dRezerv', miktar: sk.miktar,
          kaynak: 'portal', siparisNo: no, talepNo: sk.talepNo, talepKalemId: sk.talepKalemId,
          belge: no, kullanici: kullanici || 'muhasebe', aciklama: 'Sipariş oluşturuldu (rezerve)'
        });
      });
      var bayi = db.bayiler.find(function (b) { return b.kod === bayiKod; });
      log(db, 'portal', 'Sipariş oluşturuldu', no + ' · ' + (bayi ? bayi.unvan : bayiKod) + ' · ' + siparis.kalemler.length + ' kalem');
      return siparis;
    });
  };

  JP.siparisLogoyaGonder = function (siparisNo, hataSimule) {
    return JP.tx(function (db) {
      var s = db.siparisler.find(function (x) { return x.no === siparisNo; });
      if (!s) throw new Error('Sipariş bulunamadı.');
      if (s.durum !== 'Taslak' && s.durum !== 'Gönderim Hatası') throw new Error('Bu sipariş zaten Logo\'ya iletilmiş.');

      if (hataSimule) {
        s.durum = 'Gönderim Hatası';
        s.hataMetni = 'Logo REST servisine ulaşılamadı (HTTP 503). Sipariş portalda korunuyor, yeniden gönderilebilir.';
        log(db, 'logo', 'Sipariş gönderimi', siparisNo + ' · gönderim başarısız (HTTP 503)', true);
        return s;
      }

      // Idempotency: aynı portal referansı için ikinci fiş açılmaz.
      var mevcut = db.logo.fisler.find(function (f) { return f.portalRef === s.logoRef; });
      if (!mevcut) {
        db.sayac.logoFis++;
        mevcut = {
          fisNo: 'SIP-' + yil() + '-' + pad(db.sayac.logoFis, 6),
          portalRef: s.logoRef, portalSiparisNo: s.no, cariKod: s.bayiKod,
          tarih: now(), durum: 'Açık', iptal: false,
          satirlar: s.kalemler.map(function (k, i) {
            return { id: 'r' + (i + 1), portalKalemId: k.id, stokKod: k.urunKod, miktar: k.miktar, surum: 1 };
          })
        };
        db.logo.fisler.unshift(mevcut);
      }
      s.logoFisNo = mevcut.fisNo;
      s.durum = "Logo'ya İletildi";
      s.hataMetni = null;
      log(db, 'logo', 'Sipariş gönderimi', siparisNo + ' → Logo fiş ' + mevcut.fisNo + ' (ref ' + s.logoRef + ')');
      return s;
    });
  };

  JP.siparisIptal = function (siparisNo, kullanici) {
    return JP.tx(function (db) {
      var s = db.siparisler.find(function (x) { return x.no === siparisNo; });
      if (!s) throw new Error('Sipariş bulunamadı.');
      if (s.durum === 'Tamamlandı' || s.durum === 'İptal') throw new Error('Bu sipariş iptal edilemez.');
      s.kalemler.forEach(function (k) {
        var acikRezerv = r2(k.logoMiktar - k.faturalanan);
        if (acikRezerv > 0.001) {
          hareket(db, {
            bayiKod: s.bayiKod, urunKod: k.urunKod, tip: 'dRezerv', miktar: -acikRezerv,
            kaynak: 'portal', siparisNo: s.no, talepNo: k.talepNo, talepKalemId: k.talepKalemId,
            belge: s.no, kullanici: kullanici || 'muhasebe', aciklama: 'Sipariş iptali (rezerv çözüldü)'
          });
        }
      });
      s.durum = 'İptal';
      log(db, 'portal', 'Sipariş iptali', s.no + ' iptal edildi. Logo fişi ' + (s.logoFisNo || '—') + ' elle iptal edilmelidir.');
      return s;
    });
  };

  /* ------------------------------- 3.1 + 3.7 Logo durum sorgusu ve fatura eşleme */
  /**
   * Logo'dan sipariş ve fatura durumunu okur:
   *  1) fiş miktar değişimi → dRezerv düzeltmesi
   *  2) fişe bağlı fatura satırı → kademe 1 (bağlantılı): dFatura + / dRezerv −
   *  3) fişsiz (serbest) fatura → kademe 2 (FIFO) veya kademe 3 (eşleşmeyen)
   *  4) tüm kalemler faturalandı + GİB başarılı → sipariş 'Tamamlandı'
   */
  JP.durumSorgula = function (siparisNo) {
    return JP.tx(function (db) {
      var sonuc = { okunanFis: 0, miktarDegisimi: 0, faturaHareketi: 0, fifo: 0, eslesmeyen: 0, kapanan: 0, atlanan: 0 };
      var hedef = db.siparisler.filter(function (s) {
        if (siparisNo) return s.no === siparisNo;
        return s.durum === "Logo'ya İletildi" || s.durum === 'Faturalandı';   // tamamlananlar tekrar sorgulanmaz
      });

      hedef.forEach(function (s) {
        var fis = db.logo.fisler.find(function (f) { return f.portalRef === s.logoRef; });
        if (!fis) return;
        sonuc.okunanFis++;

        if (fis.iptal && s.durum !== 'İptal') {
          s.kalemler.forEach(function (k) {
            var acik = r2(k.logoMiktar - k.faturalanan);
            if (acik > 0.001) {
              hareket(db, {
                bayiKod: s.bayiKod, urunKod: k.urunKod, tip: 'dRezerv', miktar: -acik,
                kaynak: 'logo', ref: 'logo:fis:' + fis.fisNo + ':iptal', siparisNo: s.no,
                talepNo: k.talepNo, talepKalemId: k.talepKalemId, belge: fis.fisNo,
                kullanici: 'logo', aciklama: "Logo'da sipariş fişi iptal edildi"
              });
            }
          });
          s.durum = 'İptal';
          log(db, 'logo', 'Sipariş durumu', s.no + ' · Logo fişi iptal edilmiş, portal siparişi iptale çekildi', true);
          return;
        }

        // 1) miktar değişimi
        fis.satirlar.forEach(function (r) {
          var k = s.kalemler.find(function (x) { return x.id === r.portalKalemId; });
          if (!k) return;
          if (r2(r.miktar) === r2(k.logoMiktar)) return;
          var fark = r2(r.miktar - k.logoMiktar);
          var yazildi = hareket(db, {
            bayiKod: s.bayiKod, urunKod: k.urunKod, tip: 'dRezerv', miktar: fark,
            kaynak: 'logo', ref: 'logo:fis:' + fis.fisNo + ':' + r.id + ':v' + r.surum,
            siparisNo: s.no, talepNo: k.talepNo, talepKalemId: k.talepKalemId, belge: fis.fisNo,
            kullanici: 'logo',
            aciklama: "Logo'da miktar " + JP.fmt.miktar(k.logoMiktar) + ' → ' + JP.fmt.miktar(r.miktar)
          });
          if (yazildi) {
            sonuc.miktarDegisimi++;
            log(db, 'logo', 'Miktar değişimi', fis.fisNo + ' · ' + k.urunKod + ' ' + JP.fmt.miktar(k.logoMiktar) + ' → ' + JP.fmt.miktar(r.miktar));
          } else { sonuc.atlanan++; }
          k.logoMiktar = r2(r.miktar);
        });

        // 2) fişe bağlı faturalar — kademe 1
        db.logo.faturalar.filter(function (f) { return f.fisNo === fis.fisNo; }).forEach(function (f) {
          f.satirlar.forEach(function (fr, i) {
            var ref = 'logo:fatura:' + f.no + ':' + i;
            var fisSatir = fis.satirlar.find(function (r) { return r.id === fr.fisSatirId; });
            var k = fisSatir && s.kalemler.find(function (x) { return x.id === fisSatir.portalKalemId; });
            if (!k) return;
            if (db.havuz.some(function (h) { return h.ref === ref; })) { sonuc.atlanan++; return; }
            hareket(db, {
              bayiKod: s.bayiKod, urunKod: k.urunKod, tip: 'dFatura', miktar: fr.miktar,
              kaynak: 'logo', ref: ref, siparisNo: s.no, talepNo: k.talepNo, talepKalemId: k.talepKalemId,
              belge: f.no, eslesme: 'baglantili', kullanici: 'logo',
              aciklama: 'Fatura kesildi (' + f.tur + ')'
            });
            // rezerv aynı işlemde kapatılır
            hareket(db, {
              bayiKod: s.bayiKod, urunKod: k.urunKod, tip: 'dRezerv', miktar: -fr.miktar,
              kaynak: 'logo', ref: ref + ':rez', siparisNo: s.no, talepNo: k.talepNo, talepKalemId: k.talepKalemId,
              belge: f.no, kullanici: 'logo', rezervKapanis: true,
              aciklama: 'Faturalanan miktarın rezervi çözüldü'
            });
            k.faturalanan = r2(k.faturalanan + fr.miktar);
            sonuc.faturaHareketi++;
          });
        });

        // 4) durum
        var tumFaturalandi = s.kalemler.every(function (k) { return k.faturalanan >= k.logoMiktar - 0.001; });
        var faturalar = db.logo.faturalar.filter(function (f) { return f.fisNo === fis.fisNo; });
        var gibTamam = faturalar.length > 0 && faturalar.every(function (f) { return f.gib === 'Başarılı'; });
        if (tumFaturalandi && gibTamam) {
          if (s.durum !== 'Tamamlandı') {
            s.durum = 'Tamamlandı'; sonuc.kapanan++;
            bildir(db, s.bayiKod, 'Siparişiniz tamamlandı', s.no + ' faturalandı ve GİB gönderimi başarılı.');
            log(db, 'logo', 'Sipariş kapanışı', s.no + ' · tüm kalemler faturalandı, GİB gönderimi başarılı → Tamamlandı');
          }
        } else if (faturalar.length) {
          s.durum = 'Faturalandı';
        }
      });

      // 3) fişsiz faturalar — kademe 2 (FIFO) / kademe 3 (eşleşmeyen)
      if (!siparisNo) {
        db.logo.faturalar.filter(function (f) { return !f.fisNo; }).forEach(function (f) {
          f.satirlar.forEach(function (fr, i) {
            var ref = 'logo:fatura:' + f.no + ':' + i;
            if (db.havuz.some(function (h) { return h.ref === ref; })) { sonuc.atlanan++; return; }
            if (db.talepDisi.some(function (t) { return t.ref === ref; })) { sonuc.atlanan++; return; }
            var kalan = fr.miktar;
            var adaylar = acikKalemler(db, f.cariKod, fr.stokKod);
            adaylar.forEach(function (a, j) {
              if (kalan <= 0.001) return;
              var pay = Math.min(kalan, a.acik);
              hareket(db, {
                bayiKod: f.cariKod, urunKod: fr.stokKod, tip: 'dFatura', miktar: pay,
                kaynak: 'logo', ref: ref + (j ? ':p' + j : ''), talepNo: a.talepNo, talepKalemId: a.kalemId,
                belge: f.no, eslesme: 'fifo', kullanici: 'logo',
                aciklama: 'Sipariş bağlantısı yok — en eski açık talebe (FIFO) tahsis edildi'
              });
              kalan = r2(kalan - pay); sonuc.fifo++;
            });
            if (kalan > 0.001) {
              db.talepDisi.push({
                id: uid('td'), ref: ref, ts: now(), faturaNo: f.no, bayiKod: f.cariKod,
                urunKod: fr.stokKod, miktar: kalan, cozuldu: false
              });
              sonuc.eslesmeyen++;
              log(db, 'logo', 'Eşleşmeyen fatura', f.no + ' · ' + fr.stokKod + ' ' + JP.fmt.miktar(kalan) + ' birim talebi aşıyor → Talep Dışı Fatura listesi', true);
            }
          });
        });
      }

      var alan = siparisNo ? 'siparis' : 'fatura';
      db.senkron[alan] = { ts: now(), okunanFis: sonuc.okunanFis, hareket: sonuc.faturaHareketi + sonuc.fifo, atlanan: sonuc.atlanan };
      db.senkron.siparis = db.senkron[alan];
      log(db, 'logo', 'Durum sorgusu', (siparisNo || 'Tüm açık siparişler') + ' · ' + sonuc.okunanFis + ' fiş okundu, ' +
        (sonuc.miktarDegisimi + sonuc.faturaHareketi + sonuc.fifo) + ' hareket yazıldı, ' + sonuc.atlanan + ' mükerrer atlandı');
      return sonuc;
    });
  };

  /** FIFO adayları: bayi + ürün için en eski açık talep kalemleri. */
  function acikKalemler(db, bayiKod, urunKod) {
    var out = [];
    db.talepler.slice().sort(function (a, b) { return a.tarih.localeCompare(b.tarih); }).forEach(function (t) {
      if (t.bayiKod !== bayiKod || t.iptal) return;
      t.kalemler.forEach(function (k) {
        if (k.urunKod !== urunKod) return;
        var b = bakiye(db.havuz.filter(function (h) { return h.talepKalemId === k.id; }));
        var acik = r2(b.talep - b.fatura);          // FIFO fatura tahsisi rezervi tüketmez
        if (acik > 0.001) out.push({ talepNo: t.no, kalemId: k.id, acik: acik, tarih: t.tarih });
      });
    });
    return out;
  }

  /* --------------------------------------------- elle hareket / elle tahsis */
  JP.SEBEPLER = [
    { kod: 'NUMUNE', ad: 'Numune / kartela gönderimi' },
    { kod: 'KONSINYE', ad: 'Konsinye çıkış' },
    { kod: 'GECMIS', ad: 'Geçmiş dönem faturası' },
    { kod: 'DUZELTME', ad: 'Kayıt düzeltmesi' },
    { kod: 'MUTABAKAT', ad: 'Bayi mutabakatı' }
  ];

  JP.elleHareket = function (p) {
    return JP.tx(function (db) {
      if (!p.sebep) throw new Error('Sebep kodu zorunludur.');
      if (!p.miktar) throw new Error('Miktar girin.');
      var h = hareket(db, {
        bayiKod: p.bayiKod, urunKod: p.urunKod, tip: p.tip, miktar: r2(p.miktar),
        kaynak: 'elle', talepKalemId: p.talepKalemId || null, talepNo: p.talepNo || null,
        sebep: p.sebep, eslesme: p.tip === 'dFatura' ? 'elle' : null,
        kullanici: p.kullanici || 'muhasebe', aciklama: p.aciklama || 'Elle hareket'
      });
      log(db, 'portal', 'Elle hareket', p.bayiKod + ' · ' + p.urunKod + ' · ' + p.tip + ' ' + JP.fmt.miktar(p.miktar) + ' (' + p.sebep + ')');
      return h;
    });
  };

  /** Talep dışı faturayı elle bir talep kalemine bağlar. */
  JP.talepDisiBagla = function (kayitId, kalemId, kullanici) {
    return JP.tx(function (db) {
      var td = db.talepDisi.find(function (x) { return x.id === kayitId; });
      if (!td || td.cozuldu) throw new Error('Kayıt bulunamadı.');
      var talep = db.talepler.find(function (t) { return t.kalemler.some(function (k) { return k.id === kalemId; }); });
      hareket(db, {
        bayiKod: td.bayiKod, urunKod: td.urunKod, tip: 'dFatura', miktar: td.miktar,
        kaynak: 'elle', ref: td.ref + ':elle', talepNo: talep ? talep.no : null, talepKalemId: kalemId,
        belge: td.faturaNo, eslesme: 'elle', sebep: 'DUZELTME', kullanici: kullanici || 'muhasebe',
        aciklama: 'Talep dışı fatura elle bağlandı'
      });
      td.cozuldu = true; td.cozumTs = now();
      log(db, 'portal', 'Talep dışı fatura', td.faturaNo + ' · ' + td.urunKod + ' elle talebe bağlandı');
    });
  };

  /* ============================ LOGO SİMÜLATÖRÜ ============================ */
  JP.logo = {
    fisMiktarDegistir: function (fisNo, satirId, yeni) {
      return JP.tx(function (db) {
        var f = db.logo.fisler.find(function (x) { return x.fisNo === fisNo; });
        var r = f && f.satirlar.find(function (x) { return x.id === satirId; });
        if (!r) throw new Error('Fiş satırı bulunamadı.');
        yeni = r2(Math.max(0, yeni));
        if (yeni === r.miktar) return;
        var faturalanmis = faturalananMiktar(db, fisNo, satirId);
        if (yeni < faturalanmis) throw new Error('Bu satırın ' + JP.fmt.miktar(faturalanmis) + ' birimi faturalanmış; altına inilemez.');
        r.miktar = yeni; r.surum++;
        log(db, 'logo', 'Logo · fiş güncellendi', fisNo + ' / ' + satirId + ' miktar → ' + JP.fmt.miktar(yeni));
      });
    },

    fisIptal: function (fisNo) {
      return JP.tx(function (db) {
        var f = db.logo.fisler.find(function (x) { return x.fisNo === fisNo; });
        if (!f) throw new Error('Fiş bulunamadı.');
        if (db.logo.faturalar.some(function (x) { return x.fisNo === fisNo; })) throw new Error('Faturası kesilmiş fiş iptal edilemez.');
        f.iptal = true; f.durum = 'İptal';
        log(db, 'logo', 'Logo · fiş iptali', fisNo + ' iptal edildi');
      });
    },

    faturaKes: function (fisNo, satirlar, tur) {
      return JP.tx(function (db) {
        var f = db.logo.fisler.find(function (x) { return x.fisNo === fisNo; });
        if (!f) throw new Error('Fiş bulunamadı.');
        var temiz = satirlar.filter(function (s) { return s.miktar > 0; });
        if (!temiz.length) throw new Error('Faturalanacak miktar girin.');
        temiz.forEach(function (s) {
          var r = f.satirlar.find(function (x) { return x.id === s.fisSatirId; });
          var kalan = r2(r.miktar - faturalananMiktar(db, fisNo, s.fisSatirId));
          if (s.miktar > kalan + 0.001) throw new Error(r.stokKod + ' için faturalanabilir kalan ' + JP.fmt.miktar(kalan) + ' birim.');
        });
        var fatura = yeniFatura(db, f.cariKod, tur || 'e-Fatura', fisNo);
        fatura.satirlar = temiz.map(function (s) {
          var r = f.satirlar.find(function (x) { return x.id === s.fisSatirId; });
          return { fisSatirId: s.fisSatirId, stokKod: r.stokKod, miktar: r2(s.miktar) };
        });
        db.logo.faturalar.unshift(fatura);
        log(db, 'logo', 'Logo · fatura kesildi', fatura.no + ' (' + fatura.tur + ') · fiş ' + fisNo + ' · ' + fatura.satirlar.length + ' satır');
        return fatura;
      });
    },

    serbestFaturaKes: function (cariKod, satirlar, tur) {
      return JP.tx(function (db) {
        var temiz = satirlar.filter(function (s) { return s.miktar > 0; });
        if (!temiz.length) throw new Error('Faturalanacak miktar girin.');
        var fatura = yeniFatura(db, cariKod, tur || 'e-Arşiv', null);
        fatura.satirlar = temiz.map(function (s) { return { fisSatirId: null, stokKod: s.stokKod, miktar: r2(s.miktar) }; });
        db.logo.faturalar.unshift(fatura);
        log(db, 'logo', 'Logo · serbest fatura', fatura.no + ' · sipariş bağlantısı yok (' + cariKod + ')');
        return fatura;
      });
    },

    gibGonder: function (faturaNo, basarili) {
      return JP.tx(function (db) {
        var f = db.logo.faturalar.find(function (x) { return x.no === faturaNo; });
        if (!f) throw new Error('Fatura bulunamadı.');
        f.gib = basarili === false ? 'Hata' : 'Başarılı';
        f.gibTs = now();
        f.ettn = f.ettn || uid('') + '-' + uid('') + '-jal';
        log(db, 'logo', 'Logo · GİB gönderimi', f.no + ' · ' + f.gib + (f.gib === 'Başarılı' ? ' · ETTN ' + f.ettn : ''), f.gib === 'Hata');
      });
    },

    stokDurum: function (kod, aktif) {
      return JP.tx(function (db) {
        var s = db.logo.stok.find(function (x) { return x.kod === kod; });
        if (s) { s.aktif = aktif; log(db, 'logo', 'Logo · stok kartı', kod + ' → ' + (aktif ? 'aktif' : 'pasif')); }
      });
    },

    stokEkle: function (kod, ad, grup, birim, renk, doku) {
      return JP.tx(function (db) {
        if (db.logo.stok.some(function (s) { return s.kod === kod; })) throw new Error('Bu stok kodu zaten var.');
        db.logo.stok.push({ kod: kod, ad: ad, grup: grup, birim: birim, renk: renk || '#B9AE99', doku: doku || 'diger', aktif: true, sira: db.logo.stok.length });
        log(db, 'logo', 'Logo · stok kartı', kod + ' oluşturuldu');
      });
    },

    cariDurum: function (kod, aktif) {
      return JP.tx(function (db) {
        var c = db.logo.cari.find(function (x) { return x.kod === kod; });
        if (c) { c.aktif = aktif; log(db, 'logo', 'Logo · cari kartı', kod + ' → ' + (aktif ? 'aktif' : 'pasif')); }
      });
    }
  };

  function yeniFatura(db, cariKod, tur, fisNo) {
    db.sayac.fatura++;
    return {
      no: 'JAL' + yil() + pad(db.sayac.fatura, 9),
      tur: tur, fisNo: fisNo, cariKod: cariKod, tarih: now(),
      gib: 'Kesilmedi', gibTs: null, ettn: null, satirlar: []
    };
  }

  function faturalananMiktar(db, fisNo, satirId) {
    return r2(db.logo.faturalar.filter(function (f) { return f.fisNo === fisNo; })
      .reduce(function (t, f) {
        return t + f.satirlar.reduce(function (u, s) { return s.fisSatirId === satirId ? u + s.miktar : u; }, 0);
      }, 0));
  }
  JP.logoFaturalanan = faturalananMiktar;

  /* --------------------------------------------------------------- raporlar */
  JP.raporAcikTalep = function (filtre) {
    filtre = filtre || {};
    var db = JP.db;
    return JP.havuzOzet(filtre).map(function (r) {
      var b = db.bayiler.find(function (x) { return x.kod === r.bayiKod; }) || { unvan: r.bayiKod };
      var u = db.urunler.find(function (x) { return x.kod === r.urunKod; }) || { ad: r.urunKod, grup: '—', birim: '' };
      return Object.assign({}, r, { bayiUnvan: b.unvan, urunAd: u.ad, grup: u.grup, birim: u.birim });
    }).filter(function (r) { return !filtre.grup || r.grup === filtre.grup; });
  };

  JP.raporEslesme = function () {
    var say = { baglantili: 0, fifo: 0, elle: 0 }, miktar = { baglantili: 0, fifo: 0, elle: 0 };
    JP.db.havuz.forEach(function (h) {
      if (h.tip !== 'dFatura' || !h.eslesme) return;
      say[h.eslesme]++; miktar[h.eslesme] = r2(miktar[h.eslesme] + h.miktar);
    });
    var toplam = say.baglantili + say.fifo + say.elle;
    return { say: say, miktar: miktar, toplam: toplam, eslesmeyen: JP.db.talepDisi.filter(function (t) { return !t.cozuldu; }).length };
  };

  /* ------------------------------------------------------------------ tohum */
  function tohum(bos) {
    var db = bosDb();
    mem = db;
    if (bos) return db;                      // "Demoyu baştan başlat": portal tarafı boş

    // --- ana veriyi Logo'dan çekilmiş varsay
    db.logo.stok.forEach(function (s) {
      db.urunler.push({
        kod: s.kod, ad: s.ad, grup: s.grup, birim: s.birim, renk: s.renk, doku: s.doku,
        logoAktif: s.aktif, logodaYok: false, siparieAcik: s.aktif, ozellik: s.ozellik,
        aciklama: aciklamaOf(s.grup), gosterimBirimi: s.birim === 'MTR' ? 'metre' : 'adet', sira: s.sira
      });
    });
    db.logo.cari.forEach(function (c) {
      db.bayiler.push({
        kod: c.kod, unvan: c.unvan, sehir: c.sehir, ulke: c.ulke, eposta: c.eposta,
        logoAktif: c.aktif, logodaYok: false, siparisAcik: c.aktif,
        kisit: { tip: 'tumu', gruplar: [], urunler: [] }, teslimatNotu: ''
      });
    });
    db.senkron.urun = { ts: gecmis(2), yeni: db.logo.stok.length, guncel: 0, pasif: 0, toplam: db.logo.stok.length };
    db.senkron.cari = { ts: gecmis(2), yeni: db.logo.cari.length, guncel: 0, pasif: 0, toplam: db.logo.cari.length };

    // yurt dışı bayi yalnızca iki gruba açık — kısıt davranışı görünsün
    var balkan = db.bayiler.find(function (b) { return b.kod === 'BYI-0004'; });
    balkan.kisit = { tip: 'gruplar', gruplar: ['Zebra', 'Sun Screen'], urunler: [] };
    db.urunler.find(function (u) { return u.kod === 'ZEB-1200-KARTELA'; }).siparieAcik = false;

    // --- geçmiş hareket: yaşlanmış açık talep + akışı tamamlanmış bir sipariş
    _ts = gecmis(24);
    JP.talepOlustur('BYI-0001', [
      { urunKod: 'ZEB-1200-KREM', miktar: 320 },
      { urunKod: 'STR-3000-BEYAZ', miktar: 150 },
      { urunKod: 'TUL-0500-EKRU', miktar: 90 },
      { urunKod: 'PLS-KASET-VIZON', miktar: 24 }
    ], 'Sezon açılışı için ilk parti. Kartela ile aynı tonlar olsun.', null);

    _ts = gecmis(21);
    var t1 = db.talepler[0];
    JP.siparisOlustur('BYI-0001', [
      { talepNo: t1.no, kalemId: t1.kalemler[0].id, miktar: 200 },
      { talepNo: t1.no, kalemId: t1.kalemler[1].id, miktar: 150 }
    ], 'muhasebe');
    JP.siparisLogoyaGonder(db.siparisler[0].no);

    _ts = gecmis(18);
    var fis1 = db.logo.fisler[0];
    JP.logo.faturaKes(fis1.fisNo, fis1.satirlar.map(function (r) { return { fisSatirId: r.id, miktar: r.miktar }; }), 'e-Fatura');
    JP.logo.gibGonder(db.logo.faturalar[0].no, true);
    JP.durumSorgula();

    _ts = gecmis(9);
    JP.talepOlustur('BYI-0002', [
      { urunKod: 'SSC-0310-GUMUS', miktar: 240 },
      { urunKod: 'ZEB-1200-ANTR', miktar: 180 }
    ], 'Ofis projesi — teslim tarihi kritik.', null);

    _ts = gecmis(3);
    JP.talepOlustur('BYI-0004', [
      { urunKod: 'ZEB-2400-BEJ', miktar: 400 },
      { urunKod: 'SSC-0510-BEYAZ', miktar: 120 }
    ], 'Belgrad deposu için. Konteyner yüklemesi ayın 25\'i.', null);

    // Logo'ya iletilmiş, henüz faturalanmamış bir sipariş — canlı demoda kaldığı yerden devam eder
    _ts = gecmis(2);
    var t2 = db.talepler.find(function (t) { return t.bayiKod === 'BYI-0002'; });
    JP.siparisOlustur('BYI-0002', [
      { talepNo: t2.no, kalemId: t2.kalemler[0].id, miktar: 150 }
    ], 'muhasebe');
    JP.siparisLogoyaGonder(db.siparisler[0].no);

    _ts = null;
    db.meta.rev = 0;
    return db;
  }

  function aciklamaOf(grup) {
    var m = {
      'Zebra': 'Çift kat gündüz/gece dokuma. 200 cm ve 280 cm en. Işık geçirgenliği ayarlanabilir.',
      'Stor': 'Tek kat düz dokuma stor kumaşı. Leke tutmaz apre, 280 cm en.',
      'Tül Stor': 'Şeffaf tül dokuma. Gün ışığını yumuşatır, 300 cm en.',
      'Sun Screen': 'PVC kaplı cam elyaf. Isı ve UV kontrolü, açıklık oranı etikette.',
      'Plise': 'Katlanabilir plise dokuma. Cam üstü montaj için 45 mm katlama.',
      'Sineklik': 'Fiberglas sineklik tülü. 18×16 göz, 180 cm en.'
    };
    return m[grup] || '';
  }

  JP.aciklamaOf = aciklamaOf;
})();
