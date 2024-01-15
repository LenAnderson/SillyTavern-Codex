// eslint-disable-next-line no-unused-vars
import { Settings } from '../../Settings.js';
import { Point } from './Point.js';
// eslint-disable-next-line no-unused-vars
import { Zone } from './Zone.js';




export class MapBase {
    /**@type {Settings}*/ settings;
    /**@type {HTMLImageElement}*/ image;
    /**@type {Zone[]}*/ zoneList;

    /**@type {Zone}*/ zone;

    /**@type {HTMLElement}*/ dom;

    /**@type {HTMLCanvasElement}*/ mapCanvas;
    /**@type {HTMLCanvasElement}*/ hoverCanvas;
    /**@type {CanvasRenderingContext2D}*/ mapContext;
    /**@type {CanvasRenderingContext2D}*/ hoverContext;




    constructor(settings, image, zoneList) {
        this.settings = settings;
        this.image = image;
        this.zoneList = zoneList;
    }




    pip(/**@type {Point[]}*/polygon, /**@type {Point}*/p) {
        let odd = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length ; i++) {
            if ((polygon[i].y > p.y) !== (polygon[j].y > p.y) && (p.x < ((polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x))) {
                odd = !odd;
            }
            j = i;
        }
        return odd;
    }


    /**
     *
     * @param {PointerEvent} evt
     */
    getPoint(evt) {
        const rect = this.mapCanvas.getBoundingClientRect();
        const scale = this.mapCanvas.width / rect.width;
        const x = (evt.x - rect.left) * scale;
        const y = (evt.y - rect.top) * scale;
        const p = new Point();
        p.x = x;
        p.y = y;
        return p;
    }

    /**
     *
     * @param {PointerEvent} evt
     */
    getZone(evt) {
        const p  = this.getPoint(evt);
        for (const zone of this.zoneList) {
            if (this.pip(zone.polygon, p)) {
                return zone;
            }
        }
    }




    async render() {
        const mapCont = document.createElement('div'); {
            this.dom = mapCont;
            mapCont.classList.add('stcdx--mapContainer');
            const canvas = document.createElement('canvas'); {
                this.mapCanvas = canvas;
                canvas.classList.add('stcdx--map');
                canvas.width = this.image.naturalWidth;
                canvas.height = this.image.naturalHeight;
                this.mapContext = canvas.getContext('2d');
                this.mapContext.drawImage(this.image, 0, 0);
                canvas.addEventListener('pointermove', (evt)=>this.handleMove(evt));
                canvas.addEventListener('pointerdown', (evt)=>this.handlePointerDown(evt));
                canvas.addEventListener('pointerup', (evt)=>this.handlePointerUp(evt));
                canvas.addEventListener('click', (evt)=>this.handleClick(evt));
                canvas.addEventListener('contextmenu', (evt)=>this.handleContext(evt));
                mapCont.append(canvas);
            }
            const hover = document.createElement('canvas'); {
                this.hoverCanvas = hover;
                hover.classList.add('stcdx--hover');
                hover.width = this.image.naturalWidth;
                hover.height = this.image.naturalHeight;
                this.hoverContext = hover.getContext('2d');
                mapCont.append(hover);
            }
        }
        return this.dom;
    }



    /**
     *
     * @param {PointerEvent} evt
     */
    async handleMove(evt) {
        throw new Error(`${this.constructor.name}.handleMove is not implemented!`);
    }

    /**
     *
     * @param {PointerEvent} evt
     */
    async handlePointerDown(evt) {
        throw new Error(`${this.constructor.name}.handlePointerDown is not implemented!`);
    }

    /**
     *
     * @param {PointerEvent} evt
     */
    async handlePointerUp(evt) {
        throw new Error(`${this.constructor.name}.handlePointerUp is not implemented!`);
    }

    /**
     *
     * @param {MouseEvent} evt
     */
    async handleClick(evt) {
        throw new Error(`${this.constructor.name}.handleClick is not implemented!`);
    }

    /**
     *
     * @param {MouseEvent} evt
     */
    async handleContext(evt) {
        throw new Error(`${this.constructor.name}.handleContext is not implemented!`);
    }


    async updateHover() {
        throw new Error(`${this.constructor.name}.updateHover is not implemented!`);
    }
}
