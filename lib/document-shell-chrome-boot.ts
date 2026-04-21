import { THEME_COLOR_DARK, THEME_COLOR_LIGHT_SITE, THEME_STORAGE_KEY } from "@/lib/document-shell-chrome";

/**
 * Синхронный скрипт до гидрации: те же правила и цвета, что в applyDocumentShellChrome.
 * Цвета подставляются из document-shell-chrome.ts — менять hex только там.
 */
export const SHELL_CHROME_BOOT_SCRIPT = `(function(){
function shellChromeBoot(){
var p=typeof location!=='undefined'?location.pathname:'';
var authOnly=p.startsWith('/zayavka')||p.startsWith('/login')||p.startsWith('/register')||p.startsWith('/forgot-password')||p.startsWith('/change-password')||p.startsWith('/reset-password');
var payOnly=p.startsWith('/pay');
var scope=!authOnly&&(p.startsWith('/cabinet')||p.startsWith('/admin')||p.startsWith('/establishment')||payOnly);
var t=scope?localStorage.getItem('${THEME_STORAGE_KEY}'):null;
var eff=authOnly||payOnly?'dark':t==='dark'?'dark':'light';
document.documentElement.setAttribute('data-theme',eff);
document.documentElement.classList.toggle('app-shell-panel',!!scope);
var tc=scope?null:(eff==='dark'?'${THEME_COLOR_DARK}':'${THEME_COLOR_LIGHT_SITE}');
var cs=eff==='dark'?'dark':'light';
var mtcs=document.querySelectorAll('meta[name="theme-color"]');
if(tc===null){
  if(mtcs.length)mtcs.forEach(function(m){m.remove();});
}else{
  var okTc=mtcs.length===1&&mtcs[0].getAttribute('content')===tc&&!mtcs[0].hasAttribute('media');
  if(!okTc){mtcs.forEach(function(m){m.remove();});var mtc=document.createElement('meta');mtc.setAttribute('data-ft-doc-chrome','');mtc.setAttribute('name','theme-color');mtc.setAttribute('content',tc);document.head.appendChild(mtc);}
}
var mcss=document.querySelectorAll('meta[name="color-scheme"]');
var okCs=mcss.length===1&&mcss[0].getAttribute('content')===cs;
if(!okCs){mcss.forEach(function(m){m.remove();});var mcs=document.createElement('meta');mcs.setAttribute('data-ft-doc-chrome','');mcs.setAttribute('name','color-scheme');mcs.setAttribute('content',cs);document.head.appendChild(mcs);}
document.documentElement.style.colorScheme=cs;
}
shellChromeBoot();
if(typeof requestAnimationFrame!=='undefined')requestAnimationFrame(shellChromeBoot);
})();`;
