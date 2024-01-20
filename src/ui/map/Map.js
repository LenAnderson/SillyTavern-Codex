import { delay } from '../../../../../../utils.js';
import { log, warn } from '../../lib/log.js';
import { HoverCanvas } from './HoverCanvas.js';
import { MapBase } from './MapBase.js';




export class Map extends MapBase {
    /**@type {Object}*/ hovers = {};
    /**@type {HTMLCanvasElement[]}*/ activeHovers = [];

    /**@type {HoverCanvas[]}*/ hoverList = [];

    /**@type {Function}*/ onZoneHover;
    /**@type {Function}*/ onZoneClick;
    /**@type {Function}*/ onZoneContext;




    async render() {
        const hadDom = this.dom;
        await super.render();
        for (const paintCanvas of this.paintCanvasList) {
            this.mapContext.drawImage(paintCanvas, 0, 0);
            paintCanvas.remove();
        }
        if (!hadDom) {
            log('DID NOT HAVE DOM');
            for (const zone of this.zoneList) {
                const hc = new HoverCanvas(zone, this.hoverCanvas.cloneNode(true));
                this.hoverCanvas.insertAdjacentElement('afterend', hc.canvas);
                this.hoverList.push(hc);
            }
            for (const p of this.paintList) {
                if (!p.zone) continue;
                const zone = p.zone;
                const hc = new HoverCanvas(zone, this.hoverCanvas.cloneNode(true), p.paint);
                this.hoverCanvas.insertAdjacentElement('afterend', hc.canvas);
                this.hoverList.push(hc);
            }
        }
        this.updateHover();
        return this.dom;
    }


    async handleMove(evt) {
        const p = this.getPoint(evt);
        let newZone;
        for (const zone of this.combinedZoneList) {
            if (this.pip(zone.polygon, p)) {
                newZone = zone;
                break;
            }
        }
        if (this.zone != newZone) {
            log('ZONE:', newZone?.label, newZone);
            this.zone = newZone;
            this.updateHover();
            if (this.onZoneHover) {
                this.onZoneHover(this.zone, evt);
            }
        }
    }
    async handlePointerDown(evt) {}
    async handlePointerUp(evt) {}
    async handleClick(evt) {
        if (this.zone) {
            log('ZONECLICK:', this.zone.label, this.zone);
            evt.stopPropagation();
            if (this.onZoneClick) {
                this.onZoneClick(this.zone, evt);
            }
        }
    }
    async handleContext(evt) {
        if (this.zone) {
            log('ZONECONTEXT:', this.zone.label, this.zone);
            evt.stopPropagation();
            if (this.onZoneContext) {
                this.onZoneContext(this.zone, evt);
            }
        }
    }

    async updateHover() {
        const zone = this.zone;
        let nc;
        if (zone) {
            /**@type {HTMLCanvasElement} */
            let canvas = this.hoverList.find(it=>it.zone == zone).canvas;
            this.hovers[zone.label] = canvas;
            nc = canvas;
            const con = canvas.getContext('2d');
            const last = zone.polygon.slice(-1)[0];
            if (zone.url) {
                con.clearRect(0, 0, canvas.width, canvas.height);
                this.drawImageInsidePolygon(con, await zone.getImage(), zone.polygon);
                if (!zone.isAlwaysVisible) {
                    canvas.classList.add('stcdx--fade');
                } else {
                    canvas.classList.remove('stcdx--fade');
                }
            } else if (this.paintList.find(it=>it.zone == zone)) {
                // just zoom and unfade
            } else {
                con.clearRect(0, 0, canvas.width, canvas.height);
                con.save();
                con.beginPath();
                con.moveTo(last.x, last.y);
                for (const p of zone.polygon) {
                    con.lineTo(p.x, p.y);
                }
                con.closePath();
                con.clip();
                con.drawImage(this.mapCanvas, 0, 0);
                con.restore();
            }
            const cx = (zone.polygon.reduce((max,p)=>Math.max(max,p.x),0) - zone.polygon.reduce((min,p)=>Math.min(min,p.x),canvas.width)) / 2 + zone.polygon.reduce((min,p)=>Math.min(min,p.x),canvas.width);
            const cy = (zone.polygon.reduce((max,p)=>Math.max(max,p.y),0) - zone.polygon.reduce((min,p)=>Math.min(min,p.y),canvas.height)) / 2 + zone.polygon.reduce((min,p)=>Math.min(min,p.y),canvas.height);
            canvas.style.transformOrigin = `${cx / canvas.width * 100}% ${cy / canvas.height * 100}%`;
            if (zone.overrideZoom) canvas.style.setProperty('--stcdx--mapZoom', `${zone.zoom}`);
            else canvas.style.removeProperty('--stcdx--mapZoom');
            if (zone.overrideShadow) canvas.style.setProperty('--stcdx--mapShadow', `${zone.shadow}`);
            else canvas.style.removeProperty('--stcdx--mapShadow');
            if (zone.overrideShadowColor) canvas.style.setProperty('--stcdx--mapShadowColor', `${zone.shadowColor}`);
            else canvas.style.removeProperty('--stcdx--mapShadowColor');
            canvas.classList.add('stcdx--hovered');
            this.mapCanvas.style.cursor = 'pointer';
        }
        if (!nc) {
            this.mapCanvas.style.cursor = '';
        }
        for (const hc of this.hoverList) {
            if (hc.zone.url && hc.zone.isAlwaysVisible && hc.zone != this.zone) {
                hc.clear();
                this.drawImageInsidePolygon(hc.context, await hc.zone.getImage(), hc.zone.polygon);
            }
            if (hc.zone != this.zone && hc.canvas.classList.contains('stcdx--hovered')) {
                hc.canvas.classList.remove('stcdx--hovered');
                await delay(this.settings.mapZoneZoomTime + 10);
                if (hc.zone != this.zone && (!hc.zone.url || !hc.zone.isAlwaysVisible)) {
                    if (this.paintList.find(it=>it.zone == hc.zone)) {
                        // leave it
                    } else {
                        hc.clear();
                    }
                }
            }
        }
    }
}
