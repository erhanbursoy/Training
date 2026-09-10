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

1. **Giriş** · Firma hesabıyla girin (prototipte hesaplar giriş ekranında listelidir).
   Bayi hesabıyla girerseniz bayi portalına yönlenirsiniz.
2. **Firma → Ürünler / Bayiler** · "Logo'dan güncelle" ile stok ve cari kartları çekin.
   Bir ürünü siparişe kapatın, bir bayiye yalnızca seçili kategorileri açın.
3. **Bayi → Ürün kataloğu** · Sol yan paneldeki ürün ağacından kırılım seçin, ürünleri
   sepete ekleyin. **Sepetim → Sepeti onayla** dediğinizde satın alma talebi oluşur.
4. **Firma → Bayiler → Talep oluştur** · Telefonla gelen talebi bayi adına aynı katalogdan
   girin; talep "firma girişi" olarak işaretlenir.
5. **Firma → Talepler** · Aynı bayinin birkaç talebini satır başındaki kutularla seçip
   **tek siparişe dönüştürün**; kip kalemleri ürün bazında gruplar. Sipariş oluşturulurken
   aynı işlemde Logo'da fiş açılır. "Logo gönderim hatasını simüle et" ile deneyin: fiş
   açılmazsa sipariş de oluşmaz, talep miktarı açıkta kalır.
6. **Logo → Sipariş fişleri** · Fişi görün; miktarı değiştirin, kısmi fatura kesin, ikinci
   faturayı kesin, GİB'e gönderin.
7. **Firma → Siparişler → Logo'dan sorgula** · Miktar değişimi ve faturalar hareket olarak
   işlenir, sipariş kapanır. Tekrar sorgulayın — mükerrer hareket yazılmaz.
8. **Firma → Raporlar** · Dört raporu tarih aralığıyla süzün: en çok sipariş edilenler,
   karşılanmayı bekleyenler, bayi bazında sipariş sayıları, talepten karşılanmaya süre.
9. **Firma → Ürünler → Düzenle** · Ürün detayında görsel yükleyin ve sıralayın; ilk sıradaki
   görsel bayi kataloğunda görünür.

Panel üstündeki **Demoyu baştan başlat** portal tarafını boşaltır (Logo kartları kalır),
böylece senaryoyu 1. adımdan canlı koşturabilirsiniz. **Örnek veriye dön** başlangıç örneğini geri yükler.

## Kullanıcılar ve giriş

İki kullanıcı tipi vardır ve ikisi de yalnızca firma tarafından açılır; portalda kayıt
formu yoktur.

| Tip | Nereye girer | Cari kart | Roller |
| --- | --- | --- | --- |
| Bayi kullanıcısı | Bayi portalı | bir bayiye bağlı | **Sipariş yetkilisi** (sepete ekler, talep gönderir), **Görüntüleyici** (yalnızca izler) |
| Firma kullanıcısı | Firma paneli | bağlı değil | **Yönetici** (her şey + kullanıcı yönetimi), **Muhasebe** (kullanıcı yönetimi hariç) |

**Tek giriş ekranı, tipe göre yönlendirme.** Bayi portalı ve firma paneli aynı giriş
ekranını kullanır; giriş yapan hesabın tipi hangi ekrana gidileceğini belirler. Yanlış
kapıdan giren bir hesap sessizce atılmaz: ne olduğunu söyleyen bir ekran çıkar ve kendi
portalına dönme ya da çıkış yapma seçeneği verir. Logo ERP simülatörü portal dışıdır,
giriş istemez.

**Kullanıcı yönetimi Yönetici rolündedir.** Muhasebe rolü diğer bütün ekranları görür ama
iki kullanıcı bölümü ona hiç görünmez. Sağ üstteki hesap menüsü rolü ve yetkiyi yazar.

Firma panelinde iki ayrı ekran vardır: **Bayi kullanıcıları** (bayi sütunu ve bayi
filtresiyle) ve **Firma kullanıcıları**. İkisi de aynı iskeleti paylaşır: arama, durum
filtresi, liste ve ayrı detay ekranı. Detayda ad/e-posta/rol/dil düzenleme, bayi
kullanıcısında bayi değiştirme, daveti ve şifre sıfırlama bağlantısını yeniden gönderme,
pasife alma ve silme var. Bayi kartında da o bayinin kullanıcıları ayrı sekmede listelenir.

