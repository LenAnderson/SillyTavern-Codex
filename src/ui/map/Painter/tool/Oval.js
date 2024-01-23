import { Shape } from './Shape.js';




export class Oval extends Shape {
    fromCenter = false;
    square = false;
    rotate = false;
    actualStart;
    actualEnd;
    realStart;


    get func() {
        if (this.fill) {
            return this.context.fill.bind(this.context);
        }
        return this.context.stroke.bind(this.context);
    }




    constructor() {
        super();
        window.addEventListener('keydown', (evt)=>{
            switch (evt.key) {
                case 'Control': {
                    this.fromCenter = true;
                    break;
                }
                case 'Shift': {
                    this.square = true;
                    break;
                }
                case ' ': {
                    // this.rotate = true;
                    break;
                }
            }
        });
        window.addEventListener('keyup', (evt)=>{
            switch (evt.key) {
                case 'Control': {
                    this.fromCenter = false;
                    break;
                }
                case 'Shift': {
                    this.square = false;
                    break;
                }
                case ' ': {
                    this.rotate = false;
                    break;
                }
            }
        });
    }




    draw(point) {
        this.endPoint = point;
        this.context.beginPath();
        if (this.fromCenter) {
            if (this.rotate || this.square) {
                if (this.rotate) {
                    this.drawRotatedSquareFromCenter();
                } else {
                    this.drawSquareFromCenter();
                }
            } else {
                this.drawRectFromCenter();
            }
        } else {
            if (this.rotate || this.square) {
                if (this.rotate) {
                    this.drawRotatedSquare();
                } else {
                    this.drawSquare();
                }
            } else {
                this.drawRect();
            }
        }
        this.context.closePath();
        this.func();
    }


    drawRect() {
        this.actualStart = this.startPoint;
        this.actualEnd = this.endPoint;
        this.context.ellipse(
            this.startPoint.x - (this.startPoint.x - this.actualEnd.x) / 2,
            this.startPoint.y - (this.startPoint.y - this.actualEnd.y) / 2,
            Math.abs(this.actualEnd.x - this.startPoint.x) / 2,
            Math.abs(this.actualEnd.y - this.startPoint.y) / 2,
            0,
            0,
            2 * Math.PI,
        );
    }

    drawRectFromCenter() {
        this.actualStart = {
            x: this.startPoint.x - (this.endPoint.x - this.startPoint.x),
            y: this.startPoint.y - (this.endPoint.y - this.startPoint.y),
        };
        this.actualEnd = {
            x: this.actualStart.x + (this.endPoint.x - this.startPoint.x) * 2,
            y: this.actualStart.y + (this.endPoint.y - this.startPoint.y) * 2,
        };
        const diameter = Math.min(Math.abs(this.startPoint.x - this.endPoint.x), Math.abs(this.startPoint.y - this.endPoint.y));
        this.context.ellipse(
            this.startPoint.x,
            this.startPoint.y,
            diameter,
            diameter,
            0,
            0,
            2 * Math.PI,
        );
    }


    drawSquare() {
        let radius = Math.min(Math.abs(this.endPoint.x - this.startPoint.x), Math.abs(this.endPoint.y - this.startPoint.y)) / 2;
        this.actualStart = this.startPoint;
        this.actualEnd = {
            x: this.startPoint.x + 2 * radius * (this.startPoint.x < this.endPoint.x ? 1 : -1),
            y: this.startPoint.y + 2 * radius * (this.startPoint.y < this.endPoint.y ? 1 : -1),
        };
        this.context.ellipse(
            this.startPoint.x - radius * (this.startPoint.x < this.endPoint.x ? -1 : 1),
            this.startPoint.y - radius * (this.startPoint.y < this.endPoint.y ? -1 : 1),
            Math.abs(radius),
            Math.abs(radius),
            0,
            0,
            2 * Math.PI,
        );
    }

    drawRotatedSquare() {
        let dx = Math.abs(this.endPoint.x - this.startPoint.x);
        let dy = Math.abs(this.endPoint.y - this.startPoint.y);
        let length = Math.sqrt((Math.pow(dx,2) + Math.pow(dy,2)) / 2);

        let angle = (Math.atan2(this.endPoint.y - this.startPoint.y, this.endPoint.x - this.startPoint.x) * 180 / Math.PI - 45) * Math.PI / 180;
        this.context.save();
        this.context.translate(this.startPoint.x, this.startPoint.y);
        this.context.rotate(angle);

        this.func(
            0,
            0,
            length,
            length,
        );

        this.context.restore();
    }

    drawSquareFromCenter() {
        let length = Math.min(Math.abs(this.endPoint.x - this.startPoint.x), Math.abs(this.endPoint.y - this.startPoint.y));
        this.actualStart = {
            x: this.startPoint.x - length,
            y: this.startPoint.y - length,
        };
        this.actualEnd = {
            x: this.actualStart.x + length * 2,
            y: this.actualStart.y + length * 2,
        };
        this.context.ellipse(
            this.startPoint.x,
            this.startPoint.y,
            length,
            length,
            0,
            0,
            2 * Math.PI,
        );
    }

    drawRotatedSquareFromCenter() {
        let dx = this.endPoint.x - this.startPoint.x;
        let dy = this.endPoint.y - this.startPoint.y;
        this.actualStart = {
            x: this.startPoint.x - dx,
            y: this.startPoint.y - dy,
        };
        let length = Math.sqrt((Math.pow(dx,2) + Math.pow(dy,2)) / 2);

        let angle = (Math.atan2(dy, dx) * 180 / Math.PI - 45) * Math.PI / 180;
        this.context.save();
        this.context.translate(this.actualStart.x, this.actualStart.y);
        this.context.rotate(angle);

        this.func(
            0,
            0,
            length * 2,
            length * 2,
        );

        this.context.restore();
    }
}
