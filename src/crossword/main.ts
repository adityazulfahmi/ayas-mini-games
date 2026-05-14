import { createGame, waitForFonts } from '@shared/createGame';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';

waitForFonts().then(() => createGame(480, 820, [TitleScene, GameScene]));
