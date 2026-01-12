import { Hex } from "./hex.ts"

export interface Point2D {
    x: number;
    y: number;
}
// Uses the pointy top orientation
export class Layout {
    origin: Point2D;
    size: Point2D;

    //Forward matrix: Hex to Pixel
    private readonly f0 = Math.sqrt(3.0); 
    private readonly f1 = Math.sqrt(3.0) / 2.0; 
    private readonly f2 = 0.0; 
    private readonly f3 = 3.0 / 2.0;
    //Backward matrix: Pixel to Hex
    private readonly b0 = Math.sqrt(3.0) / 3.0; 
    private readonly b1 = -1.0 / 3.0; 
    private readonly b2 = 0.0; 
    private readonly b3 = 2.0 / 3.0;

    //In multiples of 60°
    private readonly startAngle = 0.5;

    constructor(origin: Point2D, size: Point2D) {
        this.origin = origin;
        this.size = size;
    }

    findCorners(h:  Hex): Array<Point2D> {
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

    hexToPixel(h: Hex): Point2D {
        const x = (this.f0 * h.q + this.f1 * h.r) * this.size.x;
        const y = (this.f2 * h.q + this.f3 * h.r) * this.size.y;

        return {
            x: x + this.origin.x, 
            y: y + this.origin.y
        };
    }

    pixelToHex(p: Point2D): Hex {
        const point = {
            x: (p.x - this.origin.x) / this.size.x, 
            y: (p.y - this.origin.y) / this.size.y
        };
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