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

## Bayi kullanıcıları

Portal hesapları yalnızca firma panelindeki **Kullanıcılar** ekranından açılır;
bayi tarafında kayıt formu yoktur. Her kullanıcı tek bir cari karta bağlıdır ve
yalnızca o bayinin talep ve siparişlerini görür.

| Alan | Anlamı |
| --- | --- |
| Rol | **Sipariş yetkilisi** sepete ekler ve talep gönderir; **Görüntüleyici** yalnızca izler |
| Durum | Davet gönderildi → Aktif (ilk girişte) → Pasif (firma kapatınca) |
| Dil | Türkçe / İngilizce tercihi |

Firma tarafında: kullanıcı ekleme, ad/e-posta/rol/dil düzenleme, başka bayiye taşıma,
daveti ve şifre sıfırlama bağlantısını yeniden gönderme, pasife alma ve silme.
Bayi detayında da o bayinin kullanıcıları ayrı sekmede listelenir.

Bayi portalı oturum yokken **giriş ekranı** gösterir. E-posta tanımlı değilse giriş
reddedilir ve hesabın firma tarafından açıldığı belirtilir. Prototipte şifre sorulmaz;
gerçek kurulumda ASP.NET Core Identity ile davet bağlantısı, şifre politikası, hesap
kilitleme ve opsiyonel iki adımlı doğrulama kullanılır.

Talep oluşturma yetkisi rol ve bayi durumunu birlikte gözetir: görüntüleyici rolü,
pasif hesap veya siparişe kapalı bayi sepete ekleme ve talep gönderme düğmelerini
kapatır, sebebi ekranda yazar.

## Bayi portalı yerleşimi

Standart web uygulaması düzeni: üstte **Ürün kataloğu** ve **Taleplerim**;
sağ üstte sepet, bildirim ve profil ikonları. Bayi hesabı değişimi profil menüsündedir.

- **Taleplerim** · liste (tarih, talep no, durum, talep edilen, sevk edilen) ve talep detayı.
  Detayda üç görünüm var: **Ürünler**, **İşlemler** (talepten doğan siparişler ve faturalar)
  ve **Hareketler** (talep geçmişi).

### Birimler karışmaz

Ürünler farklı birimlerde olabilir (metre, adet). Bu yüzden bir talebin kalemleri
**hiçbir yerde toplanmaz**: talep listesi ve talep özeti miktar değil kalem sayısı
gösterir (kaç kalem tamamen, kısmen veya hiç sevk edilmedi). Miktarlar yalnızca
kalem satırında, o ürünün kendi biriminden yazar. Dashboard satırları tek ürün
olduğu için miktar gösterir; birim ürün kodunun yanındadır.

## Firma paneli

Beş bölüm: **Panel**, **Talepler**, **Siparişler**, **Ürünler**, **Bayiler**.

- **Panel** · yalnızca dört kart: bekleyen talep, açık sipariş, gönderim hatası,
  gecikmiş sipariş. Karta tıklayınca ilgili ekrana gider.
- **Talepler** ve **Siparişler** · tarih aralığı, arama ve durum filtresi olan liste;
  satıra tıklayınca detay. Talep listesinde **İstenen teslim** sütunu bayinin talebinde
  belirttiği tarihi gösterir (belirtilmemişse “—”). Talep detayında Ürünler / İşlemler /
  Geçmiş görünümleri, siparişe dönüştürme detayın içinde. Sipariş ekranında
  **Logo'dan sorgula** düğmesi açık siparişlerin fiş ve fatura durumunu okur.
- **Ürünler** · arama kutusu ve **Logo'dan güncelle**. Detay ayrı ekrandır: solda
  salt okunur Logo alanları ve altında **Görseller**, sağda düzenlenebilir portal
  alanları (siparişe açıklık, bayiye gösterilen birim, katalog sırası, teknik özellik,
  açıklama). Altta o üründe sevk bekleyen bayiler listelenir.
