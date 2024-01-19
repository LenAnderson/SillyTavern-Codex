import { log } from '../../lib/log.js';
// eslint-disable-next-line no-unused-vars
import { CodexMap } from '../CodexMap.js';
import { Line } from './Line.js';
import { MapBase } from './MapBase.js';
import { MapDetailsEditor } from './MapDetailsEditor.js';
import { Painter } from './Painter/Painter.js';
// eslint-disable-next-line no-unused-vars
import { Point } from './Point.js';
import { Zone } from './Zone.js';
import { ZoneEditor } from './ZoneEditor.js';




export class MapEditor extends MapBase {
    /**@type {CodexMap}*/ codexMap;

    /**@type {Painter}*/ painter;

    /**@type {HTMLElement}*/ editorDom;
    /**@type {HTMLElement}*/ painterControls;

    /**@type {Function}*/ resolver;

    /**@type {Point}*/ hoverPoint;
    /**@type {Line}*/ hoverLine;
    /**@type {Point}*/ dragPoint;
    /**@type {Point}*/ zoneDragPoint;
    /**@type {Point[]}*/ newPoly;

    /**@type {Boolean}*/ isPainting = false;
    /**@type {Boolean}*/ isDrawing = false;
    /**@type {Boolean}*/ isRectangling = false;
    /**@type {Point}*/ rectangleStart;
    /**@type {Boolean}*/ isDragging = false;
    /**@type {Boolean}*/ isStartZoneDragging = false;
    /**@type {Boolean}*/ isZoneDragging = false;

    /**@type {Function}*/ handleKeyDownBound;
    /**@type {Function}*/ handleKeyUpBound;




    /**
     * @param {CodexMap} codexMap
     */
    constructor(codexMap) {
        super(codexMap.settings, codexMap.image, codexMap.zoneList, codexMap.paintList);
        this.codexMap = codexMap;
        this.handleKeyDownBound = this.handleKeyDown.bind(this);
        this.handleKeyUpBound = this.handleKeyUp.bind(this);
    }




    getLine(evt) {
        const p = this.getPoint(evt);
        let line;
        for (const zone of this.zoneList) {
            let prev = zone.polygon.slice(-1)[0];
            for (const zp of zone.polygon) {
                const a = Math.sqrt(Math.pow(p.x - zp.x,2) + Math.pow(p.y - zp.y,2));
                const b = Math.sqrt(Math.pow(p.x - prev.x,2) + Math.pow(p.y - prev.y,2));
                const c = Math.sqrt(Math.pow(zp.x - prev.x,2) + Math.pow(zp.y - prev.y,2));
                let dist;
                if (b ** 2 > a ** 2 + c ** 2) {
                    dist = a;
                } else if (a ** 2 > b ** 2 + c ** 2) {
                    dist = b;
                } else {
                    const s = (a + b + c) / 2;
                    dist = 2 / c * Math.sqrt(s * (s - a) * (s - b) * (s - c));
                }
                if (dist < 5) {
                    line = [prev, zp];
                    return new Line(...line);
                }
                prev = zp;
            }
        }
    }




