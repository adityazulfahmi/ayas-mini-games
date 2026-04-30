import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import {
  CONFETTI_EMOJIS, OPTIONS_PER_ROUND, PATTERN_SETS, STORIES,
  TOTAL_ROUNDS, type GameMode, type Story,
} from '../data';

const W = 420, H = 780;

// Sequence row geometry — 3 visible frames + 1 question slot
const SEQ_Y       = 232;
const SEQ_FRAME_W = 76;
const SEQ_FRAME_H = 96;
const SEQ_GAP     = 14;
const SEQ_TOTAL_W = SEQ_FRAME_W * 4 + SEQ_GAP * 3;
const SEQ_START_X = W / 2 - SEQ_TOTAL_W / 2 + SEQ_FRAME_W / 2;
const SEQ_EMOJI_PX = 50;

// Answer cards row
const OPT_Y       = 478;
const OPT_W       = 112;
const OPT_H       = 132;
const OPT_GAP     = 14;
const OPT_TOTAL_W = OPT_W * OPTIONS_PER_ROUND + OPT_GAP * (OPTIONS_PER_ROUND - 1);
const OPT_START_X = W / 2 - OPT_TOTAL_W / 2 + OPT_W / 2;
const OPT_EMOJI_PX = 70;

interface SeqSlot {
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  cx: number;
  isQuestion: boolean;
}

interface OptionCard {
  cx: number;
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  value: string;
  state: 'idle' | 'correct' | 'wrong';
}

interface RoundData {
  visible: [string, string, string];
  answer: string;
  options: string[];
}

interface SceneInit { mode?: GameMode }

export class GameScene extends Phaser.Scene {
  private mode: GameMode = 'pattern';

  private roundIndex = 0;
  private score = 0;
  private firstTry = true;
  private answered = false;
  private current!: RoundData;
  // Pre-shuffled queue of stories so a single playthrough never repeats one.
  private storyQueue: Story[] = [];

  private scoreTxt!: Phaser.GameObjects.Text;
  private progressDots: Phaser.GameObjects.Graphics[] = [];
  private seqSlots: SeqSlot[] = [];
  private seqQuestionTween?: Phaser.Tweens.Tween;
  private prompt!: Phaser.GameObjects.Container;
  private optionCards: OptionCard[] = [];

  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  init(data: SceneInit): void {
    this.mode = data?.mode ?? 'pattern';
  }

  create(): void {
    drawBg(this);

    this.roundIndex = 0;
    this.score = 0;
    this.progressDots = [];
    this.seqSlots = [];
    this.optionCards = [];
    // Story queue: shuffle once at game start, take TOTAL_ROUNDS distinct
    // stories. With 6 stories and 5 rounds we always have headroom.
    this.storyQueue = shuffle(STORIES).slice(0, TOTAL_ROUNDS);

    this.buildHeader();
    this.buildSequenceRow();
    this.buildPrompt();
    this.buildOptionCards();

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart({ mode: this.mode }),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    this.loadRound();
  }

  // ─── Header ────────────────────────────────────────────────────────────

  private buildHeader(): void {
    const titleEmoji = this.mode === 'pattern' ? '🎨' : '📖';
    const titleLabel = this.mode === 'pattern' ? 'Pattern' : 'Story';
    this.add.text(22, 34, `${titleEmoji} ${titleLabel}`, {
      fontFamily: F.head, fontSize: '17px', color: T.main,
    }).setOrigin(0, 0.5);

    this.pill(W - 70, 34, 108, 34);
    this.scoreTxt = this.add.text(W - 70, 34, `⭐ 0/${TOTAL_ROUNDS}`, {
      fontFamily: F.head, fontSize: '15px', color: T.main,
    }).setOrigin(0.5);

    const dotGap = 10, dotSize = 12;
    const totalW = TOTAL_ROUNDS * dotSize + (TOTAL_ROUNDS - 1) * dotGap;
    const startX = W / 2 - totalW / 2 + dotSize / 2;
    this.progressDots = Array.from({ length: TOTAL_ROUNDS }, (_, i) =>
      this.add.graphics().setPosition(startX + i * (dotSize + dotGap), 76),
    );
    this.renderDots();
  }

