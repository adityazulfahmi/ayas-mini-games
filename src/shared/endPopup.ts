import Phaser from 'phaser';
import { C, T, F } from './theme';

export interface EndPopupData {
  emoji: string;
  title: string;
  subtitle: string;
  score?: { value: string | number; label: string };
  stars?: { earned: number; total?: number };
  highlight?: boolean;
}

/**
 * End-of-game popup offers three navigation options that map to the three
 * places a player might want to go after a round:
 *   - Again     → replay the current round with the same config
 *   - Home      → back to this game's title/landing scene
 *   - All Games → back to the root landing page that lists every game
 * All three are required so every game's end screen looks and behaves
 * the same way.
 */
export interface EndPopupOptions {
  onPlayAgain: () => void;
  onHome: () => void;
  onAllGames: () => void;
  playAgainLabel?: string;
  homeLabel?: string;
  allGamesLabel?: string;
}

export interface EndPopup {
  overlay: Phaser.GameObjects.Container;
  show: (data: EndPopupData) => void;
  hide: () => void;
}

const CARD_W = 320;
const CARD_H = 500;
const PADDING = 24;

// Y offsets from the card's vertical center (origin). Negative = above center.
const Y_EMOJI    = -CARD_H / 2 + 72;
const Y_TITLE    = -CARD_H / 2 + 170;
const Y_SUBTITLE = -CARD_H / 2 + 208;
const Y_STARS    = -CARD_H / 2 + 282;
const Y_SCORE    = -CARD_H / 2 + 352;
const Y_BUTTONS  =  CARD_H / 2 - 70;
const Y_FOOTER   =  CARD_H / 2 - 22;

export function createEndPopup(
  scene: Phaser.Scene,
  sceneW: number,
  sceneH: number,
  opts: EndPopupOptions,
): EndPopup {
  const dim = scene.add.graphics();
  dim.fillStyle(0x2d1b3d, 0.55);
  dim.fillRect(-sceneW / 2, -sceneH / 2, sceneW, sceneH);
  const dimHit = scene.add.zone(0, 0, sceneW, sceneH).setInteractive();

  // Card shadow + card
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x4a148c, 0.28);
  shadow.fillRoundedRect(-CARD_W / 2 + 4, -CARD_H / 2 + 14, CARD_W, CARD_H, 32);

  const card = scene.add.graphics();
  card.fillStyle(C.white, 1);
  card.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 32);

  // Soft pink accent at top of card
  const accent = scene.add.graphics();
  accent.fillStyle(C.bg1, 1);
  accent.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, 140, {
    tl: 32, tr: 32, bl: 0, br: 0,
  });

  const emojiTxt = scene.add.text(0, Y_EMOJI, '', { fontSize: '64px' }).setOrigin(0.5);

  const titleTxt = scene.add.text(0, Y_TITLE, '', {
    fontFamily: F.head, fontSize: '28px', color: T.main, align: 'center',
    wordWrap: { width: CARD_W - PADDING * 2 },
  }).setOrigin(0.5);

  const subTxt = scene.add.text(0, Y_SUBTITLE, '', {
    fontFamily: F.body, fontSize: '14px', color: T.sub,
    fontStyle: 'bold', align: 'center',
    wordWrap: { width: CARD_W - PADDING * 2 },
  }).setOrigin(0.5);

  // Star row (reserved — shown only if stars provided)
  const stars: Phaser.GameObjects.Text[] = [0, 1, 2].map(i =>
    scene.add.text((i - 1) * 52, Y_STARS, '', { fontSize: '40px' }).setOrigin(0.5),
  );

  // Score pill (reserved — shown only if score provided)
  const scorePill = scene.add.graphics();
  const scoreValueTxt = scene.add.text(0, Y_SCORE - 6, '', {
    fontFamily: F.head, fontSize: '28px', color: T.main,
  }).setOrigin(0.5);
  const scoreLabelTxt = scene.add.text(0, Y_SCORE + 18, '', {
    fontFamily: F.body, fontSize: '10px', color: T.sub, fontStyle: 'bold',
  }).setOrigin(0.5);

  // Three-button row: Again · Home · All Games
  const btnY = Y_BUTTONS;
  const btnW = 90;
  const btnH = 48;
  const btnGap = 6;
  const totalBtnW = btnW * 3 + btnGap * 2;
  const firstBtnCx = -totalBtnW / 2 + btnW / 2;

  const againBtn = makePrimaryButton(
    scene,
    firstBtnCx,
    btnY,
    btnW, btnH,
    opts.playAgainLabel ?? 'Again',
  );

  const homeBtn = makeOutlineButton(
    scene,
    firstBtnCx + (btnW + btnGap),
    btnY,
    btnW, btnH,
    opts.homeLabel ?? '🏠 Home',
  );

  const allGamesBtn = makeOutlineButton(
    scene,
    firstBtnCx + (btnW + btnGap) * 2,
    btnY,
    btnW, btnH,
    opts.allGamesLabel ?? '🎮 Games',
  );

  // Footer signature line
  const footer = scene.add.text(0, Y_FOOTER, '🌸 Dari papa Ami untuk Aya 💖', {
    fontFamily: F.body, fontSize: '11px', color: T.sub, fontStyle: 'bold',
  }).setOrigin(0.5);

  const parts: Phaser.GameObjects.GameObject[] = [
    dim, dimHit, shadow, card, accent,
    emojiTxt, titleTxt, subTxt,
    scorePill, scoreValueTxt, scoreLabelTxt,
    ...stars,
    againBtn.container,
    homeBtn.container,
    allGamesBtn.container,
    footer,
  ];
  const overlay = scene.add.container(sceneW / 2, sceneH / 2, parts);
  overlay.setVisible(false).setDepth(100);

  againBtn.zone.on('pointerdown', opts.onPlayAgain);
  homeBtn.zone.on('pointerdown', opts.onHome);
  allGamesBtn.zone.on('pointerdown', opts.onAllGames);

  function show(data: EndPopupData): void {
    emojiTxt.setText(data.emoji);
    titleTxt.setText(data.title);
    subTxt.setText(data.subtitle);

    // Score pill
    if (data.score) {
      drawScorePill(scorePill, Y_SCORE);
      scoreValueTxt.setText(String(data.score.value)).setVisible(true);
      scoreLabelTxt.setText(data.score.label.toUpperCase()).setVisible(true);
    } else {
      scorePill.clear();
      scoreValueTxt.setVisible(false);
      scoreLabelTxt.setVisible(false);
    }

    // Stars
    if (data.stars) {
      const total = data.stars.total ?? 3;
      stars.forEach((s, i) => {
        if (i < total) {
          s.setText(i < data.stars!.earned ? '⭐' : '🌑').setVisible(true);
        } else {
          s.setVisible(false);
        }
      });
    } else {
      stars.forEach(s => s.setVisible(false));
    }

    overlay.setVisible(true).setScale(0.85).setAlpha(0);
    scene.tweens.add({
      targets: overlay, scale: 1, alpha: 1,
      duration: 320, ease: 'Back.Out',
    });
    // Emoji bounce after card settles
    emojiTxt.setScale(0);
    scene.tweens.add({
      targets: emojiTxt, scale: 1,
      delay: 180, duration: 420, ease: 'Back.Out',
    });
    // Stars pop in sequentially
    if (data.stars) {
      stars.forEach((s, i) => {
        if (!s.visible) return;
        s.setScale(0);
        scene.tweens.add({
          targets: s, scale: 1, angle: { from: -25, to: 0 },
          delay: 320 + i * 110, duration: 360, ease: 'Back.Out',
        });
      });
    }
  }

  function hide(): void {
    overlay.setVisible(false);
  }

  return { overlay, show, hide };
}

