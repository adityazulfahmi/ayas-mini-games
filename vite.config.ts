import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/ayas-mini-games/',
  resolve: {
    alias: { '@shared': resolve(__dirname, 'src/shared') },
  },
  build: {
    rollupOptions: {
      input: {
        main:        resolve(__dirname, 'index.html'),
        colourHunt:  resolve(__dirname, 'ayas-colour-hunt/index.html'),
        colourMatch: resolve(__dirname, 'ayas-colour-match/index.html'),
        oddOneOut:   resolve(__dirname, 'ayas-odd-one-out/index.html'),
        flipMatch:   resolve(__dirname, 'ayas-flip-matching/index.html'),
        tictactoe:   resolve(__dirname, 'ayas-tictactoe/index.html'),
        whosThat:    resolve(__dirname, 'ayas-whos-that/index.html'),
        connectMatch: resolve(__dirname, 'ayas-connect-match/index.html'),
        whoMakesSound: resolve(__dirname, 'ayas-who-makes-sound/index.html'),
        whatsNext:    resolve(__dirname, 'ayas-whats-next/index.html'),
        pickPop:      resolve(__dirname, 'ayas-pick-pop/index.html'),
      },
    },
  },
});