  private pill(cx: number, cy: number, w: number, h: number): void {
    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.lavender, 0.4);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  }

  private renderDots(): void {
    this.progressDots.forEach((g, i) => {
      g.clear();
      if (i < this.roundIndex) {
        // completed — mint
        g.fillStyle(C.mint, 1);
        g.fillCircle(0, 0, 6);
      } else if (i === this.roundIndex) {
        // current — pink, slightly larger
        g.fillStyle(C.pink, 1);
        g.fillCircle(0, 0, 7);
      } else {
        // upcoming — soft lavender
        g.fillStyle(C.lavender, 0.45);
        g.fillCircle(0, 0, 5);
      }
    });
  }

  // ─── Sequence row ──────────────────────────────────────────────────────

  private buildSequenceRow(): void {
    for (let i = 0; i < 4; i++) {
      const cx = SEQ_START_X + i * (SEQ_FRAME_W + SEQ_GAP);
      const isQ = i === 3;
      const bg = this.add.graphics();
      const txt = this.add.text(cx, SEQ_Y, isQ ? '?' : '', {
        fontFamily: isQ ? F.head : F.body,
        fontSize: isQ ? '44px' : `${SEQ_EMOJI_PX}px`,
        color: isQ ? T.sub : T.main,
      }).setOrigin(0.5);
      this.paintSeqFrame(bg, cx, isQ ? 'question' : 'idle');
      this.seqSlots.push({ bg, txt, cx, isQuestion: isQ });

      // Arrow connectors between adjacent slots
      if (i < 3) {
        const ax = cx + SEQ_FRAME_W / 2 + SEQ_GAP / 2;
        this.add.text(ax, SEQ_Y, '➜', {
          fontFamily: F.body, fontSize: '20px', color: T.sub,
        }).setOrigin(0.5).setAlpha(0.7);
      }
    }
  }

  private paintSeqFrame(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    state: 'idle' | 'question' | 'reveal',
  ): void {
    g.clear();
    const x = cx - SEQ_FRAME_W / 2;
    const y = SEQ_Y - SEQ_FRAME_H / 2;
    // Soft drop shadow on every frame so the row reads as a row of cards
    g.fillStyle(C.shadow, 0.12);
    g.fillRoundedRect(x + 2, y + 6, SEQ_FRAME_W, SEQ_FRAME_H, 16);
    if (state === 'idle') {
      g.fillStyle(C.white, 1);
      g.fillRoundedRect(x, y, SEQ_FRAME_W, SEQ_FRAME_H, 16);
    } else if (state === 'question') {
      g.fillStyle(C.bg2, 1);
      g.fillRoundedRect(x, y, SEQ_FRAME_W, SEQ_FRAME_H, 16);
      g.lineStyle(2.5, C.lavender, 0.85);
      g.strokeRoundedRect(x, y, SEQ_FRAME_W, SEQ_FRAME_H, 16);
    } else { // reveal — mint glow indicates the answered slot
      g.fillStyle(C.mintBg, 1);
      g.fillRoundedRect(x, y, SEQ_FRAME_W, SEQ_FRAME_H, 16);
      g.lineStyle(2.5, C.mint, 1);
      g.strokeRoundedRect(x, y, SEQ_FRAME_W, SEQ_FRAME_H, 16);
    }
  }

  // ─── Prompt ───────────────────────────────────────────────────────────

  private buildPrompt(): void {
    const cx = W / 2, cy = 372;
    const w = 196, h = 32;
    const bg = this.add.graphics();
    bg.fillStyle(C.white, 0.85);
    bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    bg.lineStyle(1.5, C.lavender, 0.45);
    bg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    const txt = this.add.text(cx, cy, '✨ What comes next?', {
      fontFamily: F.head, fontSize: '15px', color: T.main,
    }).setOrigin(0.5);
    this.prompt = this.add.container(0, 0, [bg, txt]);
  }

  // ─── Option cards ─────────────────────────────────────────────────────

  private buildOptionCards(): void {
    for (let i = 0; i < OPTIONS_PER_ROUND; i++) {
      const cx = OPT_START_X + i * (OPT_W + OPT_GAP);
      const bg = this.add.graphics();
      const txt = this.add.text(cx, OPT_Y, '', {
        fontFamily: F.body, fontSize: `${OPT_EMOJI_PX}px`,
      }).setOrigin(0.5);
      const zone = this.add.zone(cx, OPT_Y, OPT_W, OPT_H).setInteractive({ cursor: 'pointer' });

      const card: OptionCard = { cx, bg, txt, zone, value: '', state: 'idle' };
      this.optionCards.push(card);
      this.paintOptionCard(card, 'idle');

      zone.on('pointerdown', () => this.onOptionTap(card));
      zone.on('pointerover', () => {
        if (card.state !== 'idle') return;
        this.tweens.add({ targets: [card.txt], scale: 1.06, duration: 140 });
      });
      zone.on('pointerout', () => {
        if (card.state !== 'idle') return;
        this.tweens.add({ targets: [card.txt], scale: 1, duration: 140 });
      });
    }
  }

  private paintOptionCard(card: OptionCard, state: 'idle' | 'correct' | 'wrong'): void {
    card.state = state;
    const { bg, cx } = card;
    const x = cx - OPT_W / 2;
    const y = OPT_Y - OPT_H / 2;
    bg.clear();
    bg.fillStyle(C.shadow, 0.16);
    bg.fillRoundedRect(x + 2, y + 8, OPT_W, OPT_H, 22);
    if (state === 'correct') {
      bg.fillStyle(C.mintBg, 1);
      bg.fillRoundedRect(x, y, OPT_W, OPT_H, 22);
      bg.lineStyle(3, C.mint, 1);
      bg.strokeRoundedRect(x, y, OPT_W, OPT_H, 22);
    } else if (state === 'wrong') {
      bg.fillStyle(C.white, 0.6);
      bg.fillRoundedRect(x, y, OPT_W, OPT_H, 22);
      bg.lineStyle(2.5, C.lavender, 0.4);
      bg.strokeRoundedRect(x, y, OPT_W, OPT_H, 22);
    } else {
      bg.fillStyle(C.white, 1);
      bg.fillRoundedRect(x, y, OPT_W, OPT_H, 22);
      bg.lineStyle(2.5, C.lavender, 0.85);
      bg.strokeRoundedRect(x, y, OPT_W, OPT_H, 22);
    }
  }

  // ─── Round logic ──────────────────────────────────────────────────────

  private loadRound(): void {
    this.answered = false;
    this.firstTry = true;
    this.current = this.mode === 'pattern' ? this.makePatternRound() : this.makeStoryRound();
    this.renderDots();

    // Sequence: slots 0-2 show the visible items; slot 3 shows "?"
    this.seqSlots.forEach((slot, i) => {
      if (i < 3) {
        slot.txt.setText(this.current.visible[i]).setColor(T.main).setStyle({
          fontFamily: F.body, fontSize: `${SEQ_EMOJI_PX}px`,
        });
        this.paintSeqFrame(slot.bg, slot.cx, 'idle');
      } else {
        slot.txt.setText('?').setColor(T.sub).setStyle({
          fontFamily: F.head, fontSize: '44px',
        });
        this.paintSeqFrame(slot.bg, slot.cx, 'question');
      }
    });

    // Stagger pop-in for the visible frames so the row "draws itself"
    this.seqSlots.forEach((slot, i) => {
      slot.txt.setScale(0);
      slot.bg.setAlpha(0);
      this.tweens.add({
        targets: slot.txt, scale: 1,
        delay: 80 + i * 90, duration: 320, ease: 'Back.Out',
      });
      this.tweens.add({
        targets: slot.bg, alpha: 1,
        delay: 80 + i * 90, duration: 220, ease: 'Sine.Out',
      });
    });

    // Bobbing ? on the question slot
    this.seqQuestionTween?.stop();
    const qSlot = this.seqSlots[3];
    qSlot.txt.setScale(0);
    this.tweens.add({
      targets: qSlot.txt, scale: 1,
      delay: 80 + 3 * 90, duration: 320, ease: 'Back.Out',
      onComplete: () => {
        this.seqQuestionTween = this.tweens.add({
          targets: qSlot.txt,
          scale: 1.14, yoyo: true, repeat: -1,
          duration: 700, ease: 'Sine.InOut',
        });
      },
    });

    // Reset option cards
    this.optionCards.forEach((card, i) => {
      card.value = this.current.options[i];
      card.txt.setText(card.value).setScale(0).setAlpha(1);
      this.paintOptionCard(card, 'idle');
      card.zone.setInteractive({ cursor: 'pointer' });
      this.tweens.add({
        targets: card.txt, scale: 1,
        delay: 480 + i * 80, duration: 280, ease: 'Back.Out',
      });
    });

    // Prompt fades in once the row is settled
    this.prompt.setAlpha(0);
    this.tweens.add({
      targets: this.prompt, alpha: 1,
      delay: 380, duration: 240, ease: 'Sine.Out',
    });
  }

  private makePatternRound(): RoundData {
    const set = PATTERN_SETS[Math.floor(Math.random() * PATTERN_SETS.length)];
    const [a, b, ...rest] = shuffle(set.items);
    // ABA? — answer is B, completing the alternation
    const visible: [string, string, string] = [a, b, a];
    const answer = b;
    const distractors = rest.slice(0, OPTIONS_PER_ROUND - 1);
    const options = shuffle([answer, ...distractors]);
    return { visible, answer, options };
  }

  private makeStoryRound(): RoundData {
    const story = this.storyQueue[this.roundIndex];
    const visible: [string, string, string] = [story.frames[0], story.frames[1], story.frames[2]];
    const answer = story.frames[3];
    // Distractors: final frames of other stories, excluding any frame already
    // shown in this round so the wrong choices don't overlap with the visible
    // sequence (which would feel like a trick).
    const usedSet = new Set([...visible, answer]);
    const otherFinals = STORIES
      .filter(s => s !== story)
      .map(s => s.frames[3])
      .filter(f => !usedSet.has(f));
    const distractors = shuffle(otherFinals).slice(0, OPTIONS_PER_ROUND - 1);
    const options = shuffle([answer, ...distractors]);
    return { visible, answer, options };
  }

  // ─── Tap handling ─────────────────────────────────────────────────────

  private onOptionTap(card: OptionCard): void {
    if (this.answered || card.state !== 'idle') return;
    if (card.value === this.current.answer) {
      this.handleCorrect(card);
    } else {
      this.handleWrong(card);
    }
  }

  private handleWrong(card: OptionCard): void {
    this.firstTry = false;
    this.paintOptionCard(card, 'wrong');
    card.zone.disableInteractive();
    sounds.wrong();
    // A small horizontal shake so the wrong tap *feels* wrong without being
    // punishing — the card stays on screen, just dimmed and a touch offset.
    this.tweens.add({
      targets: [card.bg, card.txt],
      x: '+=8',
      duration: 70, yoyo: true, repeat: 3,
      onComplete: () => {
        card.bg.x = 0; card.txt.x = card.cx;
        this.tweens.add({ targets: [card.txt], alpha: 0.5, duration: 200 });
      },
    });
  }

  private handleCorrect(card: OptionCard): void {
    this.answered = true;
    if (this.firstTry) this.score++;
    this.scoreTxt.setText(`⭐ ${this.score}/${TOTAL_ROUNDS}`);
    sounds.correct();

    // Lock all cards, paint the correct one, dim the rest
    this.optionCards.forEach(c => {
      c.zone.disableInteractive();
      if (c === card) {
        this.paintOptionCard(c, 'correct');
        this.tweens.add({ targets: c.txt, scale: 1.18, duration: 220, ease: 'Back.Out' });
      } else if (c.state === 'idle') {
        this.tweens.add({ targets: [c.bg, c.txt], alpha: 0.4, duration: 220 });
      }
    });

    // Reveal the answer in the question slot — bouncy swap from "?" to the
    // answer emoji with a mint glow on the slot itself.
    this.seqQuestionTween?.stop();
    const qSlot = this.seqSlots[3];
    this.tweens.add({
      targets: qSlot.txt, scale: 0,
      duration: 160, ease: 'Sine.In',
      onComplete: () => {
        qSlot.txt.setText(this.current.answer).setColor(T.main).setStyle({
          fontFamily: F.body, fontSize: `${SEQ_EMOJI_PX}px`,
        });
        this.paintSeqFrame(qSlot.bg, qSlot.cx, 'reveal');
        this.tweens.add({
          targets: qSlot.txt, scale: 1,
          duration: 320, ease: 'Back.Out',
        });
      },
    });

    // Sparkles from the correct card
    this.sparkleBurst(card.cx, OPT_Y - 24);

    this.time.delayedCall(1100, () => this.nextRound());
  }

  private sparkleBurst(cx: number, cy: number): void {
    const sparkles = ['✨', '⭐', '🌟', '💖'];
    for (let i = 0; i < 6; i++) {
      const s = this.add.text(cx, cy, sparkles[i % sparkles.length], {
        fontFamily: F.body, fontSize: '22px',
      }).setOrigin(0.5).setAlpha(0.95);
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 60 + Math.random() * 30;
      this.tweens.add({
        targets: s,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist - 24,
        alpha: 0,
        scale: { from: 0.4, to: 1.4 },
        duration: 700, ease: 'Cubic.Out',
        onComplete: () => s.destroy(),
      });
    }
  }

  // ─── Round / game flow ────────────────────────────────────────────────

  private nextRound(): void {
    this.roundIndex++;
    if (this.roundIndex >= TOTAL_ROUNDS) {
      this.endGame();
      return;
    }
    this.loadRound();
  }

  private endGame(): void {
    sounds.end();
    launchConfetti(this, CONFETTI_EMOJIS);

    const data = this.endGameData();
    this.endOverlay.show(data);
  }

  private endGameData(): Parameters<typeof this.endOverlay.show>[0] {
    const stars = this.score >= 5 ? 3 : this.score >= 3 ? 2 : this.score >= 1 ? 1 : 0;
    const modeLabel = this.mode === 'pattern' ? 'PATTERN' : 'STORY';
    if (this.score === TOTAL_ROUNDS) {
      return {
        emoji: '🏆', title: 'Brilliant!',
        subtitle: 'Aya saw every pattern! 🌸',
        score: { value: `${this.score}/${TOTAL_ROUNDS}`, label: `${modeLabel} · PERFECT` },
        stars: { earned: stars, total: 3 },
      };
    }
    if (this.score >= 3) {
      return {
        emoji: '🌟', title: 'Lovely!',
        subtitle: 'Sharp eyes spotted the next one! ✨',
        score: { value: `${this.score}/${TOTAL_ROUNDS}`, label: modeLabel },
        stars: { earned: stars, total: 3 },
      };
    }
    return {
      emoji: '🌸', title: 'Nice try!',
      subtitle: 'Patterns are everywhere — try another round! 💖',
      score: { value: `${this.score}/${TOTAL_ROUNDS}`, label: modeLabel },
      stars: { earned: stars, total: 3 },
    };
  }
}
