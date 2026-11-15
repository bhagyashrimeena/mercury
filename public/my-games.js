import { savedLoadingMarkup } from './loading-ui.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// Saved games are optional on the dashboard. Their loading and retries must not
// replace a player's confirmed registrations or refresh unrelated services.
export function savedGamesLoader({ container, label, load, render, isCurrent }) {
  let pending = false;
  return async function refresh(retry = false) {
    if (pending || !isCurrent()) return;
    pending = true;
    container.setAttribute('aria-busy', 'true');
    container.innerHTML = savedLoadingMarkup(label.toLowerCase());
    if (retry) container.focus({ preventScroll: true });
    try {
      const result = await load();
      if (!isCurrent()) return;
      container.innerHTML = render(result);
    } catch {
      if (!isCurrent()) return;
      container.innerHTML = `<div class="saved-games-recovery"><p><b>${esc(label)} couldn’t load.</b></p><p>Your confirmed places and updates are still available on this page.</p><button class="button outline" type="button" data-retry-saved>Retry ${esc(label.toLowerCase())} ↻</button></div>`;
      container.querySelector('[data-retry-saved]').onclick = () => refresh(true);
    } finally {
      pending = false;
      if (isCurrent()) container.setAttribute('aria-busy', 'false');
    }
  };
}
