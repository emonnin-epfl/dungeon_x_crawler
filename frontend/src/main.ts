import './style.css'
import { Game } from './game.ts';
import { Renderer } from './renderer.ts';
import type { PlayerAction } from './player.ts';
import { Player } from './player.ts';
import { Layout } from './layout.ts';
import { Hex } from './hex.ts';
import { AssetManager } from './utils.ts';
import { Grid } from './grid.ts';
import { createNotifier } from './utils.ts';
import type { GameEvent } from './game.ts';

const assetManager = new AssetManager();
const urls = new Map<string, Array<string>>();

urls.set(
  "b_warrior_idle", ["./b_warrior/idle/sprite_1.png","./b_warrior/idle/sprite_2.png","./b_warrior/idle/sprite_3.png","./b_warrior/idle/sprite_4.png","./b_warrior/idle/sprite_5.png","./b_warrior/idle/sprite_6.png","./b_warrior/idle/sprite_7.png"],
);
urls.set(
  "b_warrior_moving", ["./b_warrior/moving/sprite_0.png","./b_warrior/moving/sprite_1.png","./b_warrior/moving/sprite_2.png","./b_warrior/moving/sprite_3.png","./b_warrior/moving/sprite_4.png","./b_warrior/moving/sprite_5.png"]
);

urls.set(
  "b_warrior_striking", ["./b_warrior/striking/sprite_0.png","./b_warrior/striking/sprite_1.png","./b_warrior/striking/sprite_2.png","./b_warrior/striking/sprite_3.png"]
);

urls.set(
  "spikes", ["./spikes/spike_0.png", "./spikes/spike_1.png", "./spikes/spike_2.png", "./spikes/spike_3.png", "./spikes/spike_4.png"]
);

await assetManager.loadSprites(urls);

document.querySelector<HTMLDivElement>('#app')!.innerHTML = 
  `<canvas id="game-canvas"></canvas>
    <canvas id="ui-canvas"></canvas>`;

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const uiCanvas = document.querySelector<HTMLCanvasElement>('#ui-canvas')!;
const ctx = canvas.getContext('2d')!;
const uiCtx = uiCanvas.getContext('2d')!;

const width = window.innerWidth;
const height = window.innerHeight;
const dpr =  window.devicePixelRatio

canvas.width = width;
canvas.height = height;

// Fixes rendering on my monitor
if(dpr !== 1){

    // scale the canvas by window.devicePixelRatio
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    uiCanvas.width = width * dpr;
    uiCanvas.height = height *dpr;

    // use css to bring it back to regular size
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    uiCanvas.style.width = `${width}px`;
    uiCanvas.style.height = `${height}px`;

    // set the scale of the context
    ctx.scale(dpr, dpr);
    uiCtx.scale(dpr, dpr);
 }

// divide hex horizontal size by 2 to give an isometric look
const layout = new Layout({x: width / 2, y: height / 2}, {x: 100, y: 50});
const renderer = new Renderer(canvas, ctx, uiCanvas, uiCtx, layout);

//Row r size is 2*N+1 - abs(N-r)
const N = 4;
const map = new Map<string, Hex>();

// Store the map (hexagon shaped)
for (let q = -N; q <= N; q++) {
  const r1 = Math.max(-N, -q - N);
  const r2 = Math.min(N, -q + N);

  for(let r = r1 ; r <= r2 ; r++) {
    const h = new Hex(q, r, -q-r);
    map.set(h.hashCode(), h);
  }
}

map.delete(Hex.hashCode(-4,0));
map.delete(Hex.hashCode(4,0));
map.delete(Hex.hashCode(0,0));

const sprites: Record<PlayerAction, Array<HTMLImageElement>> = {
    "Idle": assetManager.get("b_warrior_idle")!,
    "Moving": assetManager.get("b_warrior_moving")!,
    "Striking": assetManager.get("b_warrior_striking")!
};

const grid = new Grid(map)
const playerHex = new Hex(-3, 0, 3);
const {x, y} = layout.hexToPixel(new Hex(-3, 0, 3));
const player = new Player(playerHex.q, playerHex.r, playerHex.s, x, y, sprites);
const gameNotifier = createNotifier<GameEvent>();
const game = new Game(player, grid, renderer, gameNotifier);

game.start();