// eslint-disable-next-line no-unused-vars
import { Point } from '../../Point.js';




export class Tool {
    /**@type {CanvasRenderingContext2D}*/ context;
    /**@type {CanvasRenderingContext2D}*/ baseContext;
    /**@type {Number}*/ width;
    /**@type {String}*/ color;
    /**@type {Point[]}*/ path;




    /**
     *
     * @param {Point} point
     */
    start(point) {
        throw new Error(`${this.constructor.name}.start is not implemented!`);
    }

    /**
     *
     * @param {Point} point
     */
    move(point) {
        throw new Error(`${this.constructor.name}.move is not implemented!`);
    }

    /**
     *
     * @param {Point} point
     */
    stop(point) {
        throw new Error(`${this.constructor.name}.stop is not implemented!`);
    }

    /**
     *
     * @param {Point} point
     */
    draw(point) {
        throw new Error(`${this.constructor.name}.draw is not implemented!`);
    }

    /**
     *
     * @param {Point[]} path
     * @param {CanvasRenderingContext2D} target
     */
    drawPath(path, target = null) {
        const c = this.context;
        this.context = target ?? this.context;
        let firstPoint = path.shift();
        this.start(firstPoint);
        while (path.length > 1) this.move(path.shift());
        if (path.length > 0) this.stop(path.shift());
        else this.stop(firstPoint);
        this.context = c;
    }
}
