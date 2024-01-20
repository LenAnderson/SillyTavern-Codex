// eslint-disable-next-line no-unused-vars
import { Point } from '../../Point.js';
import { Pencil } from './Pencil.js';

export class Eraser extends Pencil {
    /**@type {HTMLCanvasElement}*/ targetCanvas;
    /**@type {Number}*/ smoothRadiusOriginal = 5;
    /**@type {Boolean}*/ smoothCatchupOriginal = true;




    /**
     *
     * @param {Point} point
     */
    start(point) {
        this.targetCanvas.style.display = 'none';
        this.smoothRadiusOriginal = this.smoothRadius;
        this.smoothRadius = 0;
        this.smoothCatchupOriginal = this.smoothCatchup;
        this.smoothCatchup = false;
        this.context.drawImage(this.targetCanvas, 0, 0);
        this.context.globalCompositeOperation = 'destination-out';
        const result = super.start(point);
        return result;
    }

    /**
     *
     * @param {Point} point
     */
    stop(point) {
        const result = super.stop(point);
        this.context.globalCompositeOperation = 'source-over';
        this.smoothRadius = this.smoothRadiusOriginal;
        this.smoothCatchup = this.smoothCatchupOriginal;
        this.targetCanvas.style.display = '';
        return result;
    }
}
