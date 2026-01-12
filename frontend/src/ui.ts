import type { Notifier } from "./utils";
import type { GameEvent } from "./game";

export class Ui {
    buttons: Array<UiButton>;
    private notifier: Notifier<GameEvent>;

    constructor(notifier: Notifier<GameEvent>) {
        this.notifier = notifier;
        this.buttons = [];
        this.setupSkipButton();
    }

    private setupSkipButton() {
        const skipButton = new UiButton(100, 50, 100, 100, "Skip Turn", () => {
            this.notifier.emit("turn_skipped");
        });
        this.buttons.push(skipButton);
    }

    public handleInteraction(x: number, y: number): void {
        for (const btn of this.buttons) {
            if (btn.isHit(x, y)) {
                btn.trigger();
                return;
            }
        }
    }
}

export class UiButton {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    isHovered: boolean;
    private onClick: () => void;

    constructor(
        x: number,
        y: number,
        width: number,
        height: number,
        label: string,
        onClick: () => void 
    ) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.label = label;
        this.isHovered = false;
        this.onClick = onClick;
    }

    isHit(px: number, py: number): boolean {
        return px >= this.x && 
               px <= this.x + this.width && 
               py >= this.y && 
               py <= this.y + this.height;
    }

    trigger(): void {
        this.onClick();
    }
}