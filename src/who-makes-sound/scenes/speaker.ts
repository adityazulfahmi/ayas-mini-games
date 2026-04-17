import Phaser from 'phaser';
import { C } from '@shared/theme';

/**
 * Draws a soft, toy-like speaker glyph: a rounded white cabinet with a
 * cone on the left and three arched sound-waves on the right. Replaces the
 * 🔊 emoji — which renders as a heavy dark-grey icon on macOS — so the
 * element matches the pastel aesthetic of the rest of the game.
 *
 * `scale` is applied to all coordinates so the same helper works for the
 * large bubble on the title and the in-game speaker.
 */
export function drawSpeaker(
  scene: Phaser.Scene,
  cx: number, cy: number,
  scale = 1,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.setPosition(cx, cy);

  const s = scale;
  const cabW = 30 * s, cabH = 42 * s;
  // Cabinet + cone + 3 waves span ~84 units. Offset cabX so the whole
  // composition is centred on (0, 0) — otherwise the waves push it right.
  const cabX = -42 * s, cabY = -cabH / 2;

  // Cabinet — white rounded rect with a soft lavender rim
  g.fillStyle(C.white, 1);
  g.fillRoundedRect(cabX, cabY, cabW, cabH, 6 * s);
  g.lineStyle(2 * s, 0xf06292, 0.2);
  g.strokeRoundedRect(cabX, cabY, cabW, cabH, 6 * s);

  // Cone — triangle flaring right from the cabinet
  g.fillStyle(C.white, 1);
  g.beginPath();
  g.moveTo(cabX + cabW - 1 * s, -20 * s);
  g.lineTo(cabX + cabW - 1 * s,  20 * s);
  g.lineTo(cabX + cabW + 22 * s, 30 * s);
  g.lineTo(cabX + cabW + 22 * s, -30 * s);
  g.closePath();
  g.fillPath();
  g.lineStyle(2 * s, 0xf06292, 0.2);
  g.strokePath();

  // Sound waves — three arcs pulsing to the right, in white so they pop
  // against the pink bubble background.
  g.lineStyle(3 * s, C.white, 1);
  for (let i = 0; i < 3; i++) {
    const r = (10 + i * 9) * s;
    g.beginPath();
    g.arc(cabX + cabW + 26 * s, 0, r, -Math.PI / 3, Math.PI / 3, false);
    g.strokePath();
  }

  return g;
}
