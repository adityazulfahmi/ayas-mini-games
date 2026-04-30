// Phaser leaves the canvas black until a scene runs `drawBg`. On heavier
// games (e.g. Who's That, Aya?) that boot window is long enough on mobile
// that the user sees a black box surrounded by the body's pastel bars.
//
// `mountLoading` paints a full-screen pastel cover with a bouncing flower
// the moment the JS evaluates, and `dismissLoading` fades it out once
// Phaser has rendered its first frame. Together with Phaser's canvas
// `backgroundColor` matching the gradient's top stop, the user only ever
// sees pastel — never the black canvas.

const LOADING_ID = 'aya-loading';
const STYLE_ID = 'aya-loading-style';
const HIDE_CLASS = 'aya-loading-hide';

export function mountLoading(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(LOADING_ID)) return;

  ensureStyle();

  const el = document.createElement('div');
  el.id = LOADING_ID;
  el.innerHTML = `
    <div class="aya-loading-emoji">🌸</div>
    <div class="aya-loading-text">Loading<span>.</span><span>.</span><span>.</span></div>
  `;

  if (document.body) {
    document.body.appendChild(el);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (!document.getElementById(LOADING_ID)) document.body.appendChild(el);
    }, { once: true });
  }
}

export function dismissLoading(): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(LOADING_ID);
  if (!el) return;
  el.classList.add(HIDE_CLASS);
  setTimeout(() => el.remove(), 420);
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    #${LOADING_ID} {
      position: fixed;
      inset: 0;
      background: linear-gradient(180deg, #fce4ec 0%, #ede7f6 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 22px;
      z-index: 9999;
      transition: opacity 380ms ease;
    }
    #${LOADING_ID}.${HIDE_CLASS} { opacity: 0; pointer-events: none; }
    #${LOADING_ID} .aya-loading-emoji {
      font-size: 78px;
      animation: aya-loading-bounce 1.1s ease-in-out infinite;
      filter: drop-shadow(0 6px 18px rgba(156,77,204,0.22));
    }
    #${LOADING_ID} .aya-loading-text {
      font-family: 'Fredoka One', system-ui, sans-serif;
      font-size: 22px;
      color: #6a1b9a;
      letter-spacing: 0.05em;
      text-shadow: 1px 2px 0 rgba(248,187,208,0.55);
    }
    #${LOADING_ID} .aya-loading-text span {
      display: inline-block;
      animation: aya-loading-dot 1.2s ease-in-out infinite;
    }
    #${LOADING_ID} .aya-loading-text span:nth-child(2) { animation-delay: 0.18s; }
    #${LOADING_ID} .aya-loading-text span:nth-child(3) { animation-delay: 0.36s; }
    @keyframes aya-loading-bounce {
      0%, 100% { transform: translateY(0) scale(1); }
      50%      { transform: translateY(-14px) scale(1.05); }
    }
    @keyframes aya-loading-dot {
      0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
      30%           { opacity: 1;    transform: translateY(-3px); }
    }
  `;
  document.head.appendChild(s);
}