    async render() {
        if (!this.editorDom) {
            const root = document.createElement('div'); {
                this.editorDom = root;
                root.classList.add('stcdx--mapEditor');
                const menu = document.createElement('div'); {
                    menu.classList.add('stcdx--menu');
                    const painterControls = document.createElement('div'); {
                        this.painterControls = painterControls;
                        painterControls.classList.add('stcdx--painterControls');
                        menu.append(painterControls);
                    }
                    const title = document.createElement('div'); {
                        title.classList.add('stcdx--title');
                        title.textContent = `${this.codexMap.entry.book}: ${this.codexMap.entry.title}`;
                        menu.append(title);
                    }
                    const hints = document.createElement('div'); {
                        hints.classList.add('stcdx--hintList');
                        [
                            '[HELP]',
                            'hold ctrl and click to draw a new zone',
                            'hold ctrl and shift and drag to create a new rectangular zone',
                            'click into a zone to edit a zone',
                            'drag a zone to move a zone',
                            'hold alt and click into a zone to remove a zone',
                            'drag a point to move a point',
                            'click a line to add a point',
                            'hold alt and click a point to remove a point',
                        ].forEach(it=>{
                            const hint = document.createElement('div'); {
                                hint.classList.add('stcdx--hint');
                                hint.textContent = it;
                                hints.append(hint);
                            }
                        });
                        menu.append(hints);
                    }
                    const actions = document.createElement('div'); {
                        actions.classList.add('stcdx--actions');
                        const paint = document.createElement('div'); {
                            paint.classList.add('stcdx--painter');
                            paint.classList.add('menu_button');
                            paint.classList.add('menu_button_icon');
                            paint.classList.add('fa-solid');
                            paint.classList.add('fa-paintbrush');
                            paint.title = 'Draw on the map';
                            paint.addEventListener('click', ()=>{
                                this.launchPainter();
                            });
                            actions.append(paint);
                        }
                        const dets = document.createElement('div'); {
                            dets.classList.add('stcdx--details');
                            dets.classList.add('menu_button');
                            dets.classList.add('menu_button_icon');
                            dets.classList.add('fa-solid');
                            dets.classList.add('fa-pen-to-square');
                            dets.title = 'Edit map details';
                            dets.addEventListener('click', ()=>{
                                this.editDetails();
                            });
                            actions.append(dets);
                        }
                        const close = document.createElement('div'); {
                            close.classList.add('stcdx--close');
                            close.classList.add('menu_button');
                            close.classList.add('menu_button_icon');
                            close.classList.add('fa-solid');
                            close.classList.add('fa-circle-xmark');
                            close.title = 'Close map editor';
                            close.addEventListener('click', ()=>{
                                if (!this.isDrawing) {
                                    this.unrender();
                                    this.isEditing = false;
                                    this.resolver();
                                }
                            });
                            actions.append(close);
                        }
                        menu.append(actions);
                    }
                    root.append(menu);
                }
                const mc = await super.render(); {
                    root.append(mc);
                }
            }
        }
        return this.editorDom;
    }

    unrender() {
        this.editorDom?.remove();
        this.editorDom = null;
        this.dom = null;
    }


