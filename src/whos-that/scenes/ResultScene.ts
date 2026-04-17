import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { sounds } from '@shared/audio';
import { CONFETTI_EMOJIS } from '../data';

interface ResultData { score: number; total: number }

const TIERS: Record<number, { emoji: string; title: string; msg: (s: number) => string }> = {
  0: { emoji: '💪', title: 'Keep trying!',   msg: s => `You got ${s} out of 3. Practice makes perfect!` },
  1: { emoji: '💪', title: 'Keep trying!',   msg: s => `You got ${s} out of 3. Practice makes perfect!` },
  2: { emoji: '🌸', title: 'So close!',      msg: s => `${s} out of 3 — you almost got it! 🎀` },
  3: { emoji: '🎉', title: 'Perfect score!', msg: () => 'You got all 3! Amazing, Aya! 🌟' },
};

export class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene'); }

  create(data: ResultData): void {
    const { width: W, height: H } = this.scale;
    const score = data?.score ?? 0;
    const total = data?.total ?? 3;
    drawBg(this);

    const popup = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.start('GameScene'),
      onMenu:      () => this.scene.start('TitleScene'),
      onHome:      () => { window.location.href = '../'; },
      playAgainLabel: 'Again',
      menuLabel: 'Menu',
      homeLabel: '🏠 Home',
    });

    const tier = TIERS[score] ?? TIERS[0];
    popup.show({
      emoji: tier.emoji,
      title: tier.title,
      subtitle: tier.msg(score),
      score: { value: `${score}/${total}`, label: 'Score' },
      stars: { earned: score, total },
    });

    if (score === total) {
      sounds.win();
      launchConfetti(this, CONFETTI_EMOJIS);
    }
  }
}
