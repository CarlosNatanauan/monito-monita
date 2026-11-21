/**
 * The offline banner (docs/DESIGN.md, "In-between states"), as a small
 * inline script in the root layout rather than a React component:
 *
 * - it works before hydration and on a page whose JS never arrived (a slow
 *   phone losing signal mid-load), and costs no JS file on the join page
 *   and /me (150 KB budget; a client component here was a 1.1 KB chunk);
 * - on the browser's `offline` event: a paper strip at the bottom, "Offline
 *   ka. Itutuloy namin ang ginagawa mo pagbalik ng signal." On `online`:
 *   "Balik na ang signal!" for 3 seconds, then gone.
 *
 * Requests that fail while the browser still says it's online are covered
 * by the buttons: with experimental.useOffline those actions wait and run
 * again, and their labels say "Hinihintay ang signal…" (lib/use-pending-label.ts).
 *
 * The strip is a polite live region added to <body> once the page has
 * loaded (React 19 skips unknown nodes in <body> when hydrating). Styled
 * by `.mm-offline` in app/globals.css.
 */
export const OFFLINE_BANNER_SCRIPT = `(function(){
var box,timer;
function el(){if(!box){box=document.createElement("div");box.className="mm-offline";box.setAttribute("role","status");box.setAttribute("data-offline-banner","");box.setAttribute("data-overlap-ok","");document.body.appendChild(box)}return box}
function show(state){var b=el();clearTimeout(timer);b.setAttribute("data-state",state);
b.innerHTML=state==="offline"?'<p><i class="mm-bulb"></i><span><b>Offline ka.</b> Itutuloy namin ang ginagawa mo pagbalik ng signal.</span></p>':state==="back"?'<p><i class="mm-bulb mm-lit"></i><b class="mm-back">Balik na ang signal!</b></p>':"";
if(state==="back")timer=setTimeout(function(){show("")},3000)}
addEventListener("offline",function(){show("offline")});
addEventListener("online",function(){if(box&&box.getAttribute("data-state")==="offline")show("back")});
function ready(){el();if(navigator.onLine===false)show("offline")}
if(document.readyState==="complete")ready();else addEventListener("load",ready);
})();`;
