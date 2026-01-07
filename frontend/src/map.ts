export interface Point2D {
    x: number;
    y: number;
}

// Uses the pointy top orientation
export class Layout {
    origin: Point2D;
    readonly size: Point2D;

    //Forward matrix: Hex to Pixel
    readonly f0 = Math.sqrt(3.0); 
    readonly f1 = Math.sqrt(3.0) / 2.0; 
    readonly f2 = 0.0; 
    readonly f3 = 3.0 / 2.0;
    //Backward matrix: Pixel to Hex
    readonly b0 = Math.sqrt(3.0) / 3.0; 
    readonly b1 = -1.0 / 3.0; 
    readonly b2 = 0.0; 
    readonly b3 = 2.0 / 3.0;

    //In multiples of 60°
    readonly startAngle = 0.5;

    constructor(origin: Point2D, size: Point2D) {
        this.origin = origin;
        this.size = size;
    }

    findCorners(h:Hex): Array<Point2D> {
        const corners: Array<Point2D> = [];
        const center = this.hexToPixel(h);

        for(let i = 0 ; i < 6 ; i++) {
            const angle_deg = 60 * (i - this.startAngle);
            const angle_rad = Math.PI / 180.0 * angle_deg;
            corners.push({
                x: center.x + this.size.x * Math.cos(angle_rad),
                y: center.y + this.size.y * Math.sin(angle_rad)
            });
        }

        return corners;
    }

    hexToPixel(h:Hex): Point2D {
        const x = (this.f0 * h.q + this.f1 * h.r) * this.size.x;
        const y = (this.f2 * h.q + this.f3 * h.r) * this.size.y;

        return {
            x: x + this.origin.x, 
            y: y + this.origin.y
        };
    }

    pixelToHex(p: Point2D): Hex {
        const point = {x: (p.x - this.origin.x) / this.size.x, y: (p.y - this.origin.y) / this.size.y};
        const q = (this.b0 * point.x + this.b1 * point.y);
        const r = (this.b2 * point.x + this.b3 * point.y);

        return this.round(new Hex(q, r, -q-r));
    }

    private round(h: Hex): Hex {
        let q = Math.round(h.q);
        let r = Math.round(h.r);
        let s = Math.round(h.s);

        const q_diff = Math.abs(q - h.q)
        const r_diff = Math.abs(r - h.r)
        const s_diff = Math.abs(s - h.s)

        if (q_diff > r_diff && q_diff > s_diff) {
            q = -r-s
        }
        else if(r_diff > s_diff){
            r = -q-s
        }
        else {
            s = -q-r
        }

        return new Hex(q, r, s);
    }
}

export class Hex {
    readonly q: number;
    readonly r: number;
    readonly s: number;

    fillColor: string;
    strokeColor: string;

    static readonly DEFAULT_FILL_COLOR = "#1a1b1bff";
    static readonly DEFAULT_STROKE_COLOR = "#0a0a0aff";
    static readonly DEFAULT_DEPTH_FILL_COLOR = "#151414ff";
    static readonly DEFAULT_LINE_WIDTH = 3;

    /**
     * Creates a new Hexagon using Cube coordinates.
     * @throws {Error} If the sum of q, r, and s is not zero.
     */
    constructor(q: number, 
                r: number, 
                s: number, 
                fillColor: string = Hex.DEFAULT_FILL_COLOR, 
                strokeColor: string = Hex.DEFAULT_STROKE_COLOR) {
        if (Math.round(q + r + s) !== 0) {
            throw Error("q + r + s must be 0");
        }

        this.q = q;
        this.r = r;
        this.s = s;

        this.fillColor = fillColor;
        this.strokeColor = strokeColor;
    }

    distance(other: Hex): number {
        return Math.max(
            Math.abs(this.q - other.q), 
            Math.abs(this.r - other.r), 
            Math.abs(this.s - other.s))
    };

    hashCode(): string {
        return Hex.hashCode(this.q, this.r);
    }
    
    // Coordinate s is redundant and delimiter choice doesn't matter here
    static hashCode(q: number, r: number) : string {
         return `${q}_${r}`;
    }

}

export class Renderer {
    readonly ctx : CanvasRenderingContext2D;
    readonly layout: Layout;
    readonly hexDepth: number
    readonly DEFAULT_HEX_DEPTH = 30

    constructor(ctx: CanvasRenderingContext2D, layout: Layout, hexDepth: number = this.DEFAULT_HEX_DEPTH) {
        this.ctx = ctx;
        this.layout = layout;
        this.hexDepth = hexDepth;
    }

    drawMap(map: Map<string, Hex>, canvasWidth: number, canvasHeight: number): void {

        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        this.ctx.fillStyle = ("#242220ff");
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        const depthStrokePath = new Path2D();
        
        for (let [_, h] of map) {
            const corners = this.layout.findCorners(h);

            depthStrokePath.moveTo(corners[1].x,corners[1].y);
            depthStrokePath.lineTo(corners[1].x,corners[1].y + this.hexDepth);
            depthStrokePath.lineTo(corners[2].x,corners[2].y + this.hexDepth);
            depthStrokePath.lineTo(corners[3].x,corners[3].y + this.hexDepth);
            depthStrokePath.lineTo(corners[3].x,corners[3].y);
            
            this.ctx.beginPath();
            this.ctx.moveTo(corners[1].x,corners[1].y);
            this.ctx.lineTo(corners[1].x,corners[1].y + this.hexDepth);
            this.ctx.lineTo(corners[2].x,corners[2].y + this.hexDepth);
            this.ctx.lineTo(corners[3].x,corners[3].y + this.hexDepth);
            this.ctx.lineTo(corners[3].x,corners[3].y);
            this.ctx.lineTo(corners[2].x,corners[2].y);
            this.ctx.lineTo(corners[1].x,corners[1].y);
            this.ctx.fillStyle = Hex.DEFAULT_DEPTH_FILL_COLOR;
            this.ctx.fill()
        }
        
        this.ctx.lineWidth = Hex.DEFAULT_LINE_WIDTH;
        this.ctx.strokeStyle = Hex.DEFAULT_DEPTH_FILL_COLOR;
        this.ctx.stroke(depthStrokePath);
        
        const gridPath = new Path2D();

        for (let [_, h] of map) {
            const corners = this.layout.findCorners(h);
            
            this.ctx.beginPath();
            this.ctx.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < 6; i++) {
                this.ctx.lineTo(corners[i].x, corners[i].y);
            }
            this.ctx.closePath();
            this.ctx.fillStyle = h.fillColor;
            this.ctx.fill();

            gridPath.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < 6; i++) {
                gridPath.lineTo(corners[i].x, corners[i].y);
            }
            gridPath.closePath();
    }

    this.ctx.lineWidth = Hex.DEFAULT_LINE_WIDTH;
    this.ctx.strokeStyle = Hex.DEFAULT_STROKE_COLOR;
    this.ctx.stroke(gridPath);
    }
}
