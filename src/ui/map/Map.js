import { delay } from '../../../../../../utils.js';
import { log } from '../../lib/log.js';
import { MapBase } from './MapBase.js';




export class Map extends MapBase {
    /**@type {Object}*/ hovers = {};
    /**@type {HTMLCanvasElement[]}*/ activeHovers = [];

    /**@type {Function}*/ onZoneHover;
    /**@type {Function}*/ onZoneClick;
    /**@type {Function}*/ onZoneContext;


    async handleMove(evt) {
        const p = this.getPoint(evt);
        let newZone;
        for (const zone of this.zoneList) {
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
            const canvas = this.hovers[zone.label] ?? this.hoverCanvas.cloneNode(true);
            this.hovers[zone.label] = canvas;
            nc = canvas;
            const con = canvas.getContext('2d');
            this.hoverCanvas.insertAdjacentElement('afterend', canvas);
            const last = zone.polygon.slice(-1)[0];
            con.clearRect(0, 0, canvas.width, canvas.height);
            con.save();
            con.beginPath();
            con.moveTo(last.x, last.y);
            for (const p of zone.polygon) {
                con.lineTo(p.x, p.y);
            }
            con.closePath();
            con.clip();
            if (zone.url) {
                const minX = zone.polygon.reduce((min,p)=>Math.min(min,p.x),Number.MAX_SAFE_INTEGER);
                const minY = zone.polygon.reduce((min,p)=>Math.min(min,p.y),Number.MAX_SAFE_INTEGER);
                const maxX = zone.polygon.reduce((max,p)=>Math.max(max,p.x),0);
                const maxY = zone.polygon.reduce((max,p)=>Math.max(max,p.y),0);
                const img = new Image();
                await new Promise(resolve=>{
                    img.addEventListener('load', resolve);
                    img.addEventListener('error', resolve);
                    img.src = zone.url;
                    if (img.complete) resolve();
                });
                const imgAspect = img.naturalWidth / img.naturalHeight;
                const imgW = img.naturalWidth;
                const imgH = img.naturalHeight;
                const zoneW = maxX-minX;
                const zoneH = maxY-minY;
                const zoneAspect = zoneW/zoneH;
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
                con.moveTo(zone.polygon.slice(-1)[0].x, zone.polygon.slice(-1)[0].y);
                for (const p of zone.polygon) {
                    con.lineTo(p.x, p.y);
                }
                con.closePath();
                con.clip();
                con.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, targetX, targetY, targetW, targetH);
                con.restore();
                canvas.classList.add('stcdx--fade');
            }
            else {
                con.drawImage(this.image, 0, 0);
            }
            con.restore();
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
        {
            const cc = [];
            while (this.activeHovers.length > 0) cc.push(this.activeHovers.pop());
            cc.forEach(async(canvas)=>{
                canvas.classList.remove('stcdx--hovered');
                await delay(this.settings.mapZoneZoomTime + 10);
                if (this.activeHovers.includes(canvas)) return;
                canvas.remove();
            });
        }
        if (nc) {
            this.activeHovers.push(nc);
        } else {
            this.mapCanvas.style.cursor = '';
        }
    }
}
