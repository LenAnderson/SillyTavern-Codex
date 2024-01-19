import { Point } from '../../Point.js';
import { Tool } from './Tool.js';




export class Pencil extends Tool {
    /**@type {Number}*/ smoothRadius = 5;
    /**@type {Boolean}*/ smoothCatchup = true;
    /**@type {Point}*/ strokePoint;




    /**
     *
     * @param {Point} point
     */
    start(point) {
        this.strokePoint = point;
        this.path = [point];
        this.context.lineWidth = this.width;
        this.context.lineJoin = 'round';
        this.context.lineCap = 'round';
        this.context.strokeStyle = this.color;
        this.context.beginPath();
        this.context.moveTo(point.x, point.y);
        this.point = point;
        return true;
    }

    /**
     *
     * @param {Point} point
     */
    move(point) {
        this.path.push(point);
        this.point = point;

        const oldP = this.strokePoint;
        const newP = this.path.slice(-1)[0];
        const dist = this.distanceBetween(oldP, newP);
        const angle = this.angleBetween(oldP, newP);
        if (dist >= this.smoothRadius) {
            const strokeP = this.translateByAngle(oldP, angle, dist - this.smoothRadius);
            this.draw(strokeP);
            this.strokePoint = strokeP;
        }
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
        this.context.closePath();
        return true;
    }

    /**
     *
     * @param {Point} point
     */
    draw(point) {
        const oldP = this.strokePoint;
        this.context.closePath();
        this.context.beginPath();
        this.context.moveTo(oldP.x, oldP.y);
        this.context.lineWidth = this.width;
        this.context.strokeStyle = this.color;
        this.context.lineTo(point.x, point.y);
        this.context.stroke();
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
