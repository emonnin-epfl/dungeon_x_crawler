import { Renderer } from "./renderer.ts";
import { Grid } from "./grid.ts";
import { Player } from "./player.ts";
import type { Point2D } from "./layout.ts";
import { Hex } from "./hex.ts";
import { createPubSub } from './utils.ts';

type GameEvent = {
    hex_hovered: (hex: Hex) => void;
    hex_clicked: (hex: Hex) => void;
};

export class Game {
    player: Player;
    grid: Grid;
    isPlayerTurn: boolean;
    pathState: {show: boolean, path: Array<Point2D>};
    renderer: Renderer;
    notifier = createPubSub<GameEvent>();

    constructor(player: Player, grid: Grid, renderer: Renderer) {
        this.player = player,
        this.grid = grid,
        this.isPlayerTurn = true,
        this.pathState = {show: false, path: []}
        this.renderer = renderer;
    }

    start(): void {
        this.setupEventListeners();
        
        // Start the main game loop
        this.loop();
    }

    private loop = (): void => {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }

    private update(): void {
       this.updatePlayer();
    }

    private draw(): void {
        this.renderer.clear();
        this.renderer.drawMap(this.grid.map);
        if(this.pathState.show) {
            this.renderer.drawPath(this.pathState.path);
        }
        
        this.renderer.drawPlayer(this.player);
    }

    private updatePlayer(): void {
        const player = this.player;

        if (player.is("Moving") && this.pathState.path.length === 0) {
            player.idle()
        }

        if(player.is("Moving") && this.pathState.path.length > 0) {
            const goal = this.pathState.path[0];
            const dx = goal.x - player.x;
            const dy = goal.y - player.y;

            if (dx > 0) {
                player.turnRight();
            }
            else if (dx < 0) {
                player.turnLeft();
            }

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < player.speed) {
                this.pathState.path.shift();
                player.x = goal.x
                player.y = goal.y
                return;
            }
            const vx = (dx / distance) * player.speed;
            const vy = (dy / distance) * player.speed;
            player.x += vx;
            player.y += vy;

            const {q,r,s} = this.renderer.layout.pixelToHex({x: player.x, y: player.y});
            player.setHexCoordinate(q, r, s);
        }

        this.player.updateVisual();
    }

    private setupEventListeners(): void {
        this.notifier.on("hex_clicked", (hex) => {
            this.startPlayerAction(hex)
        });
        
        this.notifier.on("hex_hovered", (hex) => {
            this.showPathPreview(hex);
        });

        let resizeTimeout: number;
        // Temporary fix: only resize after 150ms of no dragging
        window.addEventListener('resize', () => {
            this.pathState.show = false;
            this.pathState.path = [];
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resize(), 50); 
        });

        window.addEventListener('click', (event) => this.handleMouseClick(event));
        window.addEventListener('mousemove', (event) => this.handleMouseMove(event));
    }

    private handleMouseClick(event: MouseEvent): void {
        const rect = this.renderer.canvas.getBoundingClientRect();
    
        const hex = this.renderer.layout.pixelToHex({
            x: event.clientX - rect.left, 
            y: event.clientY - rect.top
        });
         this.notifier.emit("hex_clicked", hex);
    }

    private handleMouseMove(event: MouseEvent): void {
        const rect = this.renderer.canvas.getBoundingClientRect();
    
        const hex = this.renderer.layout.pixelToHex({
            x: event.clientX - rect.left, 
            y: event.clientY - rect.top
        });

        this.notifier.emit("hex_hovered", hex);
    }

    private startPlayerAction(hex: Hex): void {
        if(!this.player.is("Idle") || !this.isPlayerTurn) {
            return;
        }

        if(this.grid.map.has(hex.hashCode())) {
            this.player.move()
            this.pathState.show = false;
        }
    }

    private showPathPreview(hex: Hex): void {
         if(!this.player.is("Idle") || 
            !this.isPlayerTurn ||
            this.player.isAt(hex) || 
            !this.grid.map.has(hex.hashCode())) 
        {
            this.pathState.show = false
            return;
        }

        this.pathState.path = [];

        const playerHex = this.grid.map.get(Hex.hashCode(this.player.q, this.player.r))
        if(!playerHex) {
            throw new Error("player not on grid");
        }

        const path = this.grid.searchPath(playerHex, hex);

        for(const h of path) {
            this.pathState.path.push(this.renderer.layout.hexToPixel(h));
        }

        this.pathState.show = true;
    }

    private resize(): void {
        const canvas = this.renderer.canvas;
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Using the diff between the old/new origin of the canvas to calculate the new position of the player on the sceen
        const oldOriginX = this.renderer.layout.origin.x;
        const oldOriginY = this.renderer.layout.origin.y;

        const offsetX = this.player.x - oldOriginX;
        const offsetY = this.player.y - oldOriginY;
      
        canvas.width = width;
        canvas.height = height;
      
        if(window.devicePixelRatio !== 1) {
            canvas.width = width * window.devicePixelRatio;
            canvas.height = height * window.devicePixelRatio;
        
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            this.renderer.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
        
        const newOriginX = width / 2;
        const newOriginY = height / 2;
        this.renderer.layout.origin = { x: newOriginX, y: newOriginY };

        this.player.x = newOriginX + offsetX;
        this.player.y = newOriginY + offsetY;
    }
}