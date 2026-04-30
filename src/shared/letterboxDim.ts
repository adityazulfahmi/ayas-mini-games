// Phaser draws the end-popup dim *inside* the canvas. On letterboxed mobile
// screens (when both Safari URL bar and toolbar are visible the content area
// becomes wider than the canvas's portrait ratio), the body's background
// shows around the canvas as a bright pink frame next to the dark popup.
//
// Mirror the same dim color/alpha as a body::before that sits *behind* the
// canvas — so the bars dim in lock-step with the popup, while the canvas's
// own bg gradient covers the pseudo-element where it isn't letterboxed.
//
// Toggled by adding/removing the `aya-popup-open` class on <body>.
export function ensureLetterboxDimStyle(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('aya-letterbox-dim-style')) return;
  const s = document.createElement('style');
  s.id = 'aya-letterbox-dim-style';
  s.textContent = `
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background: rgba(45, 27, 61, 0.55);
      pointer-events: none;
      opacity: 0;
      transition: opacity 320ms ease;
      z-index: 0;
    }
    body.aya-popup-open::before { opacity: 1; }
    #game { position: relative; z-index: 1; }
  `;
  document.head.appendChild(s);
}
