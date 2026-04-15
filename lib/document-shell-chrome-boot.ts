import {
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT_PANEL,
  THEME_COLOR_LIGHT_SITE,
  THEME_STORAGE_KEY,
} from "@/lib/document-shell-chrome";

/**
 * Синхронный скрипт до гидрации: те же правила и цвета, что в applyDocumentShellChrome.
 * Цвета подставляются из document-shell-chrome.ts — менять hex только там.
 */
export const SHELL_CHROME_BOOT_SCRIPT = `(function(){
var p=typeof location!=='undefined'?location.pathname:'';
var authOnly=p.startsWith('/zayavka')||p.startsWith('/login')||p.startsWith('/register')||p.startsWith('/forgot-password')||p.startsWith('/change-password')||p.startsWith('/reset-password');
var scope=!authOnly&&(p.startsWith('/cabinet')||p.startsWith('/admin')||p.startsWith('/establishment')||p.startsWith('/pay'));
var t=authOnly?'dark':scope?localStorage.getItem('${THEME_STORAGE_KEY}'):null;
document.documentElement.setAttribute('data-theme',authOnly?'dark':t==='dark'?'dark':'light');
document.documentElement.classList.toggle('app-shell-panel',!!scope);
var eff=document.documentElement.getAttribute('data-theme');
var tc=eff==='dark'?'${THEME_COLOR_DARK}':scope?'${THEME_COLOR_LIGHT_PANEL}':'${THEME_COLOR_LIGHT_SITE}';
document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.removeAttribute('media');m.setAttribute('content',tc);});
document.documentElement.style.colorScheme=eff==='dark'?'dark':'light';
})();`;
