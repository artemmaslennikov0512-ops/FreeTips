/**
 * Куда отправлять скрытую POST-форму на SDPayOutPage после async fetch.
 * На мобильных WebKit/Chromium часто блокируют target=_blank без синхронного user gesture —
 * форма не открывается, а заявка на сервере уже создана.
 */
export function getPayginePayoutFormTarget(): "_blank" | "_self" {
  if (typeof navigator === "undefined") return "_self";
  const ua = navigator.userAgent ?? "";
  if (/Mobi|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return "_self";
  }
  return "_blank";
}
