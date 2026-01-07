import './style.css'
import {Layout, Hex, Renderer } from './map';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <style>
    html, body {
      overflow: hidden;
    }
  </style>
  <canvas id="mycanvas"></canvas>
`;

const canvas = document.getElementById('mycanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!

let width = window.innerWidth;
let height = window.innerHeight;

canvas.width = width;
canvas.height = height;

// Fixes rendering on my monitor
if(window.devicePixelRatio !== 1){

    // scale the canvas by window.devicePixelRatio
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;

    // use css to bring it back to regular size
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // set the scale of the context
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
 }

// divide hex horizontal size by 2 to give an isometric look
const layout = new Layout({x: width / 2,y: height / 2}, {x: 100, y: 50});
const renderer = new Renderer(ctx, layout);

//Row r size is 2*N+1 - abs(N-r)
const N = 4;
const map = new Map<string, Hex>();

// Draw and store the map (hexagon shaped)
for (let q = -N; q <= N; q++) {

  const r1 = Math.max(-N, -q - N);
  const r2 = Math.min(N, -q + N);

  for(let r = r1 ; r <= r2 ; r++) {
    const h = new Hex(q, r, -q-r);
    map.set(h.hashCode(), h);
  }

map.delete(Hex.hashCode(-4,0));
map.delete(Hex.hashCode(4,0));
map.delete(Hex.hashCode(0,0));

renderer.drawMap(map, width, height);

//Highlights the hex where the cursor currently is
let currentHex : Hex | null = null;

canvas.addEventListener('mousemove', (event: MouseEvent) => {
  // Get the canvas position and size
  const rect = canvas.getBoundingClientRect();

  const h = layout.pixelToHex({
    x: event.clientX - rect.left, 
    y: event.clientY - rect.top
  });

  if(map.has(h.hashCode())) {

    if(!currentHex || h.hashCode() !== currentHex.hashCode()) {
      h.fillColor = "#01672cff";
      map.set(h.hashCode(), h)
    }

    if (currentHex !== null && h.hashCode() !== currentHex.hashCode()) {
      currentHex.fillColor = Hex.DEFAULT_FILL_COLOR;
      map.set(currentHex.hashCode(), currentHex)
    }
    currentHex = h;
    renderer.drawMap(map, width,height);
  } 
  else if (currentHex !== null) {
    currentHex.fillColor = Hex.DEFAULT_FILL_COLOR;
    map.set(currentHex.hashCode(), currentHex);
    currentHex = null;
    renderer.drawMap(map, width,height);
  }});

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  
  canvas.width = width;
  canvas.height = height;
  
  if(window.devicePixelRatio !== 1){

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  layout.origin = {x: width / 2, y: height / 2};
  renderer.drawMap(map, width, height);
}

let resizeTimeout: number;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(resize, 150); // temporary fix: only resize after 150ms of no dragging
});

}