// eslint-disable-next-line no-unused-vars
import { Zone } from './Zone.js';




export class HoverCanvas {
    /**@type {Zone}*/ zone;
    /**@type {HTMLCanvasElement}*/ canvas;
    /**@type {CanvasRenderingContext2D}*/ context;

    get width() { return this.canvas.width; }
    get height() { return this.canvas.height; }




    constructor(zone, canvas) {
        this.zone = zone;
        this.canvas = canvas;

        this.context = canvas.getContext('2d');
        this.canvas.setAttribute('data-zone', zone.label);
    }


    clear() {
        this.context.clearRect(0, 0, this.width, this.height);
    }
}
