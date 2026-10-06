const REMOTE_ATTEMPT_ATTR = 'data-flag-fallback';

/**
 * `(error)` handler for plain flag `<img>` tags: bundled SVG → FlagCDN PNG → hide.
 * Keeps the feed cards from showing a broken-image icon with alt text.
 */
export function onFlagImgError(event: Event, iso2: string): void {
  const img = event.target as HTMLImageElement | null;
  if (!img) {
    return;
  }
  const code = (iso2 ?? '').trim().toLowerCase();
  if (!img.hasAttribute(REMOTE_ATTEMPT_ATTR) && /^[a-z]{2}$/.test(code)) {
    img.setAttribute(REMOTE_ATTEMPT_ATTR, '1');
    img.src = `https://flagcdn.com/w640/${code}.png`;
    return;
  }
  img.style.visibility = 'hidden';
}