- **Bayiler** · arama kutusu ve **Logo'dan güncelle**. Detay ayrı ekran, üç sekme:
  Bilgiler (Logo alanları salt okunur; siparişe açıklık, teslimat notu ve katalog
  kısıtı düzenlenebilir), Talepler ve Siparişler geçmişi.

### Teslim tarihi

Bayi sepeti onaylarken istediği teslim tarihini opsiyonel olarak girer. Bu tarih talep
listesinde ayrı bir sütun, talep detayında etiket olarak görünür.

Siparişe dönüştürürken **talep edilen teslim tarihi** yine opsiyoneldir: bayinin talebinde
tarih varsa öneri olarak gelir, muhasebe değiştirebilir ya da boş bırakabilir. Girilen tarih
sipariş detayında etiket olarak durur ve sipariş Logo'ya gönderildiğinde fişe taşınır;
Logo simülatöründe fiş başlığında görünür.

Talep ve sipariş listeleri Excel'e kopyalanabilir; iki çıktı da teslim tarihi sütununu taşır.

### Havuz görünmez, birimler karışmaz

Havuz, rezerv, tahsis ve hareket tipleri (`dTalep` / `dRezerv` / `dFatura`) hiçbir
ekranda geçmez; iş dili kullanılır. Motor değişmedi, bakiyeler yine bu hareketlerden
hesaplanır.

Kalemler farklı birimlerde olabildiği için miktarlar belge düzeyinde **toplanmaz**.
Talep, sipariş ve panel özetleri kalem ya da satır sayısı gösterir; miktarlar yalnızca
tek ürüne ait satırlarda, o ürünün kendi biriminden yazar.

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

Bu dört sayı kalem düzeyindedir; farklı birimler karışmasın diye talep düzeyinde toplanmaz.

Talep geçmişinde hareket tipleri iş diline çevrilir: *Talep oluşturuldu*, *Talep azaltıldı*,
*Siparişe alındı*, *Sipariş miktarı düşürüldü*, *Sevk edildi*. Faturayla birlikte yazılan
rezerv çözümü teknik bir kayıt olduğu için bayiye gösterilmez.

Sipariş birimi (metre / adet) yalnızca talep detayında kalem satırının yanında yazar;
dashboard ve listelerde miktarlar birimsiz gösterilir.

## Ürün verisi ve görseller

Katalog **jalpersan.com/urunler** adresinden derlenmiştir: 11 kategori, 178 seri, 259 model
(`assets/katalog.js`). Prototipte Logo stok kartlarının kaynağı budur; gerçek kurulumda yerini
`LG_XXX_ITEMS` sorgusu alır. Yeniden derlemek gerekirse veri kategori sayfalarının JSON çıktısından
üretilir.

Model kodları Türkçe harfler çevrilerek üretilir (`Şehir` → `SEHIR`, `Küçük Köy` → `KUCUK-KOY`).
Aynı model adı farklı koleksiyonlarda geçebildiği için — iki ayrı *Şehir* deseni gibi — stok kodu
üretimi çakışmaya sıra eki verir (`SEHIR`, `SEHIR-2`); Logo'da stok kodu tekildir.

Ürün fotoğrafları (178 seri görseli) `assets/gorseller.js` içinde kaynak çözünürlükte
(448 piksel) gömülüdür — toplam 3,1 MB. Böylece katalog hiç ağ isteği yapmadan,
çevrimdışı ve dış görsele izin vermeyen ortamlarda da eksiksiz görünür.

Ürün detayında önce jalpersan.com'daki büyük görsel (`_xl`, 1279 piksel) denenir;
ulaşılamazsa gömülü görsele düşülür.

Bazı ortamların içerik güvenlik kuralı (`Content-Security-Policy`) `img-src` içinde
`data:` taşımaz ve gömülü görselleri de engeller. Bu durumda `<img>` başarısız olur ve
aynı baytlar tuvale (`canvas`) çizilir; tuval çizimi kaynak yüklemesi olmadığı için bu
kurala takılmaz. İkisi de olmazsa altındaki dokuma deseni kalır.

