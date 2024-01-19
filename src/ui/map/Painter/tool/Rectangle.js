import { Shape } from './Shape.js';




export class Rectangle extends Shape {
    fromCenter = false;
    square = false;
    rotate = false;
    actualStart;
    actualEnd;
    realStart;


    get func() {
        if (this.fill) {
            return this.context.fillRect.bind(this.context);
        }
        return this.context.strokeRect.bind(this.context);
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
                    this.rotate = true;
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
    }


    drawRect() {
        this.actualStart = this.startPoint;
        this.actualEnd = this.endPoint;
        this.func(
            this.startPoint.x,
            this.startPoint.y,
            this.endPoint.x - this.startPoint.x,
            this.endPoint.y - this.startPoint.y,
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
        this.func(
            this.startPoint.x - (this.endPoint.x - this.startPoint.x),
            this.startPoint.y - (this.endPoint.y - this.startPoint.y),
            (this.endPoint.x - this.startPoint.x) * 2,
            (this.endPoint.y - this.startPoint.y) * 2,
        );
    }


    drawSquare() {
        let length = Math.min(Math.abs(this.endPoint.x - this.startPoint.x), Math.abs(this.endPoint.y - this.startPoint.y));
        this.actualStart = this.startPoint;
        this.actualEnd = {
            x: this.startPoint.x + length * (this.endPoint.x - this.startPoint.x > 0 ? 1 : -1),
            y: this.startPoint.y + length * (this.endPoint.y - this.startPoint.y > 0 ? 1 : -1),
        };
        this.func(
            this.startPoint.x,
            this.startPoint.y,
            length * (this.endPoint.x - this.startPoint.x > 0 ? 1 : -1),
            length * (this.endPoint.y - this.startPoint.y > 0 ? 1 : -1),
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
        this.func(
            this.startPoint.x - length,
            this.startPoint.y - length,
            length * 2,
            length * 2,
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
