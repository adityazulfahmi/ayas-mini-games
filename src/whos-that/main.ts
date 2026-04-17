import { createGame, waitForFonts } from '@shared/createGame';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';

waitForFonts().then(() => createGame(420, 800, [TitleScene, GameScene, ResultScene]));