    async handleMove(evt) {
        if (this.isPainting) return;
        if (this.isDrawing && this.isRectangling && this.rectangleStart) {
            const p = this.getPoint(evt);
            this.newPoly = [
                this.rectangleStart,
                Point.from({ x:p.x, y:this.rectangleStart.y }),
                p,
                Point.from({ x:this.rectangleStart.x, y:p.y }),
            ];
            log(this.newPoly);
            this.updateHover(this.newPoly);
            return;
        }
        if (this.isDrawing) {
            return;
        }
        if (this.isDragging) {
            const p = this.getPoint(evt);
            this.dragPoint.x = p.x;
            this.dragPoint.y = p.y;
            this.updateHover();
            return;
        }
        if (this.isStartZoneDragging) {
            if (!this.isZoneDragging) {
                this.isZoneDragging = true;
            }
            const p = this.getPoint(evt);
            const dx = this.zoneDragPoint.x - p.x;
            const dy = this.zoneDragPoint.y - p.y;
            for (const zp of this.zone.polygon) {
                zp.x -= dx;
                zp.y -= dy;
            }
            this.zoneDragPoint = p;
            this.updateHover();
            return;
        }
        // handle hovering
        let needsUpdate = false;
        const p = this.getPoint(evt);
        let zone;
        const hp = this.zoneList.map(z=>z.polygon.find(it=>it.checkHover(p))).find(it=>it);
        let hl;
        if (this.hoverPoint != hp) {
            this.hoverPoint = hp;
            needsUpdate = true;
        }
        if (this.hoverPoint) {
            zone = this.zoneList.find(it=>it.polygon.includes(hp));
        } else {
            hl = this.getLine(evt);
        }
        if (this.hoverLine != hl) {
            this.hoverLine = hl;
            needsUpdate = true;
        }
        if (this.hoverLine) {
            zone = this.zoneList.find(it=>it.polygon.includes(hl.a));
        }
        if (!zone) {
            zone = this.getZone(evt);
        }
        if (this.zone != zone) {
            this.zone = zone;
            needsUpdate = true;
        }
        if (needsUpdate) {
            this.updateHover();
        }
    }
    /**
     *
     * @param {PointerEvent} evt
     */
    async handlePointerDown(evt) {
        if (this.isPainting) return;
        if (this.isDrawing && this.isRectangling) {
            this.rectangleStart = this.getPoint(evt);
            return;
        }
        if (evt.ctrlKey || evt.altKey) return;
        if (this.hoverPoint) {
            this.isDragging = true;
            this.dragPoint = this.hoverPoint;
            return;
        }
        if (this.hoverLine) {
            const p = this.getPoint(evt);
            const idxA = this.zone.polygon.indexOf(this.hoverLine.a);
            const idxB = this.zone.polygon.indexOf(this.hoverLine.b);
            let idx;
            if (Math.min(idxA, idxB) == 0 && Math.max(idxA, idxB) == this.zone.polygon.length - 1) {
                idx = 0;
            } else {
                idx = Math.max(idxA, idxB);
            }
            this.zone.polygon.splice(idx, 0, p);
            this.isDragging = true;
            this.dragPoint = p;
            this.hoverLine = null;
            return;
        }
        if (this.zone) {
            this.isStartZoneDragging = true;
            this.zoneDragPoint = this.getPoint(evt);
            return;
        }
    }
    async handlePointerUp(evt) {
        if (this.isPainting) return;
        log('UP');
        if (this.isDrawing && this.isRectangling && this.rectangleStart) {
            this.isDrawing = false;
            this.isRectangling = false;
            if (this.newPoly.length < 4) return;
            const zone = Zone.from({ polygon:this.newPoly });
            this.rectangleStart = null;
            this.newPoly = [];
            await this.editZone(zone);
            this.zoneList.push(zone);
            await this.save();
            this.updateHover();
            return;
        }
        if (this.isDragging) {
            this.isDragging = false;
            window.addEventListener('click', (evt)=>evt.stopPropagation(), { capture:true, once:true });
            this.updateHover();
            this.save();
            return;
        }
        if (this.isStartZoneDragging && !this.isZoneDragging) {
            this.isStartZoneDragging = false;
            return;
        }
        if (this.isZoneDragging) {
            this.isZoneDragging = false;
            this.isStartZoneDragging = false;
            this.zoneDragPoint = null;
            window.addEventListener('click', (evt)=>evt.stopPropagation(), { capture:true, once:true });
            this.updateHover();
            this.save();
            return;
        }
    }
    async handleClick(evt) {
        if (this.isPainting) return;
        log('CLICK');
        if (this.isDrawing) {
            const p = this.getPoint(evt);
            this.newPoly.push(p);
            this.updateHover(this.newPoly);
            return;
        }
        if (this.hoverPoint) {
            if (evt.altKey) {
                this.zone.polygon.splice(this.zone.polygon.indexOf(this.hoverPoint), 1);
                this.hoverPoint = null;
                this.updateHover();
                this.save();
                return;
            }
        }
        if (this.hoverLine) {
            return;
        }
        if (this.zone) {
            if (evt.altKey) {
                this.zoneList.splice(this.zoneList.indexOf(this.zone), 1);
                this.updateHover();
                this.save();
                return;
            }
            await this.editZone(this.zone);
            return;
        }
    }
    async handleContext(evt) {}

    async handleKeyDown(evt) {
        if (this.isPainting) return;
        if (!this.editorDom || this.isDragging) return;
        if (!this.isDrawing && evt.key == 'Control') {
            this.isDrawing = true;
            this.newPoly = [];
        }
        if (evt.key == 'Shift') {
            this.isRectangling = true;
        }
    }
    async handleKeyUp(evt) {
        if (this.isPainting) return;
        if (!this.dom || !this.isDrawing || this.isRectangling) return;
        if (evt.key == 'Control') {
            this.isDrawing = false;
            if (!this.isDragging) {
                if (this.newPoly.length > 2) {
                    const zone = Zone.from({ polygon:this.newPoly });
                    await this.editZone(zone);
                    this.zoneList.push(zone);
                    await this.save();
                }
                this.newPoly = [];
                this.updateHover();
            }
        }
    }


