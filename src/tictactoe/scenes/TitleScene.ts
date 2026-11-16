import Phaser from 'phaser';
import { drawBg } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { W, P, Mode, BOT_NAME, loadNames, saveNames, say, softCard, sparkle, placeSound } from './helpers';

export class TitleScene extends Phaser.Scene {
  private input1!: Phaser.GameObjects.DOMElement;
  private input2!: Phaser.GameObjects.DOMElement;
  private previewPieces: Phaser.GameObjects.Text[] = [];
  private previewLine!: Phaser.GameObjects.Graphics;
  private starting = false;

  constructor() { super('TitleScene'); }

  create(): void {
    drawBg(this);
    this.previewPieces = [];
    this.starting = false;

    this.add.text(W / 2, 92, "Aya's\nTic-Tac-Toe", {
      fontFamily: F.head, fontSize: '42px', color: T.main, align: 'center', lineSpacing: -4,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 164, 'Kitty and Bunny take turns.\nThree in a row wins! ✨', {
      fontFamily: F.body, fontSize: '15px', color: T.sub, fontStyle: 'bold', align: 'center', lineSpacing: 3,
    }).setOrigin(0.5);

    this.buildPreview(W / 2, 302);
    this.buildNames(458);

    this.modeButton(580, 'bot', true, '🤖  Play with Papa-bot', '1 player · you are Kitty 🐱');
    this.modeButton(686, 'duo', false, '🐱 vs 🐰  Two players', 'Take turns with Papa');
  }

  // ---------------------------------------------------------------- preview

  /** Mini board that plays a little loop: pieces hop in, then Kitty's diagonal lights up. */
  private buildPreview(cx: number, cy: number): void {
    const cell = 54, gap = 7, size = cell * 3 + gap * 2, pad = 10;
    const g = this.add.graphics();
    softCard(g, cx - size / 2 - pad, cy - size / 2 - pad, size + pad * 2, size + pad * 2, 22, C.white, C.lavender, 2);
    const centers: { x: number; y: number }[] = [];
    for (let i = 0; i < 9; i++) {
      const x = cx - size / 2 + (i % 3) * (cell + gap) + cell / 2;
      const y = cy - size / 2 + Math.floor(i / 3) * (cell + gap) + cell / 2;
      centers.push({ x, y });
      g.fillStyle(0xfff3f8, 1);
      g.fillRoundedRect(x - cell / 2, y - cell / 2, cell, cell, 12);
      const t = this.add.text(x, y + 1, '', { fontSize: '32px' }).setOrigin(0.5).setScale(0);
      this.previewPieces.push(t);
    }
    this.previewLine = this.add.graphics();

    // Sequence of [cell, player]; Kitty wins on the 0-4-8 diagonal.
    const seq: [number, 1 | 2][] = [[4, 1], [2, 2], [0, 1], [6, 2], [8, 1]];
    const a = centers[0], b = centers[8];
    const play = () => {
      this.previewLine.clear();
      this.previewPieces.forEach((p, i) => p.setText('').setScale(0).setY(centers[i].y + 1));
      seq.forEach(([i, who], n) => {
        this.time.delayedCall(500 + n * 520, () => {
          const p = this.previewPieces[i];
          p.setText(P[who].emoji).setScale(0);
          this.tweens.add({ targets: p, scale: 1, duration: 340, ease: 'Back.Out' });
        });
      });
      this.time.delayedCall(500 + seq.length * 520 + 200, () => {
        const ext = 22;
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const sx = a.x - ux * ext, sy = a.y - uy * ext;
        const total = len + ext * 2;
        this.tweens.addCounter({
          from: 0, to: 1, duration: 420, ease: 'Cubic.Out',
          onUpdate: tw => {
            const v = tw.getValue() ?? 0;
            const ex = sx + ux * total * v, ey = sy + uy * total * v;
            this.previewLine.clear();
            this.previewLine.lineStyle(10, C.pink, 0.85);
            this.previewLine.lineBetween(sx, sy, ex, ey);
            this.previewLine.lineStyle(3, C.white, 0.7);
            this.previewLine.lineBetween(sx, sy, ex, ey);
          },
        });
        [0, 4, 8].forEach((i, n) => this.tweens.add({
          targets: this.previewPieces[i], y: centers[i].y - 7, yoyo: true, repeat: 2,
          duration: 220, delay: 300 + n * 90, ease: 'Sine.Out',
        }));
      });
    };
    play();
    this.time.addEvent({ delay: 6000, loop: true, callback: play });
  }

  // ---------------------------------------------------------------- names

  private buildNames(y: number): void {
    const saved = loadNames();
    const colX = [W / 2 - 98, W / 2 + 98];

    ([1, 2] as const).forEach((p, idx) => {
      const who = P[p];
      this.add.text(colX[idx], y - 34, `${who.emoji} ${who.animal}'s name`, {
        fontFamily: F.body, fontSize: '14px', color: who.text, fontStyle: 'bold',
      }).setOrigin(0.5);
    });

    const inputStyle = [
      "font-family: 'Nunito', sans-serif",
      'font-size: 17px',
      'font-weight: 700',
      'color: #6a1b9a',
      'text-align: center',
      'padding: 9px 10px',
      'border: 2.5px solid #e1bee7',
      'border-radius: 16px',
      'background: white',
      'outline: none',
      'width: 150px',
      'box-sizing: border-box',
      'box-shadow: 0 3px 10px rgba(156,77,204,0.12)',
      'transition: border-color 0.2s',
    ].join(';');

    const make = (x: number, placeholder: string, value: string, focus: string) => {
      const dom = this.add.dom(x, y, 'input', inputStyle).setOrigin(0.5);
      const el = dom.node as HTMLInputElement;
      el.placeholder = placeholder;
      el.maxLength = 10;
      el.value = value;
      el.addEventListener('focus', () => { el.style.borderColor = focus; });
      el.addEventListener('blur', () => { el.style.borderColor = '#e1bee7'; });
      el.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') el.blur(); });
      return dom;
    };
    this.input1 = make(colX[0], P[1].animal, saved[0], '#f06292');
    this.input2 = make(colX[1], P[2].animal, saved[1], '#ab47bc');
  }

  // ---------------------------------------------------------------- mode buttons

  private modeButton(y: number, mode: Mode, primary: boolean, label: string, sub: string): void {
    const w = 360, h = 90;
    const g = this.add.graphics();
    if (primary) {
      g.fillStyle(0xc2185b, 0.22);
      g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 26);
      g.fillStyle(C.pink, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 26);
      g.fillStyle(0xffffff, 0.16);
      g.fillRoundedRect(-w / 2 + 10, -h / 2 + 6, w - 20, h / 2 - 8, 20);
    } else {
      softCard(g, -w / 2, -h / 2, w, h, 26, C.white, C.lavender, 3);
    }
    const t1 = this.add.text(0, -13, label, {
      fontFamily: F.head, fontSize: '25px', color: primary ? T.white : T.main,
    }).setOrigin(0.5);
    const t2 = this.add.text(0, 22, sub, {
      fontFamily: F.body, fontSize: '14px', color: primary ? '#fff3f8' : T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
    const c = this.add.container(W / 2, y, [g, t1, t2]);
    c.setSize(w, h).setInteractive({ cursor: 'pointer' });
    c.on('pointerover', () => this.tweens.add({ targets: c, scale: 1.03, duration: 120 }));
    c.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 120 }));
    c.on('pointerdown', () => {
      if (this.starting) return;
      this.starting = true;
      this.tweens.killTweensOf(c);
      this.tweens.add({ targets: c, scale: 0.95, yoyo: true, duration: 90 });
      sparkle(this, W / 2, y, primary ? 0xffffff : C.lavender, 10, 110);
      placeSound(1);
      this.time.delayedCall(240, () => this.startGame(mode));
    });
    if (primary) {
      this.tweens.add({ targets: c, scale: 1.035, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut', delay: 600 });
    }
  }

  private startGame(mode: Mode): void {
    const raw: [string, string] = [
      (this.input1.node as HTMLInputElement).value.trim(),
      (this.input2.node as HTMLInputElement).value.trim(),
    ];
    saveNames(raw);
    const names: [string, string] = [
      raw[0] || P[1].animal,
      mode === 'bot' ? BOT_NAME : (raw[1] || P[2].animal),
    ];
    say(mode === 'bot' ? `Let's play, ${names[0]}!` : `${names[0]} and ${names[1]}, let's play!`);
    this.scene.start('GameScene', { names, mode });
  }
}
