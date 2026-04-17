import { createGame, waitForFonts } from '@shared/createGame';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';

waitForFonts().then(() => createGame(420, 740, [TitleScene, GameScene]));
