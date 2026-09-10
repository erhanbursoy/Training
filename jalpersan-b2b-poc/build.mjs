/* Tek dosya derleyici.
 * Kaynak: index.html + assets/*  →  dist/jalpersan-poc.html  (çift tıklanan tek dosya)
 *                                →  dist/artifact.html       (Artifact yayını için gövde parçası)
 * Tek dosya sürümünde roller aynı sayfada, üst çubuktaki seçiciyle değişir;
 * sekme başına rol sessionStorage'da, veri localStorage'da tutulur.        */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const oku = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const css = oku('assets/style.css');
const js = ['katalog', 'gorseller', 'marka', 'core', 'ui', 'bayi', 'firma', 'logo'].map((f) => oku(`assets/${f}.js`)).join('\n');

const index = oku('index.html');
const indexCss = index.match(/<style>([\s\S]*?)<\/style>/)[1];
const girisHtml = index.match(/<div class="wrap">([\s\S]*?)<\/div>\s*<script src="assets\/(?:katalog|gorseller|core)\.js">/)[1];

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500' +
  '&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" media="print" onload="this.media=\'all\'">';

const EK_CSS = `
  .wrap { max-width: 1080px; margin: 0 auto; padding: 30px 22px 72px; }
  .rol-sec { display: inline-flex; border: 1px solid var(--line-2); border-radius: 7px; overflow: hidden; }
  .rol-sec button { font: inherit; font-size: 12.5px; padding: 5px 11px; border: 0; background: var(--surface); color: var(--text-2); cursor: pointer; }
  .rol-sec button + button { border-left: 1px solid var(--line-2); }
  .rol-sec button[aria-pressed="true"] { background: var(--accent); color: #fff; font-weight: 500; }
  .logo-world .rol-sec button[aria-pressed="true"] { color: #201704; }
  .giris-ipucu { margin: 18px 0 0; }
`;

const kacir = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const ONYUKLEME = `
(function () {
  'use strict';
  var GIRIS_HTML = \`${kacir(girisHtml)}\`;
  var ROLLER = [
    { id: 'giris', ad: 'Giriş' },
    { id: 'bayi', ad: 'Bayi' },
    { id: 'firma', ad: 'Firma' },
    { id: 'logo', ad: 'Logo' }
  ];

  function rol() {
    var hash = (location.hash || '').replace('#', '');
    if (ROLLER.some(function (r) { return r.id === hash; })) { sessionStorage.setItem('jp.rol', hash); return hash; }
    return sessionStorage.getItem('jp.rol') || 'giris';
  }
  function rolAyarla(r) {
    sessionStorage.setItem('jp.rol', r);
    if (location.hash) { history.replaceState(null, '', location.pathname + location.search); }
    ciz();
  }
  JP.rolAyarla = rolAyarla;

  JP.rolSecici = function () {
    var su = rol();
    return JP.UI.h('div.rol-sec', { role: 'group', 'aria-label': 'Rol seç' }, ROLLER.map(function (r) {
      return JP.UI.h('button', {
        'aria-pressed': String(r.id === su), text: r.ad,
        onclick: function () { rolAyarla(r.id); }
      });
    }));
  };

  function yeniSekme(hedefRol) {
    var p = window.open(location.href.split('#')[0] + '#' + hedefRol, '_blank');
    if (!p) {
      JP.UI.toast('Sekme açılamadı',
        'Tarayıcı yeni sekmeyi engelledi. Bu sayfanın adresini yeni bir sekmede açıp üstteki seçiciden rolü değiştirin — veriyi paylaşırlar.', 'bad');
    }
  }

  function giris() {
    var kok = document.getElementById('app');
    document.documentElement.classList.remove('logo-world');
    if (JP.aboneSifirla) JP.aboneSifirla();
    kok.innerHTML = '<div class="wrap">' + GIRIS_HTML + '</div>';

    kok.querySelectorAll('a.role').forEach(function (a) {
      var hedef = (a.getAttribute('href') || '').replace('.html', '');
      a.setAttribute('href', '#' + hedef);
      a.addEventListener('click', function (e) { e.preventDefault(); rolAyarla(hedef); });
      var git = a.querySelector('.go');
      if (git) git.textContent = git.textContent.replace('penceresini aç', 'ekranına geç').replace('Bayi pencereyi', 'Bayi');
    });

    var marka = kok.querySelector('#marka');
    if (marka) marka.appendChild(JP.UI.marka());

    var d = JP.db;
    kok.querySelector('#durum').textContent =
      d.urunler.length + ' ürün · ' + d.bayiler.length + ' bayi · ' + d.talepler.length +
      ' talep · ' + d.siparisler.length + ' sipariş · ' + d.havuz.length + ' havuz hareketi';

    var hepsi = kok.querySelector('#hepsi');
    hepsi.textContent = 'Bayi ve Logo ekranlarını yeni sekmede aç';
    hepsi.addEventListener('click', function () {
      yeniSekme('bayi');
      setTimeout(function () { yeniSekme('logo'); }, 250);
      setTimeout(function () { rolAyarla('firma'); }, 500);
    });
    kok.querySelector('#bastan').addEventListener('click', function () {
      JP.UI.onay('Demoyu baştan başlat',
        'Portal tarafı (ürün, bayi, talep, sipariş, havuz) boşaltılır. Logo simülatöründeki stok ve cari kartlar kalır.',
        function () { JP.sifirla(true); ciz(); }, true);
    });
    kok.querySelector('#ornek').addEventListener('click', function () {
      JP.UI.onay('Örnek veriye dön', 'Tüm PoC verisi silinip başlangıç örneğine dönülür.',
        function () { JP.sifirla(false); ciz(); }, true);
    });

    kok.querySelector('.wrap').insertBefore(
      JP.UI.h('div.note.giris-ipucu', {
        html: '<b>Üç ekranı yan yana görmek için:</b> bu sayfayı iki sekmede daha açın ve her sekmede üstteki seçiciden ' +
              'farklı bir rol seçin. Sekmeler aynı veriyi paylaşır; birinde yaptığınız işlem diğerlerine anında yansır.'
      }),
      kok.querySelector('.roles')
    );
  }

  function ciz() {
    var r = rol();
    if (r === 'bayi') JP.bayiEkran();
    else if (r === 'firma') JP.firmaEkran();
    else if (r === 'logo') JP.logoEkran();
    else giris();
  }

  window.addEventListener('hashchange', ciz);
  ciz();
})();
`;

const govde = `<title>Jalpersan B2B Prototipi</title>
${FONTS}
<style>
${css}
${indexCss}
${EK_CSS}
</style>
<div id="app"></div>
<script>
${js}
</script>
<script>
${ONYUKLEME}
</script>`;

mkdirSync(new URL('dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('dist/artifact.html', import.meta.url), govde);
writeFileSync(new URL('dist/jalpersan-poc.html', import.meta.url),
  `<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
  `<meta name="description" content="Jalpersan B2B bayi satın alma talep portalı prototipi — bayi, firma ve Logo ERP simülatörü tek dosyada.">\n` +
  `${govde}\n</body>\n</html>\n`.replace('<div id="app"></div>', '</head>\n<body>\n<div id="app"></div>'));

const kb = (u) => Math.round(readFileSync(new URL(u, import.meta.url)).length / 1024);
console.log(`dist/jalpersan-poc.html  ${kb('dist/jalpersan-poc.html')} KB`);
console.log(`dist/artifact.html       ${kb('dist/artifact.html')} KB`);
