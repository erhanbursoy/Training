# Jalpersan B2B Portalı — Çalışan Prototip (PoC)

Bayi portalı, firma paneli ve Logo ERP simülatörü **üç ayrı sayfada**. Aynı tarayıcıda
açık sekmeler aynı veriyi paylaşır: bir pencerede yaptığınız işlem diğerlerine anında yansır.

Teknik doküman v0.6, bölüm 7'deki prototip kapsamını uygular.

## Çalıştırma

| Yöntem | Nasıl |
| --- | --- |
| Yayındaki adres | `index.html`'i tarayıcıda açın, üç kartı ayrı pencerelerde çalıştırın |
| Yerel sunucu | `npx http-server -p 8080 .` sonra `http://localhost:8080` |
| Tek dosya | `dist/jalpersan-poc.html` — çift tıklayın, roller üstteki seçiciyle değişir |

`file://` ile açtığınızda bazı tarayıcılar sekmeler arası paylaşımı engeller.
Üç ekranın birbirini görmesi için yerel sunucu veya yayındaki adres önerilir.

## Beş dakikalık demo

1. **Firma → Panel** · "Ürünleri Logo'dan al" + "Bayileri Logo'dan al". Bir ürünü siparişe kapatın, bir bayiye yalnızca seçili grupları açın.
2. **Bayi → Ürün kataloğu** · Sol yan paneldeki ürün ağacından kırılım seçin, ürünleri sepete ekleyin. **Sepetim → Sepeti onayla** dediğinizde satın alma talebi oluşur ve havuza `dTalep` giriş hareketi yazılır.
3. **Firma → Gelen talepler** · Kalem bazında miktarı düşürerek sipariş oluşturun; kalan havuzda açık kalır.
4. **Firma → Siparişler** · "Logo'ya gönder". İsterseniz önce gönderim hatası simüle edip yeniden gönderin.
5. **Logo → Sipariş fişleri** · Fişi görün; miktarı değiştirin, kısmi fatura kesin, ikinci faturayı kesin, GİB'e gönderin.
6. **Firma → Siparişler** · "Sipariş ve fatura durumunu sorgula". Miktar değişimi ve faturalar havuza hareket olarak işlenir, sipariş kapanır. Tekrar sorgulayın — mükerrer hareket yazılmaz.
7. **Firma → Talep havuzu** · Dört bakiye ve tüm hareket dökümü. "Elle hareket ekle" ile fatura dışı kapatma; Logo'daki "Serbest fatura kes" ile FIFO ve talep dışı eşleme.

Panel üstündeki **Demoyu baştan başlat** portal tarafını boşaltır (Logo kartları kalır),
böylece senaryoyu 1. adımdan canlı koşturabilirsiniz. **Örnek veriye dön** başlangıç örneğini geri yükler.

## Bayi portalı yerleşimi

Standart web uygulaması düzeni: üstte **Dashboard**, **Ürün kataloğu**, **Taleplerim**;
sağ üstte sepet, bildirim ve profil ikonları. Bayi hesabı değişimi profil menüsündedir.

- **Dashboard** · tek ölçüm: kaç talep açık. Altında açık taleplerdeki ürünler
  talep edilen / sevk edilen / bekleyen olarak listelenir. Talep numarasına
  tıklayınca o talebin detayı açılır.
- **Taleplerim** · liste (tarih, talep no, durum, talep edilen, sevk edilen) ve talep detayı.
  Detayda üç görünüm var: **Ürünler**, **İşlemler** (talepten doğan siparişler ve faturalar)
  ve **Hareketler** (talep geçmişi).

### Bayi tarafında havuz görünmez

Havuz, rezerv, tahsis, eşleşme kademesi ve hareket tipleri (`dTalep` / `dRezerv` / `dFatura`)
iç muhasebe kavramlarıdır ve bayi ekranlarında hiçbir yerde geçmez. Bayi talep oluşturur ve
talebinin ne kadarının sevk edildiğini görür. Motor aynıdır; yalnızca sunum farklıdır.

| Bayi ne görür | Arkada ne var |
| --- | --- |
| Talep edilen | Σ `dTalep` |
| Sipariş oluşturulan | Σ `dRezerv`, faturayla çözülen rezerv hariç (kümülatif) |
| Sevk edilen | Σ `dFatura` — fatura kesildiğinde sevkiyat gerçekleşmiş sayılır |
| Bekleyen | Talep edilen − sevk edilen |

