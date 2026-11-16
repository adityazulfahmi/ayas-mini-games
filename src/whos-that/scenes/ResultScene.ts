import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { sounds } from '@shared/audio';
import { say } from '../speech';
import { CONFETTI_EMOJIS, type Difficulty, type GameMode } from '../data';

interface ResultData { score: number; total: number; difficulty: Difficulty; gameMode?: GameMode }

/**
 * Every game ends in a celebration — she found all of them, every time
 * (wrong taps never end a round, D-007). The stars and score reflect how
 * many she spotted on the first try, for Papa watching along.
 */
function tierFor(score: number, total: number): { emoji: string; title: string; msg: string; stars: number } {
  const ratio = total === 0 ? 0 : score / total;
  if (ratio >= 1)   return { emoji: '🎉', title: 'Perfect, Aya!',     msg: `You knew every one straight away! 🌟`, stars: 3 };
  if (ratio >= 0.6) return { emoji: '🌟', title: 'Great job!',        msg: `You found all ${total} — so clever! 🎀`, stars: 3 };
  if (ratio >= 0.2) return { emoji: '🌸', title: 'You found them!',   msg: `All ${total} found! Let's play again 💖`, stars: 2 };
  return                   { emoji: '💖', title: 'You found them!',   msg: `All ${total} found! Let's play again 💖`, stars: 1 };
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
      score: { value: `${score}/${total}`, label: `first try · ${difficulty === 'hard' ? 'quick' : 'relaxed'}` },
      stars: { earned: tier.stars, total: 3 },
    });

    // Always celebrate — she found every one of them.
    sounds.win();
    launchConfetti(this, CONFETTI_EMOJIS);
    say(score === total ? 'Perfect! You found them all!' : 'Hooray! You found them all!');
  }
}
