import { Shape } from './Shape.js';




export class Line extends Shape {
    fromCenter = false;
    square = false;
    actualStart;
    actualEnd;
    bendPoint;
    bending = false;
    _fill = false;


    get fill() { return this._fill; }
    set fill(value) {
        this._fill = value;
        if (!value) {
            this.bending = false;
        }
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




    drawPath(path, target = null) {
        if (path.length == 2) {
            super.drawPath(path, target);
        } else if (path.length == 3) {
            const c = this.context;
            this.context = target ?? this.context;
            this.actualStart = path[0];
            this.actualEnd = path[2];
            this.drawActualCurve(path[1]);
            this.context = c;
        }
    }




    draw(point) {
        if (this.bending) {
            this.drawActualCurve(point);
        } else {
            if (this.fromCenter) {
                if (this.square) {
                    this.drawSquareFromCenter(point);
                } else {
                    this.drawRectFromCenter(point);
                }
            } else {
                if (this.square) {
                    this.drawSquare(point);
                } else {
                    this.drawRect(point);
                }
            }
        }
    }

    start(point) {
        if (this.bending) {
            this.bendPoint = point;
        } else {
            this.memorize();
            super.start(point);
        }
        this.setupStyle();
        return true;
    }

    stop(point) {
        this.drawShape(point);
        if (this.bending) {
            this.path = [this.actualStart, point, this.actualEnd];
            this.bending = false;
            this.inProgress = false;
        } else {
            this.path = [this.startPoint, point];
            if (this.fill) {
                this.bending = true;
                this.inProgress = true;
                return false;
            }
        }
        return true;
    }



    setupStyle() {
        this.context.lineWidth = this.width;
        this.context.lineJoin = 'round';
        this.context.lineCap = 'round';
        this.context.strokeStyle = this.color;
    }

    drawActualCurve(point) {
        this.setupStyle();
        this.context.beginPath();
        this.context.moveTo(this.actualStart.x, this.actualStart.y);
        this.context.quadraticCurveTo(point.x, point.y, this.actualEnd.x,this.actualEnd.y);
        this.context.stroke();
        this.context.closePath();
    }
    drawActualLine() {
        this.setupStyle();
        this.context.beginPath();
        this.context.moveTo(this.actualStart.x, this.actualStart.y);
        this.context.lineTo(this.actualEnd.x, this.actualEnd.y);
        this.context.stroke();
        this.context.closePath();
    }



    drawRect(point) {
        this.actualStart = this.startPoint;
        this.actualEnd = point;
        this.drawActualLine();
    }

    drawRectFromCenter(point) {
        this.actualStart = {
            x: this.startPoint.x - (point.x - this.startPoint.x),
            y: this.startPoint.y - (point.y - this.startPoint.y),
        };
        this.actualEnd = {
            x: this.actualStart.x + (point.x - this.startPoint.x) * 2,
            y: this.actualStart.y + (point.y - this.startPoint.y) * 2,
        };
        this.drawActualLine();
    }

    drawSquare(point) {
        let angle = Math.atan2(point.y - this.startPoint.y, point.x - this.startPoint.x) * 180 / Math.PI;
        let sector = Math.abs(Math.round(angle / 45));
        let lengthHorizontal = Math.abs(point.x - this.startPoint.x);
        let lengthVertical = Math.abs(point.y - this.startPoint.y);
        this.actualStart = this.startPoint;
        switch (sector) {
            case 0:
            case 4: {
                this.actualEnd = {
                    x: this.startPoint.x + lengthHorizontal * (point.x - this.startPoint.x > 0 ? 1 : -1),
                    y: this.startPoint.y,
                };
                break;
            }
            case 2: {
                this.actualEnd = {
                    x: this.startPoint.x,
                    y: this.startPoint.y + lengthVertical * (point.y - this.startPoint.y > 0 ? 1 : -1),
                };
                break;
            }
            case 1:
            case 3: {
                let length = Math.min(Math.abs(point.x - this.startPoint.x), Math.abs(point.y - this.startPoint.y));
                this.actualEnd = {
                    x: this.startPoint.x + length * (point.x - this.startPoint.x > 0 ? 1 : -1),
                    y: this.startPoint.y + length * (point.y - this.startPoint.y > 0 ? 1 : -1),
                };
                break;
            }
        }
        this.drawActualLine();
    }

    drawSquareFromCenter(point) {
        let angle = Math.atan2(point.y - this.startPoint.y, point.x - this.startPoint.x) * 180 / Math.PI;
        let sector = Math.abs(Math.round(angle / 45));
        let lengthHorizontal = Math.abs(point.x - this.startPoint.x);
        let lengthVertical = Math.abs(point.y - this.startPoint.y);
        switch (sector) {
            case 0:
            case 4: {
                this.actualStart = {
                    x: this.startPoint.x - lengthHorizontal,
                    y: this.startPoint.y,
                };
                this.actualEnd = {
                    x: this.startPoint.x + lengthHorizontal,
                    y: this.startPoint.y,
                };
                break;
            }
            case 2: {
                this.actualStart = {
                    x: this.startPoint.x,
                    y: this.startPoint.y - lengthVertical,
                };
                this.actualEnd = {
                    x: this.startPoint.x,
                    y: this.startPoint.y + lengthVertical,
                };
                break;
            }
            case 1:
            case 3: {
                let length = Math.min(Math.abs(point.x - this.startPoint.x), Math.abs(point.y - this.startPoint.y));
                this.actualStart = {
                    x: this.startPoint.x - length * (point.x - this.startPoint.x > 0 ? 1 : -1),
                    y: this.startPoint.y - length * (point.y - this.startPoint.y > 0 ? 1 : -1),
                };
                this.actualEnd = {
                    x: this.startPoint.x + length * (point.x - this.startPoint.x > 0 ? 1 : -1),
                    y: this.startPoint.y + length * (point.y - this.startPoint.y > 0 ? 1 : -1),
                };
                break;
            }
        }
        this.drawActualLine();
    }
}
