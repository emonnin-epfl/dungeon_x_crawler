import { Renderer } from "./renderer.ts";
import { Grid } from "./grid.ts";
import { Player } from "./player.ts";
import type { Point2D } from "./layout.ts";
import { Hex } from "./hex.ts";
import type { Notifier } from "./utils.ts";
import { Ui, UiButton } from "./ui.ts";

export type GameEvent = {
    hex_hovered: (hex: Hex) => void;
    hex_clicked: (hex: Hex) => void;
    button_hovered: (button: UiButton) => void;
    button_clicked: (button: UiButton) => void;
    turn_skipped: () => void;
};

export class Game {
    player: Player;
    grid: Grid;
    isPlayerTurn: boolean;
    path: {show: boolean, goals: Array<Point2D>};
    ui: Ui;
    renderer: Renderer;
    notifier: Notifier<GameEvent>

    constructor(player: Player, grid: Grid, renderer: Renderer, notifier: Notifier<GameEvent>) {
        this.player = player,
        this.grid = grid,
        this.isPlayerTurn = true,
        this.path = {show: false, goals: []}
        this.ui = new Ui(notifier);
        this.renderer = renderer;
        this.notifier = notifier;
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
        if(this.path.show) {
            this.renderer.drawPath(this.path.goals);
        }
        
        this.renderer.drawPlayer(this.player);

        this.ui.buttons.forEach(btn => {
            this.renderer.drawButton(btn);
        });
    }

    private updatePlayer(): void {
        const player = this.player;

        if (player.is("Moving") && this.path.goals.length === 0) {
            player.idle()
        }
        if(player.is("Moving") && this.path.goals.length > 0) {
            const goal = this.path.goals[0];
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
                this.path.goals.shift();
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

        this.notifier.on("turn_skipped", () => {
            this.isPlayerTurn = !this.isPlayerTurn;
            console.log(this.isPlayerTurn);
        });

        this.notifier.on("button_hovered", (button) => {
            button.isHovered = true;
            this.path.show = false;
        });
        this.notifier.on("button_clicked", (button) => {
            if (this.player.is("Idle")) {
                button.trigger();
            }
        });

        let resizeTimeout: number;
        // Temporary fix: only resize after 150ms of no dragging
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resize(), 50); 
        });

        window.addEventListener('click', (event) => this.handleMouseClick(event));
        window.addEventListener('mousemove', (event) => this.handleMouseMove(event));
    }


    private handleMouseMove(event: MouseEvent): void {

        const button = this.getButtonFromEvent(event)
        if (button) {
            this.notifier.emit("button_hovered", button);
            return;
        }
        const hex = this.getHexFromEvent(event);
        if (hex) {
            this.notifier.emit("hex_hovered", hex);
        } else {
            this.path.show = false;
        }
    }

    private getHexFromEvent(event: MouseEvent): Hex | null {
        const rect = this.renderer.canvas.getBoundingClientRect();

        const hex = this.renderer.layout.pixelToHex({
                x: event.clientX - rect.left, 
                y: event.clientY - rect.top
            });

        if (this.grid.map.has(hex.hashCode())) {
            return hex;
        }
        return null;
    }

    public getButtonFromEvent(event: MouseEvent): UiButton | null {
        let hoveredButton = null;
        const rect = this.renderer.canvas.getBoundingClientRect();

        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
   
        for(const button of this.ui.buttons) {
            if (button.isHit(x, y)) {
                hoveredButton = button
            }
            button.isHovered = false;
        }
        return hoveredButton;
    }

    private handleMouseClick(event: MouseEvent): void {
        const button = this.getButtonFromEvent(event)
        if (button) {
            this.notifier.emit("button_clicked", button);
            return;
        }
        const hex = this.getHexFromEvent(event);
        if (hex) {
            this.notifier.emit("hex_clicked", hex);
        }
    }

    private startPlayerAction(hex: Hex): void {
        if(!this.player.is("Idle") || !this.isPlayerTurn) {
            return;
        }

        if(this.grid.map.has(hex.hashCode())) {
            this.player.move()
            this.path.show = false;
        }
    }

    private showPathPreview(hex: Hex): void {
         if(!this.player.is("Idle") || !this.isPlayerTurn || this.player.isAt(hex)) {
            this.path.show = false
            return;
        }
        
        this.path.goals = [];

        const playerHex = this.grid.map.get(Hex.hashCode(this.player.q, this.player.r))
        if(!playerHex) {
            throw new Error("player not on grid");
        }

        const path = this.grid.searchPath(playerHex, hex);

        for(const h of path) {
            this.path.goals.push(this.renderer.layout.hexToPixel(h));
        }

        this.path.show = true;
    }

    private resize(): void {
        const canvas = this.renderer.canvas;
        const uiCanvas  =this.renderer.uiCanvas;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const dpr = window.devicePixelRatio;

        // Using the diff between the old/new origin of the canvas to calculate the new position of the player on the sceen
        const oldOriginX = this.renderer.layout.origin.x;
        const oldOriginY = this.renderer.layout.origin.y;
      
        canvas.width = width;
        canvas.height = height;
        uiCanvas.width = width;
        uiCanvas.height = height;
      
        if(dpr !== 1) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            uiCanvas.width = width * dpr;
            uiCanvas.height = height * dpr;
        
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            uiCanvas.style.width = `${width}px`;
            uiCanvas.style.height = `${height}px`;

            this.renderer.ctx.scale(dpr, dpr);
            this.renderer.uiCtx.scale(dpr, dpr);
        }
        
        const newOriginX = width / 2;
        const newOriginY = height / 2;
        this.renderer.layout.origin = { x: newOriginX, y: newOriginY };

        let offsetX = this.player.x - oldOriginX;
        let offsetY = this.player.y - oldOriginY;

        this.player.x = newOriginX + offsetX;
        this.player.y = newOriginY + offsetY;

        for(const goal of this.path.goals) {
            offsetX = goal.x - oldOriginX;
            offsetY = goal.y - oldOriginY;
            goal.x = newOriginX + offsetX;
            goal.y = newOriginY + offsetY;
        }
    }
}