function drawScorePill(g: Phaser.GameObjects.Graphics, y: number): void {
  g.clear();
  const w = 200, h = 56;
  g.fillStyle(C.bg1, 1);
  g.fillRoundedRect(-w / 2, y - h / 2 + 6, w, h, 18);
  g.lineStyle(2, C.lavender, 0.5);
  g.strokeRoundedRect(-w / 2, y - h / 2 + 6, w, h, 18);
}

function makePrimaryButton(
  scene: Phaser.Scene,
  x: number, y: number, w: number, h: number,
  label: string,
): { container: Phaser.GameObjects.Container; zone: Phaser.GameObjects.Zone } {
  const bg = scene.add.graphics();
  bg.fillStyle(C.pink, 1);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
  const txt = scene.add.text(0, 0, label, {
    fontFamily: F.head, fontSize: '15px', color: T.white,
  }).setOrigin(0.5);
  const zone = scene.add.zone(0, 0, w, h).setInteractive({ cursor: 'pointer' });
  const container = scene.add.container(x, y, [bg, txt, zone]);
  container.setSize(w, h);
  zone.on('pointerover', () => scene.tweens.add({ targets: container, scale: 1.04, duration: 120 }));
  zone.on('pointerout',  () => scene.tweens.add({ targets: container, scale: 1, duration: 120 }));
  return { container, zone };
}

function makeOutlineButton(
  scene: Phaser.Scene,
  x: number, y: number, w: number, h: number,
  label: string,
): { container: Phaser.GameObjects.Container; zone: Phaser.GameObjects.Zone } {
  const bg = scene.add.graphics();
  bg.fillStyle(C.white, 1);
  bg.lineStyle(2, C.lavender, 1);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
  const txt = scene.add.text(0, 0, label, {
    fontFamily: F.head, fontSize: '14px', color: T.main,
  }).setOrigin(0.5);
  const zone = scene.add.zone(0, 0, w, h).setInteractive({ cursor: 'pointer' });
  const container = scene.add.container(x, y, [bg, txt, zone]);
  container.setSize(w, h);
  zone.on('pointerover', () => scene.tweens.add({ targets: container, scale: 1.04, duration: 120 }));
  zone.on('pointerout',  () => scene.tweens.add({ targets: container, scale: 1, duration: 120 }));
  return { container, zone };
}
