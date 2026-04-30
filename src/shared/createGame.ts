import Phaser from 'phaser';
import { F } from './theme';
import { ensureLetterboxDimStyle } from './letterboxDim';
import { mountLoading, dismissLoading } from './loadingScreen';

/**
 * Wait for Fredoka One + Nunito to actually be usable before booting Phaser.
 * `document.fonts.ready` resolves when the FontFaceSet is idle, which can be
 * *before* the CSS-declared web fonts have been fetched. That causes the first
 * scene's titles to render in the generic `cursive` / `sans-serif` fallback,
 * baked into a texture that never refreshes. Explicitly `.load()` the families
 * we actually use, then boot.
 */
export async function waitForFonts(): Promise<void> {
  // Show the loading cover before we even await fonts — heavy games
  // (e.g. Who's That, Aya?) sit on a black canvas otherwise.
  mountLoading();
  if (!document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load('1em "Fredoka One"'),
      document.fonts.load('600 1em "Nunito"'),
      document.fonts.load('700 1em "Nunito"'),
    ]);
  } catch { /* offline / blocked — fall back to system fonts */ }
}

/**
 * Create a Phaser game that stays crisp on Retina / high-DPR screens.
 *
 * Scene code keeps its logical coordinate space (e.g. 420×800) and Phaser's
 * Scale.FIT handles layout for different screen sizes. The one retina tweak
 * is text: Phaser rasterises text to a texture at its raw font size, so on a
 * 2× display the upscale looks soft. We monkey-patch the scene text factory
 * to set `resolution = DPR`, which generates the text bitmap at native
 * pixel density. Graphics shapes render via WebGL primitives and don't need
 * the same treatment.
 */
export function createGame(
  width: number,
  height: number,
  scenes: Phaser.Types.Scenes.SceneType[],
  extra: Partial<Phaser.Types.Core.GameConfig> = {},
): Phaser.Game {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  patchTextResolutionOnce(dpr);
  ensureLetterboxDimStyle();

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game',
    // Pink clear color so any frame rendered before the first scene's
    // drawBg() runs already blends with the body gradient instead of
    // flashing the WebGL default black.
    backgroundColor: '#fce4ec',
    render: { antialias: true, pixelArt: false, roundPixels: false },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width,
      height,
    },
    scene: scenes,
    ...extra,
  };

  const game = new Phaser.Game(config);
  // Fade the loading cover after Phaser is fully booted plus one frame,
  // so by the time the cover starts fading the title scene's bg has
  // already painted underneath.
  game.events.once(Phaser.Core.Events.READY, () => {
    requestAnimationFrame(() => requestAnimationFrame(dismissLoading));
  });
  if (import.meta.env?.DEV) {
    (window as unknown as { __game: Phaser.Game }).__game = game;
  }
  return game;
}

let textPatched = false;
function patchTextResolutionOnce(dpr: number): void {
  if (textPatched) return;
  textPatched = true;
  const Factory = Phaser.GameObjects.GameObjectFactory.prototype;
  const origText = Factory.text;
  Factory.text = function patched(this: Phaser.GameObjects.GameObjectFactory, ...args: Parameters<typeof origText>) {
    const t = origText.apply(this, args);
    t.setResolution(dpr);
    // Phaser's default fontFamily is 'Courier' (monospace serif fallback).
    // Any text created without an explicit family should render in Nunito so
    // the whole game feels consistent.
    if (t.style.fontFamily === 'Courier' || t.style.fontFamily === '"Courier"') {
      t.setFontFamily(F.body);
    }
    return t;
  };
}
