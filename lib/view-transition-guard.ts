/**
 * Page transitions (components/page-transition.tsx) run on Chromium (most
 * Android phones, Chrome and Edge on laptops) and Firefox, never on WebKit
 * (Safari, and every browser on an iPhone): in testing, WebKit's page
 * crashed during these view transitions. This inline script, in the root
 * layout before any navigation can happen, removes
 * `document.startViewTransition` there; React then swaps pages without one
 * (its call is guarded), exactly as on a browser without View Transitions.
 */
export const VIEW_TRANSITION_GUARD_SCRIPT = `(function(){var u=navigator.userAgent;
if(/AppleWebKit/.test(u)&&!/(Chrome|Chromium|Edg)[/]/.test(u)&&"startViewTransition" in document){
try{delete Document.prototype.startViewTransition}catch(e){}
try{document.startViewTransition=undefined}catch(e){}}})();`;