Motor iki koruma uygular: rol tipe uymazsa kayıt reddedilir (bayi kullanıcısına Yönetici
verilemez, firma kullanıcısı cari karta bağlanamaz) ve **son etkin firma yöneticisi** pasife
alınamaz ya da silinemez — aksi halde paneli yönetecek kimse kalmazdı. Arayüz de kişinin
kendi hesabını pasife almasını ve silmesini kapatır.

| Alan | Anlamı |
| --- | --- |
| Durum | Davet gönderildi → Aktif (ilk girişte) → Pasif (firma kapatınca) |
| Dil | Türkçe / İngilizce tercihi |

Bayi portalı oturum yokken **giriş ekranı** gösterir. Prototipte şifre sorulmaz;
gerçek kurulumda ASP.NET Core Identity ile davet bağlantısı, şifre politikası, hesap
kilitleme ve opsiyonel iki adımlı doğrulama kullanılır.

### Giriş ekranı kötüye kullanım korumaları

**Robot doğrulaması.** Giriş düğmesi doğrulama yapılmadan çalışmaz. `JP.AYAR.recaptchaSiteKey`
tanımlıysa ekran gerçek **Google reCAPTCHA v2** bileşenini yükler; tanımlı değilse (prototip
varsayılanı) yerine açıkça *Prototip* etiketli bir yer tutucu gelir, böylece akış demoda
görünür. Her hatalı denemeden sonra doğrulama sıfırlanır.

**Bunun gerçek koruma olması için sunucu şart.** reCAPTCHA yalnızca gelen jeton sunucuda
`https://www.google.com/recaptcha/api/siteverify` adresine *secret key* ile sorulduğunda ve
başarısız yanıtta istek reddedildiğinde koruma sağlar. İstemcide biten bir kontrol
atlatılabilir — saldırgan bileşeni hiç çalıştırmadan doğrudan uç noktaya istek atar. Bu
prototipte sunucu yoktur; ekrandaki doğrulama akışı gösterir, korumayı sağlamaz.

Kurulum sırası: Google reCAPTCHA konsolunda alan adı için anahtar çifti alınır, site key
`JP.AYAR.recaptchaSiteKey`e yazılır, secret key **yalnızca sunucuda** tutulur ve giriş uç
noktası jetonu doğrulamadan hiçbir kimlik kontrolü yapmaz. v3 kullanılacaksa eşik puanı
(ör. 0.5) da sunucuda değerlendirilir.

**Hatalı deneme sınırı.** Beş hatalı denemeden sonra 60 saniye bekleme uygulanır; düğme
geri sayımla kilitlenir (`JP.AYAR.girisEnFazlaDeneme` / `girisBeklemeSaniye`). Prototipte
sayaç tarayıcıda durduğu için temizlenebilir; gerçek kurulumda sayaç ve kilit sunucu
tarafındadır (Identity hesap kilitleme) ve ayrıca IP başına hız sınırı uygulanır.

**Hesap sızdırmayan hata mesajı.** Tanımsız e-posta ile pasif hesap aynı mesajı alır, böylece
giriş ekranı hangi adreslerin kayıtlı olduğunu doğrulamaya yaramaz.

Artifact ortamında Google betiği içerik güvenlik kuralıyla engellenir; anahtar tanımlıysa
ekran bunu yazar ve giriş kapalı kalır. Bu yüzden prototip yer tutucuyla yayınlanır.

Talep oluşturma yetkisi rol ve bayi durumunu birlikte gözetir: görüntüleyici rolü,
pasif hesap veya siparişe kapalı bayi sepete ekleme ve talep gönderme düğmelerini
kapatır, sebebi ekranda yazar.

## Bayi portalı yerleşimi

Standart web uygulaması düzeni: üstte **Ürün kataloğu** ve **Taleplerim**;
sağ üstte sepet, bildirim ve profil ikonları. Bayi hesabı değişimi profil menüsündedir.

- **Taleplerim** · liste (tarih, talep no, durum) ve talep detayı; kalem satırlarında
  yalnızca talep edilen ve sevk edilen miktarlar yazar.
  Detayda üç görünüm var: **Ürünler**, **İşlemler** (talepten doğan siparişler ve faturalar)
  ve **Hareketler** (talep geçmişi).

