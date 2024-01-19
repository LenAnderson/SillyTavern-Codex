import { Tool } from './Tool.js';




export class Shape extends Tool {
    memory;
    startPoint;
    endPoint;
    fill = false;




    move(point) {
        this.drawShape(point);
        return false;
    }


    start(point) {
        this.memorize();
        this.startPoint = point;

        if (this.fill) {
            this.context.fillStyle = this.color;
        } else {
            this.context.lineWidth = this.width;
            this.context.lineJoin = 'round';
            this.context.lineCap = 'round';
            this.context.strokeStyle = this.color;
        }
        return true;
    }


    stop(point) {
        this.drawShape(point);
        this.path = [this.startPoint, point];
        return true;
    }


    drawShape(point) {
        this.restore();
        this.draw(point);
    }




    memorize() {
        this.memory = this.context.getImageData(0,0, this.context.canvas.width, this.context.canvas.height);
    }

    restore() {
        if (this.memory) this.context.putImageData(this.memory, 0,0);
    }

    forget() {
        this.memory = undefined;
    }
}
