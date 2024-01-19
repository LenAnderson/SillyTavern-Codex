import { Point } from '../../Point.js';
import { Tool } from './Tool.js';




export class Brush extends Tool {
    /**@type {Number}*/ stepDist = 20;

    /**@type {Number}*/ smoothRadius = 5;
    /**@type {Boolean}*/ smoothCatchup = true;
    /**@type {Point}*/ strokePoint;


    get actWidth() { return this.width * 1.25; }

    /**
     *
     * @param {Point} point
     */
    move(point) {
        this.path.push(point);

        const oldP = this.strokePoint;
        const newP = this.path.slice(-1)[0];
        const dist = this.distanceBetween(oldP, newP);
        const angle = this.angleBetween(oldP, newP);
        if (dist >= this.smoothRadius) {
            const strokeP = this.translateByAngle(oldP, angle, dist - this.smoothRadius);
            const strokeDist = this.distanceBetween(oldP, strokeP);
            if (strokeDist > this.actWidth / this.stepDist) {
                this.draw(strokeP);
                this.strokePoint = strokeP;
            }
        }
        return true;
    }




    /**
     *
     * @param {Point} point
     */
    start(point) {
        this.strokePoint = point;
        this.path = [point];
        this.lastPoint = point;
        return true;
    }

    /**
     *
     * @param {Point} point
     */
    stop(point) {
        if (this.smoothCatchup || this.path.length == 1) {
            this.path.push(point);
            this.draw(point);
        }
        this.lastPoint = null;
        return true;
    }

    /**
     *
     * @param {Point} point
     */
    draw(point) {
        const dist = this.distanceBetween(this.lastPoint, point);
        const angle = this.angleBetween(this.lastPoint, point);
        for (let i = 0; i <= dist; i += this.actWidth / this.stepDist) {
            const x = this.lastPoint.x + Math.cos(angle) * i;
            const y = this.lastPoint.y + Math.sin(angle) * i;
            const gradient = this.context.createRadialGradient(x,y,0, x,y,this.actWidth / 2);
            gradient.addColorStop(0, this.color.replace(/^(rgba\(\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*)(\d+)(\))/, '$1 0.125 $3'));
            gradient.addColorStop(0.75, this.color.replace(/^(rgba\(\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*)(\d+)(\))/, '$1 0.0625 $3'));
            gradient.addColorStop(1, this.color.replace(/^(rgba\(\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*)(\d+)(\))/, '$1 0 $3'));
            this.context.fillStyle = gradient;
            this.context.fillRect(x - this.actWidth / 2, y - this.actWidth / 2, this.actWidth, this.actWidth);
        }
        this.lastPoint = point;
    }




    distanceBetween(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    angleBetween(p1, p2) {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }

    translateByAngle(point, angle, distance) {
        return Point.from({
            x: point.x + Math.cos(angle) * distance,
            y: point.y + Math.sin(angle) * distance,
        });
    }
}
