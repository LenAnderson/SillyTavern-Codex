import { warn } from '../../../lib/log.js';
import { PaintLayer } from '../PaintLayer.js';
import { Point } from '../Point.js';
import { Zone } from '../Zone.js';
import { quickHull } from '../../../lib/QuickHull.js';




export class Layer {
    /**@type {Number}*/ width;
    /**@type {Number}*/ height;
    /**@type {Number}*/ index;
    /**@type {String}*/ name;

    /**@type {Boolean}*/ isZone = false;
    /**@type {Boolean}*/ isLocked = false;
    /**@type {Zone}*/ zone;

    /**@type {HTMLCanvasElement}*/ canvas;
    /**@type {CanvasRenderingContext2D}*/ context;
    /**@type {CanvasRenderingContext2D}*/ thumbContext;
    /**@type {ImageData[]}*/ history = [];
    /**@type {Number}*/ historyIndex = -1;




    constructor(width, height, index) {
        this.width = width;
        this.height = height;
        this.index = index;
        this.name = `Layer ${this.index}`;
    }


    toPaintLayer() {
        return PaintLayer.from({
            isZone: this.isZone,
            isLocked: this.isLocked,
            paint: this.canvas.toDataURL(),
            zone: this.generateZone()?.toJSON(),
        });
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
    dist(l1, l2, p) {
        const a = Math.sqrt(Math.pow(p.x - l2.x,2) + Math.pow(p.y - l2.y,2));
        const b = Math.sqrt(Math.pow(p.x - l1.x,2) + Math.pow(p.y - l1.y,2));
        const c = Math.sqrt(Math.pow(l2.x - l1.x,2) + Math.pow(l2.y - l1.y,2));
        let dist;
        if (b ** 2 > a ** 2 + c ** 2) {
            dist = a;
        } else if (a ** 2 > b ** 2 + c ** 2) {
            dist = b;
        } else {
            const s = (a + b + c) / 2;
            dist = 2 / c * Math.sqrt(s * (s - a) * (s - b) * (s - c));
        }
        return dist;
    }

    generateZone() {
        if (!this.isZone) return null;
        let zone = this.zone ?? new Zone();
        zone.label = this.name;
        if (this.isLocked && zone.polygon?.length) {
            return zone;
        }
        const data = this.history[this.historyIndex].data;
        const points = [];
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] <= 0) continue;
            points.push(Point.from({ x:(i / 4) % this.width, y:Math.floor(i / 4 / this.width) }));
        }
        zone.polygon = quickHull(points);
        const xMin = Math.min(...zone.polygon.map(it=>it.x));
        const xMax = Math.max(...zone.polygon.map(it=>it.x));
        const yMin = Math.min(...zone.polygon.map(it=>it.y));
        const yMax = Math.max(...zone.polygon.map(it=>it.y));
        const center = Point.from({
            x: xMin + (xMax - xMin) / 2,
            y: yMin + (yMax - yMin) / 2,
        });
        for (const zp of zone.polygon) {
            const t = this.translateByAngle(zp, this.angleBetween(center, zp), 40);
            zp.x = t.x;
            zp.y = t.y;
        }
        const poly = [];
        let prev;
        let open;
        let prevAngle;
        let i = -1;
        for (const zp of [...zone.polygon, zone.polygon[0]] ) {
            i++;
            if (!prev) {
                poly.push(zp);
                prev = zp;
                open = null;
                prevAngle = null;
                continue;
            }
            const dist = this.distanceBetween(prev, zp);
            const angle = Math.abs(this.angleBetween(prev, zp)) * 180 / Math.PI;
            let da;
            if (prevAngle === null) {
                prevAngle = angle;
                open = zp;
                continue;
            } else {
                da = Math.abs(prevAngle - angle);
                da = Math.abs(Math.sin(this.angleBetween(prev, zp) - prevAngle / 180 * Math.PI) * dist);
            }
            if (dist < 20) {
                open = zp;
                continue;
            }
            if (da && da < 30) {
                open = zp;
                continue;
            }
            poly.push(open);
            prevAngle = this.angleBetween(open, zp) * 180 / Math.PI;
            prev = open;
            open = zp;
        }
        const last = zone.polygon.slice(-1)[0];
        if (!poly.includes(last)) poly.push(last);
        zone.polygon = poly.filter((it,idx)=>poly.indexOf(it) == idx);
        if (this.distanceBetween(zone.polygon[0], zone.polygon.slice(-1)[0]) < 20) zone.polygon.splice(-1, 1);
        return zone;
    }
    angleBetween(p1, p2) {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }
    distanceBetween(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }
    translateByAngle(point, angle, distance) {
        return Point.from({
            x: point.x + Math.cos(angle) * distance,
            y: point.y + Math.sin(angle) * distance,
        });
    }


    /**
     *
     * @param {String} paint
     */
    async render(paint = null) {
        if (!this.canvas) {
            const canvas = document.createElement('canvas'); {
                this.canvas = canvas;
                canvas.classList.add('stcdx--painter-layer');
                canvas.width = this.width;
                canvas.height = this.height;
                this.context = canvas.getContext('2d');
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
            this.memorize();
        }
        return this.canvas;
    }

    unrender() {
        this.canvas.remove();
    }


    clear() {
        this.context.clearRect(0, 0, this.width, this.height);
        this.updateThumb();
    }


    memorize() {
        while (this.history.length > this.historyIndex + 1) this.history.pop();
        this.history.push(this.context.getImageData(0, 0, this.width, this.height));
        while (this.history.length > 20) this.history.shift();
        this.historyIndex = this.history.length - 1;
        this.updateThumb();
    }

    undo() {
        if (this.history.length > 0 && this.historyIndex > 0) {
            this.historyIndex--;
            this.context.putImageData(this.history[this.historyIndex], 0, 0);
            this.updateThumb();
        }
    }

    redo() {
        if (this.history.length > 0 && this.historyIndex + 1 < this.history.length) {
            this.historyIndex++;
            this.context.putImageData(this.history[this.historyIndex], 0, 0);
            this.updateThumb();
        }
    }

    updateThumb() {
        if (!this.thumbContext) return;
        this.thumbContext.clearRect(0, 0, this.thumbContext.canvas.width, this.thumbContext.canvas.height);
        this.thumbContext.drawImage(this.canvas, 0, 0, this.thumbContext.canvas.width, this.thumbContext.canvas.width);
    }
}
