import { createGame, waitForFonts } from '@shared/createGame';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';

waitForFonts().then(() =>
  createGame(440, 720, [TitleScene, GameScene], { dom: { createContainer: true } }),
);
