import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { sounds } from '@shared/audio';
import { CONFETTI_EMOJIS, type Difficulty, type GameMode } from '../data';

interface ResultData { score: number; total: number; difficulty: Difficulty; gameMode?: GameMode }

/**
 * Tier ranges are computed from the incoming `total` rather than hard-coded
 * round counts, so the popup stays correct if round counts change later.
 */
function tierFor(score: number, total: number): { emoji: string; title: string; msg: string; stars: number } {
  const ratio = total === 0 ? 0 : score / total;
  if (ratio >= 1)     return { emoji: '🎉', title: 'Perfect score!',  msg: `You got all ${total}! Amazing, Aya! 🌟`,       stars: 3 };
  if (ratio >= 0.7)   return { emoji: '🌟', title: 'Great job!',      msg: `You got ${score} of ${total} — brilliant! 🎀`,   stars: 3 };
  if (ratio >= 0.4)   return { emoji: '🌸', title: 'Nice try!',       msg: `${score} of ${total} — you're getting there! 💖`, stars: 2 };
  return                     { emoji: '💪', title: 'Keep trying!',    msg: `You got ${score} of ${total}. Practice makes perfect!`, stars: 1 };
}

export class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene'); }

  create(data: ResultData): void {
    const { width: W, height: H } = this.scale;
    const score = data?.score ?? 0;
    const total = data?.total ?? 0;
    const difficulty = data?.difficulty ?? 'easy';
    const gameMode = data?.gameMode ?? 'bing';
    drawBg(this);

    const popup = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.start('GameScene', { difficulty, gameMode }),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    const tier = tierFor(score, total);
    popup.show({
      emoji: tier.emoji,
      title: tier.title,
      subtitle: tier.msg,
      score: { value: `${score}/${total}`, label: `Score · ${difficulty}` },
      stars: { earned: tier.stars, total: 3 },
    });

    if (score === total && total > 0) {
      sounds.win();
      launchConfetti(this, CONFETTI_EMOJIS);
    }
  }
}