    /**
     *
     * @param {Point[]} poly
     */
    async updateHover(poly = null) {
        const canvas = this.hoverCanvas;
        const con = this.hoverContext;
        const pointSize = 10;
        con.clearRect(0, 0, canvas.width, canvas.height);

        for (const zone of this.zoneList) {
            let fs;
            if (zone == this.zone) {
                con.fillStyle = 'rgba(255 0 0 / 1)';
                con.strokeStyle = 'rgba(255 0 0 / 1)';
                fs = 'rgba(255 0 0 / 0.25)';
            } else {
                con.fillStyle = 'rgba(255 0 0 / 0.5)';
                con.strokeStyle = 'rgba(255 0 0 / 0.5)';
            }
            if (zone.url) {
                this.drawImageInsidePolygon(con, await zone.getImage(), zone.polygon);
            }
            this.drawPolygon(zone.polygon, fs);
        }
        if (this.hoverPoint) {
            con.strokeStyle = 'rgba(255 255 0 / 1)';
            con.strokeRect(this.hoverPoint.x - pointSize, this.hoverPoint.y - pointSize, pointSize * 2, pointSize * 2);
        }
        if (this.hoverLine) {
            con.strokeStyle = 'rgba(255 255 0 / 1)';
            con.lineWidth = 5;
            con.beginPath();
            con.moveTo(this.hoverLine.a.x, this.hoverLine.a.y);
            con.lineTo(this.hoverLine.b.x, this.hoverLine.b.y);
            con.closePath();
            con.stroke();
        }
        if (poly) {
            con.fillStyle = 'rgba(255 0 255 / 0.8)';
            con.strokeStyle = 'rgba(255 0 255 / 0.8)';
            this.drawPolygon(poly, 'rgba(255 0 255 / 0.25)');
        }
    }

    drawPolygon(polygon, fillStyle = null) {
        const con = this.hoverContext;
        const pointSize = 10;
        for (const p of polygon) {
            con.fillRect(p.x - pointSize / 2, p.y - pointSize / 2, pointSize, pointSize);
        }
        con.beginPath();
        con.lineWidth = 5;
        con.moveTo(polygon.slice(-1)[0].x, polygon.slice(-1)[0].y);
        for (const p of polygon) {
            con.lineTo(p.x, p.y);
        }
        con.closePath();
        con.stroke();
        if (fillStyle) {
            con.fillStyle = fillStyle;
            con.fill();
        }
    }




    async editZone(zone) {
        const editor = new ZoneEditor(zone);
        await editor.show();
        await this.refreshMap();
        await this.save();
        this.updateHover();
    }
    async editDetails() {
        const editor = new MapDetailsEditor(this.codexMap);
        await editor.show();
        await this.refreshMap();
        await this.save();
        this.updateHover();
    }
    async refreshMap() {
        this.image = await this.codexMap.fetchImage();
        this.mapCanvas.width = this.image.naturalWidth;
        this.mapCanvas.height = this.image.naturalHeight;
        this.hoverCanvas.width = this.image.naturalWidth;
        this.hoverCanvas.height = this.image.naturalHeight;
        this.mapContext.clearRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
        this.mapContext.drawImage(this.image, 0, 0);
    }
    async save() {
        await this.codexMap.save();
    }




    /**
     *
     * @param {DOMRect} srcRect
     */
    async show(srcRect) {
        return new Promise(async(resolve)=>{
            this.resolver = resolve;
            // @ts-ignore
            window.addEventListener('keydown', this.handleKeyDownBound);
            // @ts-ignore
            window.addEventListener('keyup', this.handleKeyUpBound);
            document.body.append(await this.render());
            await this.updateHover();
        });
    }




    async launchPainter() {
        if (this.editorDom.classList.contains('stcdx--isPainting')) {
            await this.refreshMap();
            this.paintList = [];
            this.codexMap.paintList = [];
            for (const layer of this.painter.layerList) {
                const data = layer.canvas.toDataURL();
                this.paintList.push(data);
                this.codexMap.paintList.push(data);
            }
            this.painter.unrender();
            await this.rerenderPaint();
            await this.save();
            this.updateHover();
            this.isPainting = false;
        } else {
            this.isPainting = true;
            const painter = new Painter(this.dom, this.painterControls, this.mapCanvas.width, this.mapCanvas.height, this.paintList);
            await painter.render();
            this.painter = painter;
        }
        this.editorDom.classList.toggle('stcdx--isPainting');
    }
}
