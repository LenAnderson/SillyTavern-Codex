// eslint-disable-next-line no-unused-vars
import { Settings } from '../../Settings.js';
import { warn } from '../../lib/log.js';
import { PaintLayer } from './PaintLayer.js';
import { Point } from './Point.js';
// eslint-disable-next-line no-unused-vars
import { Zone } from './Zone.js';




export class MapBase {
    /**@type {Settings}*/ settings;
    /**@type {HTMLImageElement}*/ image;
    /**@type {Zone[]}*/ zoneList;
    /**@type {PaintLayer[]}*/ paintList = [];

    /**@type {Zone}*/ zone;

    /**@type {HTMLElement}*/ dom;

    /**@type {HTMLCanvasElement}*/ mapCanvas;
    /**@type {HTMLCanvasElement}*/ hoverCanvas;
    /**@type {HTMLCanvasElement[]}*/ paintCanvasList = [];
    /**@type {CanvasRenderingContext2D}*/ mapContext;
    /**@type {CanvasRenderingContext2D}*/ hoverContext;
    /**@type {CanvasRenderingContext2D[]}*/ paintContextList = [];

    get combinedZoneList() {
        return [...this.zoneList, ...this.paintList.filter(it=>it.isZone).map(it=>it.zone)];
    }




    constructor(settings, image, zoneList, paintList = []) {
        this.settings = settings;
        this.image = image;
        this.zoneList = zoneList;
        this.paintList = paintList;
        zoneList.forEach(it=>it.init());
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
        for (const zone of this.combinedZoneList) {
            if (this.pip(zone.polygon, p)) {
                return zone;
            }
        }
    }

    drawImageInsidePolygon(con, img, polygon) {
        const minX = polygon.reduce((min,p)=>Math.min(min,p.x),Number.MAX_SAFE_INTEGER);
        const minY = polygon.reduce((min,p)=>Math.min(min,p.y),Number.MAX_SAFE_INTEGER);
        const maxX = polygon.reduce((max,p)=>Math.max(max,p.x),0);
        const maxY = polygon.reduce((max,p)=>Math.max(max,p.y),0);

        const imgAspect = img.naturalWidth / img.naturalHeight;
        const zoneW = maxX - minX;
        const zoneH = maxY - minY;
        const zoneAspect = zoneW / zoneH;
        let targetW;
        let targetH;
        let targetX;
        let targetY;
        if (zoneAspect > imgAspect) {
            // zone is wider than img -> center horizontally
            targetH = zoneH;
            targetW = zoneH * imgAspect;
            targetX = minX + (zoneW - targetW) / 2;
            targetY = minY;
        } else {
            // zone is narrower than img -> center vertically
            targetW = zoneW;
            targetH = zoneW / imgAspect;
            targetX = minX;
            targetY = minY + (zoneH - targetH) / 2;
        }
        con.save();
        con.beginPath();
        con.moveTo(polygon.slice(-1)[0].x, polygon.slice(-1)[0].y);
        for (const p of polygon) {
            con.lineTo(p.x, p.y);
        }
        con.closePath();
        con.clip();
        con.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, targetX, targetY, targetW, targetH);
        con.restore();
    }




    async render() {
        if (!this.dom) {
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
                    canvas.addEventListener('selectstart', (evt)=>evt.preventDefault());
                    canvas.addEventListener('pointermove', (evt)=>this.handleMove(evt));
                    canvas.addEventListener('pointerdown', (evt)=>this.handlePointerDown(evt));
                    canvas.addEventListener('pointerup', (evt)=>this.handlePointerUp(evt));
                    canvas.addEventListener('click', (evt)=>this.handleClick(evt));
                    canvas.addEventListener('contextmenu', (evt)=>this.handleContext(evt));
                    mapCont.append(canvas);
                }
                await this.renderPaint();
                const hover = document.createElement('canvas'); {
                    this.hoverCanvas = hover;
                    hover.classList.add('stcdx--hover');
                    hover.width = this.image.naturalWidth;
                    hover.height = this.image.naturalHeight;
                    this.hoverContext = hover.getContext('2d');
                    mapCont.append(hover);
                }
            }
        }
        return this.dom;
    }

    async rerenderPaint() {
        while (this.paintCanvasList.length > 0) {
            const pc = this.paintCanvasList.pop();
            pc.remove();
        }
        await this.renderPaint();
    }
    async renderPaint() {
        for (const p of this.paintList) {
            if (p.isZone) continue;
            const paint = document.createElement('canvas'); {
                this.paintCanvasList.push(paint);
                paint.classList.add('stcdx--paint');
                paint.width = this.image.naturalWidth;
                paint.height = this.image.naturalHeight;
                const con = paint.getContext('2d');
                this.paintContextList.push(con);
                try {
                    const img = new Image();
                    await new Promise(resolve=>{
                        img.addEventListener('load', resolve);
                        img.addEventListener('error', resolve);
                        img.src = p.paint;
                        if (img.complete) resolve();
                    });
                    con.drawImage(img, 0, 0);
                } catch (ex) {
                    warn('PAINT FAILED', ex);
                }
                this.dom.append(paint);
            }
        }
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