Talep geçmişinde hareket tipleri iş diline çevrilir: *Talep oluşturuldu*, *Talep azaltıldı*,
*Siparişe alındı*, *Sipariş miktarı düşürüldü*, *Sevk edildi*. Faturayla birlikte yazılan
rezerv çözümü teknik bir kayıt olduğu için bayiye gösterilmez.

Sipariş birimi (metre / adet) yalnızca talep detayında kalem satırının yanında yazar;
dashboard ve listelerde miktarlar birimsiz gösterilir.

## Havuz mantığı

Bakiye hiçbir yerde saklanmaz; tek bir hareket tablosundan türetilir. Kayıt güncellenmez,
düzeltme ters hareketle yapılır.

```
talep       = Σ dTalep       (talep açıldı +, iptal/azaltma −)
siparişte   = Σ dRezerv      (sipariş +, sipariş iptali −, fatura −)
faturalanan = Σ dFatura
açık        = talep − siparişte − faturalanan
```

Fatura yazılırken rezerv **aynı işlemde** kapatılır; aksi halde sipariş faturalanınca
miktar iki kez düşer. Logo kaynaklı her hareketin benzersiz bir referansı vardır
(`logo:fatura:<no>:<satır>`), sorgu kaç kez tetiklenirse tetiklensin aynı hareket ikinci kez yazılmaz.

### Fatura eşleme kademeleri

| Kademe | Koşul | Yöntem |
| --- | --- | --- |
| 1 · Bağlantılı | Fatura satırında sipariş satır referansı var | Sipariş kalemi → talep kalemi, deterministik |
| 2 · FIFO | Sipariş bağlantısı yok, bayi ve ürün eşleşiyor | En eski açık talep kaleminden düşülür |
| 3 · Eşleşmeyen | Talep yok veya talebi aşıyor | "Talep dışı fatura" listesine düşer, elle bağlanır |

Havuz bakiyesi negatife düşmez; talebi aşan fatura miktarı ayrı raporlanır.

## Dosya yapısı

```
index.html          giriş — üç rol kartı ve demo senaryosu
bayi.html           bayi portalı
firma.html          firma paneli (muhasebe / yönetim)
logo.html           Logo ERP simülatörü
assets/style.css    ortak tasarım sistemi (açık/koyu tema; Logo koyu dünya)
assets/core.js      veri modeli, havuz hareket defteri, iş kuralları, Logo simülatörü
assets/ui.js        kabuk, tablo, kip, bildirim yardımcıları
assets/bayi.js      bayi ekranları
assets/firma.js     firma ekranları
assets/logo.js      Logo simülatörü ekranları
build.mjs           tek dosya derleyici
dist/               üretilen tek dosya sürümleri
```

Veri yalnızca tarayıcının `localStorage` alanında tutulur; sunucuya hiçbir şey gönderilmez.
Sekmeler `BroadcastChannel` ve `storage` olayıyla senkronlanır.

Tek dosya sürümünü yeniden üretmek için: `node build.mjs`

## Yayınlama (GitHub Pages)

1. Depo ayarlarında **Settings → Pages**
2. Source: **Deploy from a branch**, Branch: `claude/prototype-demo-web-structure-z4jq7z`, klasör `/ (root)`
3. Bir iki dakika sonra adres: `https://<kullanıcı>.github.io/Training/jalpersan-b2b-poc/`

Aynı adresten açılan üç sekme aynı kaynağı paylaşır, senkron çalışır.

## Gerçek entegrasyona geçiş

Prototipte `assets/core.js` içindeki `JP.logo.*` fonksiyonları ve `JP.durumSorgula`
Logo'yu taklit eder. Gerçek kurulumda yalnızca bu katmanın yerini alır:

| Prototip | Gerçek karşılığı |
| --- | --- |
| `JP.logoUrunleriCek` | `LG_XXX_ITEMS` salt okunur sorgusu |
| `JP.logoBayileriCek` | `LG_XXX_CLCARD` salt okunur sorgusu |
| `JP.siparisLogoyaGonder` | Logo REST sipariş fişi yazma (fallback: LObjects) |
| `JP.durumSorgula` | `ORFICHE` / `ORFLINE` + `INVOICE` + e-Fatura durum tabloları |
| `db.logo.*` | Logo veritabanı |

Portal ekranları, havuz hareket defteri ve eşleme kuralları değişmez.

## Kapsam dışı (dokümandaki gibi)

Fiyat, iskonto, cari bakiye; ödeme ve sanal POS; portalda ürün/cari kartı oluşturma;
zamanlanmış senkron işleri (ilk fazda tüm sorgular elle tetiklenir).