### Birimler karışmaz

Ürünler farklı birimlerde olabilir (metre, adet). Bu yüzden bir talebin kalemleri
**hiçbir yerde toplanmaz**: talep listesi ve talep özeti miktar değil kalem sayısı
gösterir (kaç kalem tamamen, kısmen veya hiç sevk edilmedi). Miktarlar yalnızca
kalem satırında, o ürünün kendi biriminden yazar. Dashboard satırları tek ürün
olduğu için miktar gösterir; birim ürün kodunun yanındadır.

## Firma paneli

Bölümler: **Panel**, **Talepler**, **Siparişler**, **Raporlar**, **Ürünler**, **Bayiler** ve
Yönetici rolündeki kullanıcıya açılan **Bayi kullanıcıları** ile **Firma kullanıcıları**.

- **Panel** · yalnızca dört kart: bekleyen talep, açık sipariş, Logo'da miktarı değişen
  sipariş, gecikmiş sipariş. Karta tıklayınca ilgili ekrana gider.
- **Talepler** ve **Siparişler** · tarih aralığı, arama ve durum filtresi olan liste;
  satıra tıklayınca detay. Talep listesinde **İstenen teslim** sütunu bayinin talebinde
  belirttiği tarihi gösterir (belirtilmemişse “—”); firma adına girilen telefon talepleri
  numaranın yanında rozet taşır. Talep detayında Ürünler / İşlemler /
  Geçmiş görünümleri. Talep listesinde satır başındaki kutularla birden çok talep seçilip
  tek siparişte birleştirilebilir; dönüştürme detayın içinden de yapılır. Sipariş ekranında
  **Logo'dan sorgula** düğmesi açık siparişlerin fiş ve fatura durumunu okur.
- **Ürünler** · yerleşim bayi kataloğuyla aynıdır: solda ürün ağacı, üstte arama ve
  Liste/Kart geçişi, satırlarda kırılım ürünün üzerinde, görselin üzerine gelince büyür.
  Tek fark eylemdir — bayi sepete ekler, firma **Düzenle** ile ürün detayına girer.
  Satırda ürünün bayi kataloğunda görünüp görünmediği ve Logo durumu rozet olarak yazar.
  Detay ayrı ekrandır: solda salt okunur Logo alanları ve altında **Görseller**, sağda
  düzenlenebilir portal alanları (siparişe açıklık, bayiye gösterilen birim, katalog
  sırası, teknik özellik, açıklama). Altta o üründe sevk bekleyen bayiler listelenir.
- **Bayiler** · arama kutusu, **Logo'dan güncelle** ve satır başına **Talep oluştur**
  (telefon talebi). Detay ayrı ekran, dört sekme: Bilgiler (Logo alanları salt okunur;
  siparişe açıklık, teslimat notu ve katalog kısıtı düzenlenebilir), Kullanıcılar,
  Talepler ve Siparişler geçmişi.

### Katalogda sepet miktarı

Katalog satırındaki sayaç **sepetteki miktarı** gösterir. Ürün sepette değilse sayaç bir
miktar girişidir ve düğme onu sepete yazar; sepetteyse her değişiklik (+, −, elle yazma)
doğrudan sepete işlenir ve düğme **Çıkar** olur. 0 yazmak satırı çıkarır. Yani sepet
ekranındaki davranışın aynısı — katalogdan ekleme üst üste toplanmaz.

Ürün detay kipi de aynı: sayaç sepetteki miktardan başlar, girilen miktar üstüne eklenmek
yerine yerine yazılır. Aynı davranış firma tarafındaki bayi adına talep kataloğunda geçerli.
Motorda `JP.sepetAyarla` bunu sağlar: mutlak miktar yazar, satır yoksa açar, 0 ise çıkarır.

### Raporlar

Dört rapor tek iskeleti paylaşır: üstte rapor seçici, altında ortak tarih aralığı ve arama
çubuğu, raporun ne ölçtüğünü söyleyen bir satır, dört ölçüm kartı ve tek tablo. Her raporun
kendi Excel çıktısı vardır.