Görselleri yenilemek için seri sayfalarının kapak görselleri şu kalıptan indirilir:
`https://www.jalpersan.com/assets/images/tr/<sayfa-uri>/<görsel>_m.jpeg?v1`

### Ürün görsellerini yönetme

Teknik dokümanda görsel bir **portal alanıdır** (3.2): kartela ve ürün fotoğrafı, birden
fazla görsel, sıralama. Firma panelinde ürün detayının **Görseller** bölümünden yönetilir:

- **Görsel yükle** · dosya seçilir, tarayıcıda en fazla 640 piksele küçültülüp JPEG'e
  çevrilir. Sunucuya bir şey gitmez.
- **Adres ile ekle** · dış bir görsel adresi (`https://…`) bağlanır. Bazı ortamlar dış
  adresleri engellediği için kalıcı sonuç isteyen kurulumda dosya yüklemek daha güvenlidir.
- **← / →** ile sıralanır; **ilk sıradaki görsel** bayi kataloğunda ve listelerde görünen
  görseldir, üzerinde *Katalogda* rozeti taşır. **Sil** üründen kaldırır.
- Portal görseli yoksa jalpersan.com kataloğundan gelen seri görseli kullanılır; bu kart
  salt okunurdur. Yüklenen ilk görsel onun yerine geçer.

Görsel baytları veritabanında **tutulmaz**. Ürün kaydı yalnızca referans taşır
(`{ tip: 'yerel', id }` ya da `{ tip: 'adres', v }`), baytlar ayrı bir depo anahtarında
(`jalpersan.poc.v7.g`) durur. Görseller kayıtların içine kopyalandığında veritabanı
megabaytlara çıkıp tarayıcı kotasını aşıyor ve hiçbir yazma kalıcı olmuyordu.

Yükleme, çözümlemeyi `createImageBitmap` ile yapar: dosya Blob olarak okunur, kaynak
yüklemesi sayılmadığı için katı içerik güvenlik kuralı olan ortamlarda da çalışır.

## Tasarım

Renk ve tipografi jalpersan.com kurumsal kimliğinden alınmıştır:

| | |
| --- | --- |
| Metin / koyu | `#27292D`, `#0F1217` |
| Marka kırmızısı | `#F00F45` — yalnızca birincil eylemlerde ve aktif durumda |
| Zemin | `#F4F4F4`, yüzey `#FFFFFF`, çizgi `#E8E8E8` |
| Yazı tipi | Source Sans 3 (arayüz), IBM Plex Mono (kod ve miktar sütunları) |

Font isteği çizimi engellemez; yavaş bağlantıda sayfa yedek yazı tipiyle açılır.

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
assets/style.css    ortak tasarım sistemi (açık tema; Logo simülatörü koyu)
assets/core.js      veri modeli, havuz hareket defteri, iş kuralları, Logo simülatörü
assets/ui.js        kabuk, tablo, kip, bildirim yardımcıları
assets/bayi.js      bayi ekranları
assets/firma.js     firma ekranları
assets/logo.js      Logo simülatörü ekranları
build.mjs           tek dosya derleyici
dist/               üretilen tek dosya sürümleri
```

Portal ekranları her zaman açık renktir; tarayıcının koyu tema tercihini izlemez.
Yalnızca Logo ERP simülatörü koyu terminal görünümündedir.

Dar ekranda üst çubuk sarar, bölüm rayı yatay şeride döner, tablolar kendi kabında
yatay kayar ve ürün ağacı kısa bir kaydırılır kutuya iner. Sayfanın kendisi hiçbir
genişlikte yatay kaymaz.

Veri yalnızca tarayıcının `localStorage` alanında tutulur; sunucuya hiçbir şey gönderilmez.
Görsel baytları veritabanına yazılmaz: katalog görselleri `JP.GORSEL` haritasından gelir,
yüklenen portal görselleri ayrı bir depo anahtarında (`jalpersan.poc.v7.g`) durur; ürün
kaydı yalnızca anahtar taşır. Aksi halde veritabanı tarayıcı kotasını aşar ve hiçbir
değişiklik kaydedilmez.
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
