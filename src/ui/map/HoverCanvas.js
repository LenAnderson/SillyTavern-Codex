// eslint-disable-next-line no-unused-vars
import { warn } from '../../lib/log.js';
import { Zone } from './Zone.js';




export class HoverCanvas {
    /**@type {Zone}*/ zone;
    /**@type {HTMLCanvasElement}*/ canvas;
    /**@type {CanvasRenderingContext2D}*/ context;

    get width() { return this.canvas.width; }
    get height() { return this.canvas.height; }




    constructor(zone, canvas, paint = null) {
        this.zone = zone;
        this.canvas = canvas;

        this.context = canvas.getContext('2d');
        this.canvas.setAttribute('data-zone', zone.label);

        this.applyPaint(paint);
    }

    async applyPaint(paint) {
        if (paint) {
            try {
                const img = new Image();
                await new Promise(resolve=>{
                    img.addEventListener('load', resolve);
                    img.addEventListener('error', resolve);
                    img.src = paint;
                    if (img.complete) resolve();
                });
                this.context.drawImage(img, 0, 0);
            } catch (ex) {
                warn('PAINT FAILED', ex);
            }
        }
    }


    clear() {
        this.context.clearRect(0, 0, this.width, this.height);
    }
}