| Rapor | Satır | Ölçüler | Tarih aralığı |
| --- | --- | --- | --- |
| En çok sipariş edilenler | ürün | siparişe alınan, sevk edilen, sevk oranı, kalem, bayi, son sipariş | sipariş tarihi |
| Karşılanmayı bekleyenler | ürün | talep edilen, siparişe alınan, sevk edilen, kalan, talep, bayi, en eski | talep tarihi |
| Bayi bazında sipariş sayıları | bayi | talep, sipariş, dönüşüm oranı, sipariş kalemi, ürün çeşidi, tamamlanan | belge tarihi |
| Talepten karşılanmaya süre | ürün | kalem, tam sevk, ort. ilk sevk, ort. tam sevk, en uzun, bekleyen | talep tarihi |

Süre raporu **talep kalemi düzeyinde** ölçer: kalemin `dTalep` hareketinin zamanı ile
sevkiyat (`dFatura`) hareketlerinin zamanı arasındaki gün farkı. *İlk sevk* ilk faturaya,
*tam sevk* kalemin tamamının kapandığı faturaya kadar geçen süredir. Tamamlanmamış kalemler
ayrı sayılır ve en eskisinin yaşı yazar; kapanmamış kalem ortalamayı bozmaz.

İptal edilmiş siparişler sipariş raporlarına girmez. Miktarlar ürünün kendi biriminden
olduğu için satırlar arası toplanmaz — ölçüm kartları ürün, bayi, kalem, belge ya da gün
sayar.

### Birden çok talebi tek siparişte birleştirme

Bayi haftalar içinde altı ayrı talep girmişse hepsi tek siparişte toplanabilir.
**Talepler** listesinde satır başındaki kutularla talepler seçilir; seçim şeridi kaç talep
ve kaç dönüştürülebilir kalem olduğunu yazar ve **n talebi tek siparişe dönüştür** der.
Talep detayında da aynı bayinin diğer açık talepleriyle birleştirme kısayolu vardır.

Dönüştürme kipi kalemleri **ürün bazında gruplar**: her ürün için sipariş toplamı üstte,
o ürünü isteyen talep kalemleri (talep no, tarih, dönüştürülebilir miktar, girilen miktar)
altında listelenir. Böylece "üç talepte toplam 300 metre HB-01 istenmiş" tek bakışta
görünür. Kalemler tek tek çıkarılabilir, miktarları düşürülebilir; girilmeyen miktar
kendi talebinde açık kalır.

Sipariş kalemi her zaman **kendi talep kalemine bağlı** kalır. Bu yüzden altı talebin
altısı da sevkiyat gerçekleştiğinde ayrı ayrı kapanır ve hareket defteri bağlantısı
bozulmaz. Logo tarafında tek fiş açılır, kalem sayısı kadar satır taşır.

Tek sınır: **bir sipariş yalnızca tek bayinin taleplerinden oluşur** — Logo fişi tek cari
kartı taşır, karışık sipariş rezervi bir bayiye, fişi başka bayiye yazardı. İlk seçim
bayiyi sabitler, diğer bayilerin kutuları kapanır ve sebebi kutunun başlığında yazar;
motor da bu kuralı ayrıca doğrular.

### Sipariş oluşturmak = Logo'ya göndermek

Sipariş ayrı bir "Taslak" adımında beklemez. **Siparişe dönüştür** dendiğinde tek bir
işlemde sipariş kaydı yazılır, rezerv hareketi düşülür ve Logo'da sipariş fişi açılır.
Logo fişi açılamazsa işlem tümüyle geri alınır: sipariş oluşmaz, hareket yazılmaz, sayaç
ilerlemez ve talep miktarı açıkta kalır — muhasebe yeniden dener. Dönüştürme kipindeki
"Logo gönderim hatasını simüle et" kutusu bunu demoda gösterir.

Bu yüzden sipariş durumları **Logo'ya İletildi → Faturalandı → Tamamlandı / İptal**
şeklindedir; "Taslak" ve "Gönderim Hatası" durumları kalmadı.

Bunun çalışması için `JP.tx` atomiktir: işlem gövdesi hata atarsa değişikliklerin tamamı
geri alınır. Aksi halde yarım kayıt (talep düşmüş ama sipariş yok) bellekte kalıyordu.

### Bayi adına talep (telefon talebi)

