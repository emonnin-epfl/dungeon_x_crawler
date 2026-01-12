import { Layout, type Point2D } from "./layout.ts";
import { Hex } from "./hex.ts";
import { Player } from "./player.ts";

export class Renderer {
    readonly canvas: HTMLCanvasElement;
    readonly ctx: CanvasRenderingContext2D;
    readonly layout: Layout;
    readonly background: string;

    static readonly DEFAULT_HEX_DEPTH = 30;
    static readonly DEFAULT_BACKGROUND_FILL_COLOR: string  = "#282118ff";

    constructor(
        canvas: HTMLCanvasElement, layout: Layout, background?: string) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.layout = layout;

        if(background) {
            this.background = background;
        } else {
            this.background = Renderer.DEFAULT_BACKGROUND_FILL_COLOR;
        }
    }

    clear(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.ctx.clearRect(0, 0, width, height);
        this.ctx.fillStyle = this.background;
        this.ctx.fillRect(0, 0, width, height);
    }

    drawMap(map: Map<string, Hex>): void {
        // Hex depth surface drawing
        this.drawHexDepth(map);

        // Hex Top surface drawing
        const outline = new Path2D();
        for (const h of map.values()) {
            const corners = this.layout.findCorners(h);
            this.ctx.beginPath();
            this.ctx.moveTo(corners[0].x, corners[0].y);

            for (let i = 1; i < 6; i++) {
                this.ctx.lineTo(corners[i].x, corners[i].y);
            }
            this.ctx.closePath();
            this.ctx.fillStyle = h.fillColor;
            this.ctx.fill();
            
            outline.moveTo(corners[0].x, corners[0].y);
            
            for (let i = 1; i < 6; i++) {
                outline.lineTo(corners[i].x, corners[i].y);
            }

            outline.closePath();
        }
        this.ctx.lineWidth = Hex.DEFAULT_LINE_WIDTH;
        this.ctx.strokeStyle = Hex.DEFAULT_STROKE_COLOR;
        this.ctx.stroke(outline);
    }

    private drawHexDepth(map: Map<string, Hex>): void { 
        // Here the outline has the same color has the inner shape (the hex) 
        // to compensate for the outline of the top surface (the grid) that makes each hex 0.5p bigger
        const depth = Renderer.DEFAULT_HEX_DEPTH;
        const outline = new Path2D();
        // Depth drawing
        for (const h of map.values()) {
            const corners = this.layout.findCorners(h);

            outline.moveTo(corners[1].x,corners[1].y);
            outline.lineTo(corners[1].x,corners[1].y + depth);
            outline.lineTo(corners[2].x,corners[2].y + depth);
            outline.lineTo(corners[3].x,corners[3].y + depth);
            outline.lineTo(corners[3].x,corners[3].y);
            
            this.ctx.beginPath();
            this.ctx.moveTo(corners[1].x,corners[1].y);
            this.ctx.lineTo(corners[1].x,corners[1].y + depth);
            this.ctx.lineTo(corners[2].x,corners[2].y + depth);
            this.ctx.lineTo(corners[3].x,corners[3].y + depth);
            this.ctx.lineTo(corners[3].x,corners[3].y);
            this.ctx.lineTo(corners[2].x,corners[2].y);
            this.ctx.lineTo(corners[1].x,corners[1].y);
            this.ctx.fillStyle = Hex.DEFAULT_DEPTH_COLOR;
            this.ctx.fill()
        }
        this.ctx.lineWidth = Hex.DEFAULT_LINE_WIDTH;
        this.ctx.strokeStyle = Hex.DEFAULT_DEPTH_COLOR;
        this.ctx.stroke(outline);
    }

    drawPlayer(player: Player): void {
        const sprite = player.getCurrentSprite();
        const width = sprite.naturalWidth;
        const height = sprite.naturalHeight;

        this.ctx.save();

        this.ctx.translate(player.x, 0);
        this.ctx.scale(player.getDirection(), 1);
        // Here h/6 is a magic offset number to center vertically the player on the grid
        this.ctx.drawImage(sprite, -width / 2, player.y - height + height / 6);

        this.ctx.restore();
    }

    drawPath(path: Array<Point2D>) {
        const width = 20;

        if(path.length < 2) {
            throw new Error("Need at least 2 points to draw an arrow");
        }

        this.ctx.beginPath();
        this.ctx.moveTo(path[0].x, path[0].y);

        // start drawing the line
        for (let i = 0 ; i < path.length ; i++) {
            this.ctx.lineTo(path[i].x, path[i].y);
        }

        this.ctx.lineWidth = width;
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = "rgba(5, 56, 24, 0.2)";
        this.ctx.stroke();

        // start drawing hex centers
        for (let i = 0 ; i < path.length ; i++) {
            this.ctx.beginPath();
            this.ctx.ellipse(path[i].x, path[i].y, width, 0.5 * width, 0, 0, 2 * Math.PI);
            this.ctx.strokeStyle = "rgba(7, 51, 3, 0.91)";
            this.ctx.stroke();
        }
    }
}