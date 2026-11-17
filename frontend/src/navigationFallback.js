// ReliefLink navigation stability fallback.
// The reported build rendered each URL correctly after refresh but showed a
// blank React root when navigating client-side. Until the underlying browser-
// specific React crash is identified, load same-origin page links as normal
// document navigations. The Node backend already serves index.html for routes.
// This does not affect forms, in-page filters, map controls, or API requests.
export function installNavigationFallback() {
  if (typeof document === 'undefined') return;
  document.addEventListener('click', (event) => {
    // Preserve open-in-new-tab, downloads, external links, and handled clicks.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest('a[href]');
    if (!link || link.hasAttribute('download') ||
        (link.target && link.target !== '_self')) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    // Same-page hash navigation should keep normal browser behavior.
    if (url.pathname === window.location.pathname &&
        url.search === window.location.search && url.hash) return;
    // Capture before React Router's synthetic Link handler gets the click.
    event.preventDefault();
    event.stopPropagation();
    window.location.assign(url.href);
  }, true);
}