Bayi telefonla arayıp sipariş verdiğinde muhasebe talebi onun adına girer: **Bayiler**
listesinde ya da bayi kartında **Talep oluştur**. Ekran bayi kataloğunun aynısıdır — ürün
ağacı, arama, Liste/Kart, miktar sayacı ve sepete ekleme — ve yalnızca o bayinin kataloğuna
açık ürünleri gösterir. Siparişe kapalı bayide düğme çıkmaz.

Sepet ayrı bir kutuda durur (`firma:<bayiKod>`), bayinin kendi taslak sepetine karışmaz.
Oluşan talep bayi adınadır ancak kaynağı **firma girişi** olarak kaydedilir; talep
listesinde rozet, detayda etiket, hareket defterinde kullanıcı adı olarak görünür ve
Excel çıktısında ayrı sütundur.

### Teslim tarihi

Bayi sepeti onaylarken istediği teslim tarihini opsiyonel olarak girer. Bu tarih talep
listesinde ayrı bir sütun, talep detayında etiket olarak görünür.

Siparişe dönüştürürken **talep edilen teslim tarihi** yine opsiyoneldir: bayinin talebinde
tarih varsa öneri olarak gelir, muhasebe değiştirebilir ya da boş bırakabilir. Girilen tarih
sipariş detayında etiket olarak durur ve sipariş Logo'ya gönderildiğinde fişe taşınır;
Logo simülatöründe fiş başlığında görünür.

Talep ve sipariş listeleri Excel'e kopyalanabilir; iki çıktı da teslim tarihi sütununu taşır.

### Miktar sözlüğü

İki tarafta iki sabit sütun takımı kullanılır; başka miktar adı yoktur.

**Bayi tablolarında ikili:** Talep edilen · Sevk edilen.

**Firma tablolarında dörtlü:** Talep edilen · Siparişe alınan · Sevk edilen · Kalan.

| Sütun | Karşılığı |
| --- | --- |
| Talep edilen | Σ `dTalep` — bayinin istediği |
| Siparişe alınan | Σ `dRezerv`, faturayla çözülen rezerv hariç (kümülatif) |
| Sevk edilen | Σ `dFatura` — fatura kesildiğinde sevkiyat gerçekleşmiş sayılır |
| Kalan | `acik` = talep − rezerv − fatura; henüz siparişe alınmamış miktar |

**Sevk edilen, siparişe alınanın içindedir** — ayrıca düşülmez. Bu yüzden dört sütun alt
alta toplanmaz: 320 talep / 200 siparişe alınan / 200 sevk edilen / 120 kalan satırı
"320 istendi, 200'ü siparişe girdi ve sevk edildi, 120'si hâlâ siparişe alınmadı"
demektir. Talep kalemleri panelinin başlığı bu okuma notunu taşır.

Eski "Bekleyen" (talep − sevk) ve "Dönüştürülebilir" adları kaldırıldı: birincisi siparişe
alınmış miktarı da içerdiği için "ele alınmamış" gibi okunuyordu, ikincisi teknik bir
addı. İkisinin yerini **Kalan** aldı.

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

Bayi tablolarında yalnızca **iki miktar** vardır — bayinin işine yarayan ikili:

| Bayi ne görür | Arkada ne var |
| --- | --- |
| Talep edilen | Σ `dTalep` |
| Sevk edilen | Σ `dFatura` — fatura kesildiğinde sevkiyat gerçekleşmiş sayılır |

Bu iki sayı kalem düzeyindedir; farklı birimler karışmasın diye talep düzeyinde toplanmaz.
Siparişin ne kadarının açıldığı, rezerv ve eşleşme bayiyi ilgilendirmez; bayi talebini
oluşturur ve ne kadarının sevk edildiğini görür.

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

## Belge numaraları

| Belge | Kalıp | Örnek |
| --- | --- | --- |
| Satın alma talebi | `T-<yıl>-<6 hane>` | `T-2026-000004` |
| Sipariş | `S-<yıl>-<6 hane>` | `S-2026-000002` |
| Logo sipariş fişi | `SIP-<yıl>-<6 hane>` | `SIP-2026-000002` |
| Portal referansı | `PORTAL-<sipariş no>` | `PORTAL-S-2026-000002` |

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
