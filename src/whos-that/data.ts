// Images imported so Vite includes them in the build
import bingImg    from '../../ayas-whos-that/images/bing.png';
import flopImg    from '../../ayas-whos-that/images/flop.png';
import sulaImg    from '../../ayas-whos-that/images/sula.png';
import pandoImg   from '../../ayas-whos-that/images/pando.png';
import cocoImg    from '../../ayas-whos-that/images/coco.png';
import charlieImg from '../../ayas-whos-that/images/charlie.png';
import padgetImg  from '../../ayas-whos-that/images/padget.png';
import ammaImg    from '../../ayas-whos-that/images/amma.png';
import mollyImg   from '../../ayas-whos-that/images/molly.png';
import nickyImg   from '../../ayas-whos-that/images/nicky.png';

export interface Character { name: string; key: string; url: string; }

export const CHARACTERS: Character[] = [
  { name: 'Bing',    key: 'bing',    url: bingImg    },
  { name: 'Flop',    key: 'flop',    url: flopImg    },
  { name: 'Sula',    key: 'sula',    url: sulaImg    },
  { name: 'Pando',   key: 'pando',   url: pandoImg   },
  { name: 'Coco',    key: 'coco',    url: cocoImg    },
  { name: 'Charlie', key: 'charlie', url: charlieImg },
  { name: 'Padget',  key: 'padget',  url: padgetImg  },
  { name: 'Amma',    key: 'amma',    url: ammaImg    },
  { name: 'Molly',   key: 'molly',   url: mollyImg   },
  { name: 'Nicky',   key: 'nicky',   url: nickyImg   },
];

export const CONFETTI_EMOJIS = ['🌸','⭐','🎀','✨','🌟','💖','🎊','🐰'];
