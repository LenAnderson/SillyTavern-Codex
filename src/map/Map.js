import { callPopup, messageFormatting } from '../../../../../../script.js';
import { executeSlashCommands } from '../../../../../slash-commands.js';
import { delay } from '../../../../../utils.js';
import { quickReplyApi } from '../../../../quick-reply/index.js';
import { findMatches, getEntry, getTitle, log, makeCodexDom, subParams } from '../../index.js';
import { settings } from '../../settings.js';
import { ContextMenu } from '../ContextMenu.js';
import { MenuItem } from '../MenuItem.js';
import { Point } from './Point.js';
import { Zone } from './Zone.js';

export class Map {
    static from(props, book, entry) {
        const instance = Object.assign(new this(book, entry), props);
        instance.zoneList = (props.zoneList ?? []).map(it=>Zone.from(it));
        return instance;
    }




    /**@type {String}*/ url;
    /**@type {String}*/ description;
    /**@type {Zone[]}*/ zoneList;
    /**@type {String}*/ command;
    /**@type {String}*/ qrSet;

    /**@type {String}*/ book;
    /**@type {Object}*/ entry;

    /**@type {HTMLElement}*/ dom;
    /**@type {Boolean}*/ isDrawing  = false;
    /**@type {Boolean}*/ isEditing  = false;
    /**@type {Point[]}*/ newPoly = [];
    /**@type {HTMLCanvasElement}*/ canvas;
    /**@type {HTMLCanvasElement}*/ hoverCanvas;
    /**@type {CanvasRenderingContext2D}*/ con;
    /**@type {Zone}*/ hoverZone;
    /**@type {Point}*/ hoverPoint;
    /**@type {HTMLImageElement}*/ img;




    constructor(book, entry) {
        this.book = book;
        this.entry = entry;
        addEventListener('keydown', (evt)=>{
            if (!this.dom || this.isDrawing) return;
            if (evt.key == 'Control') {
                this.isDrawing = true;
                this.newPoly = [];
            }
        });
        addEventListener('keyup', async(evt)=>{
            if (!this.dom || !this.isDrawing) return;
            if (evt.key == 'Control') {
                this.isDrawing = false;
                if (!this.isDragging) {
                    if (this.newPoly.length > 2) {
                        const zone = Zone.from({ polygon:this.newPoly });
                        if (await this.editZone(zone)) {
                            this.zoneList.push(zone);
                            this.save();
                        }
                    }
                    this.newPoly = [];
                    this.updateHover();
                }
            }
        });
    }

    toJSON() {
        return {
            url: this.url,
            description: this.description,
            zoneList: this.zoneList,
            command: this.command,
            qrSet: this.qrSet,
        };
    }

    async save() {
        await executeSlashCommands(`/setentryfield file="${this.book}" uid=${this.entry.uid} field=content ${JSON.stringify(this)}`);
    }




    async render() {
        const dom = document.createElement('div'); {
            dom.classList.add('stcdx--mapCodex');
            const title = document.createElement('h2'); {
                title.textContent = getTitle(this.entry);
                dom.append(title);
            }
            this.img = new Image();
            const imgPromise = new Promise(resolve=>{
                this.img.addEventListener('load', resolve);
                this.img.addEventListener('error', resolve);
            });
            this.img.src = this.url;
            if (!this.img.complete) {
                await imgPromise;
            }
            /**@type {CanvasRenderingContext2D}*/
            let con;
            const mapCont = document.createElement('div'); {
                mapCont.classList.add('stcdx--mapContainer');
                mapCont.addEventListener('click', (evt)=>{
                    return this.renderZoom();
                });
                const canvas = document.createElement('canvas'); {
                    canvas.classList.add('stcdx--map');
                    canvas.width = this.img.naturalWidth;
                    canvas.height = this.img.naturalHeight;
                    const mainCon = canvas.getContext('2d');
                    mainCon.drawImage(this.img, 0, 0);
                    canvas.addEventListener('wheel', (evt)=>{
                        evt.preventDefault();
                        zoneCont.scrollTop += evt.deltaY;
                    });
                    canvas.addEventListener('click', async(evt)=>{
                        const rect = canvas.getBoundingClientRect();
                        const scale = canvas.width / rect.width;
                        const x = (evt.x - rect.left) * scale;
                        const y = (evt.y - rect.top) * scale;
                        const p = new Point();
                        p.x = x;
                        p.y = y;
                        const zone = this.zoneList.find(it=>this.pip(it.polygon, p));
                        if (zone) {
                            const cmd = zone.command || this.command;
                            if (cmd) {
                                evt.stopPropagation();
                                await executeSlashCommands(
                                    cmd
                                        .replace(/{{map}}/gi, this.entry.comment)
                                        .replace(/{{zone}}/gi, zone.label)
                                    ,
                                );
                            }
                        }
                    });
                    canvas.addEventListener('contextmenu', (evt)=>{
                        const rect = canvas.getBoundingClientRect();
                        const scale = canvas.width / rect.width;
                        const x = (evt.x - rect.left) * scale;
                        const y = (evt.y - rect.top) * scale;
                        const p = new Point();
                        p.x = x;
                        p.y = y;
                        const zone = this.zoneList.find(it=>this.pip(it.polygon, p));
                        if (zone) {
                            const qrs = zone.qrSet || this.qrSet;
                            if (qrs) {
                                const qrList = quickReplyApi.listQuickReplies(qrs);
                                if (qrList.length > 0) {
                                    evt.stopPropagation();
                                    evt.preventDefault();
                                    const menu = new ContextMenu(qrList.map(qr=>
                                        new MenuItem(qr, ()=>quickReplyApi.executeQuickReply(qrs, qr, {
                                            map: this.entry.comment,
                                            zone: zone.label,
                                        })),
                                    ));
                                    menu.show(evt);
                                }
                            }
                        }
                    });
                    /**@type {Zone}*/
                    let hoverZone;
                    let busy = false;
                    canvas.addEventListener('pointermove', async(evt)=>{
                        if (busy) return;
                        busy = true;
                        const rect = canvas.getBoundingClientRect();
                        const scale = canvas.width / rect.width;
                        const x = (evt.x - rect.left) * scale;
                        const y = (evt.y - rect.top) * scale;
                        const p = new Point();
                        p.x = x;
                        p.y = y;
                        const zone = this.zoneList.find(it=>this.pip(it.polygon, p));
                        if (zone) {
                            if (zone != hoverZone && zone.polygon && zone.polygon.length > 0) {
                                if (hoverZone) {
                                    log('SWITCHING ZONES');
                                    hoverZone = zone;
                                    hover.style.transition = 'none';
                                    await new Promise(resolve=>requestAnimationFrame(resolve));
                                    hover.classList.remove('stcdx--hovered');
                                    hover.style.transform = '';
                                    hover.style.filter = '';
                                    canvas.style.cursor = '';
                                    con.clearRect(0, 0, canvas.width, canvas.height);
                                    await new Promise(resolve=>requestAnimationFrame(resolve));
                                    hover.style.transition = '';
                                } else {
                                    log('ACTIVATING ZONE');
                                    hoverZone = zone;
                                }
                                Array.from(dom.querySelectorAll('.stcdx--map-zone.stcdx--active')).forEach(it=>it.classList.remove('stcdx--active'));
                                const last = zone.polygon.slice(-1)[0];
                                con.clearRect(0, 0, canvas.width, canvas.height);
                                hover.style.transform = '';
                                con.save();
                                con.beginPath();
                                con.moveTo(last.x, last.y);
                                for (const p of zone.polygon) {
                                    con.lineTo(p.x, p.y);
                                }
                                con.closePath();
                                con.clip();
                                con.drawImage(this.img, 0, 0);
                                con.restore();
                                const cx = (zone.polygon.reduce((max,p)=>Math.max(max,p.x),0) - zone.polygon.reduce((min,p)=>Math.min(min,p.x),canvas.width)) / 2 + zone.polygon.reduce((min,p)=>Math.min(min,p.x),canvas.width);
                                const cy = (zone.polygon.reduce((max,p)=>Math.max(max,p.y),0) - zone.polygon.reduce((min,p)=>Math.min(min,p.y),canvas.height)) / 2 + zone.polygon.reduce((min,p)=>Math.min(min,p.y),canvas.height);
                                hover.style.transformOrigin = `${cx / canvas.width * 100}% ${cy / canvas.height * 100}%`;
                                hover.classList.add('stcdx--hovered');
                                if (zone.overrideZoom) hover.style.transform = `scale(${1 + zone.zoom / 100})`;
                                else hover.style.transform = '';
                                if (zone.overrideShadow || zone.overrideShadowColor) {
                                    hover.style.filter = `drop-shadow(0 0 ${zone.overrideShadow ? zone.shadow : settings.mapShadow}px ${zone.overrideShadowColor ? zone.shadowColor : settings.mapShadowColor})`;
                                } else {
                                    hover.style.filter = '';
                                }
                                canvas.style.cursor = 'pointer';
                                if (zone.dom) {
                                    zone.dom.classList.add('stcdx--active');
                                    if (zone.dom['scrollIntoViewIfNeeded']) {
                                        zone.dom['scrollIntoViewIfNeeded']();
                                    } else {
                                        zone.dom.scrollIntoView();
                                    }
                                }
                            }
                        } else if (hoverZone) {
                            log('DEACTIVATING ZONE');
                            Array.from(dom.querySelectorAll('.stcdx--map-zone.stcdx--active')).forEach(it=>it.classList.remove('stcdx--active'));
                            const hz = hoverZone;
                            hover.style.transition = 'none';
                            await new Promise(resolve=>requestAnimationFrame(resolve));
                            hover.classList.remove('stcdx--hovered');
                            hover.style.transform = '';
                            hover.style.filter = '';
                            canvas.style.cursor = '';
                            con.clearRect(0, 0, canvas.width, canvas.height);
                            await new Promise(resolve=>requestAnimationFrame(resolve));
                            hover.style.transition = '';
                            if (hoverZone == hz) hoverZone = null;
                        }
                        busy = false;
                    });
                    mapCont.append(canvas);
                }
                const hover = document.createElement('canvas'); {
                    hover.classList.add('stcdx--hover');
                    hover.width = this.img.naturalWidth;
                    hover.height = this.img.naturalHeight;
                    con = hover.getContext('2d');
                    mapCont.append(hover);
                }
                dom.append(mapCont);
            }

            const zoneCont = document.createElement('div'); {
                zoneCont.classList.add('stcdx--zoneContainer');
                const desc = document.createElement('div'); {
                    desc.classList.add('stcdx--mapDescription');
                    desc.innerHTML = messageFormatting(subParams(this.description), 'Codex', false, false);
                    zoneCont.append(desc);
                }
                for (const zone of this.zoneList ?? []) {
                    let ze;
                    let zm;
                    if (zone.key) {
                        zm = findMatches(zone.key, true, [{ book:this.book, entry:this.entry.uid }])?.[0];
                        if (zm) {
                            ze = getEntry(zm);
                        }
                    }
                    const z = document.createElement('div'); {
                        zone.dom = z;
                        z.classList.add('stcdx--map-zone');
                        const label = document.createElement('div'); {
                            label.classList.add('stcdx--title');
                            label.textContent = zone.label ?? (ze ? getTitle(ze) : '???');
                            z.append(label);
                        }
                        const content = document.createElement('div'); {
                            content.classList.add('stcdx--content');
                            if (zone.description) {
                                const p = document.createElement('p');
                                p.textContent = zone.description;
                                content.append(p);
                            } else if (zm) {
                                content.append(...await makeCodexDom(zm));
                                Array.from(content.querySelectorAll('img, h1, h2, h3, h4')).forEach(it=>it.remove());
                            }
                            z.append(content);
                        }
                        zoneCont.append(z);
                    }
                }
                dom.append(zoneCont);
            }
        }
        return dom;
    }

    async renderZoom() {
        const dom = document.createElement('div'); {
            dom.classList.add('stcdx--mapCodex');
            dom.addEventListener('click', ()=>{
                dom.remove();
            });
            const imgPromise = new Promise(resolve=>{
                this.img.addEventListener('load', resolve);
                this.img.addEventListener('error', resolve);
            });
            if (!this.img.complete) {
                await imgPromise;
            }
            /**@type {CanvasRenderingContext2D}*/
            let con;
            const mapCont = document.createElement('div'); {
                mapCont.classList.add('stcdx--mapContainer');
                const canvas = document.createElement('canvas'); {
                    canvas.classList.add('stcdx--map');
                    canvas.width = this.img.naturalWidth;
                    canvas.height = this.img.naturalHeight;
                    const mainCon = canvas.getContext('2d');
                    mainCon.drawImage(this.img, 0, 0);
                    canvas.addEventListener('click', async(evt)=>{
                        const rect = canvas.getBoundingClientRect();
                        const scale = canvas.width / rect.width;
                        const x = (evt.x - rect.left) * scale;
                        const y = (evt.y - rect.top) * scale;
                        const p = new Point();
                        p.x = x;
                        p.y = y;
                        const zone = this.zoneList.find(it=>this.pip(it.polygon, p));
                        if (zone) {
                            const cmd = zone.command || this.command;
                            if (cmd) {
                                await executeSlashCommands(
                                    cmd
                                        .replace(/{{map}}/gi, this.entry.comment)
                                        .replace(/{{zone}}/gi, zone.label)
                                    ,
                                );
                            }
                        }
                    });
                    canvas.addEventListener('contextmenu', (evt)=>{
                        const rect = canvas.getBoundingClientRect();
                        const scale = canvas.width / rect.width;
                        const x = (evt.x - rect.left) * scale;
                        const y = (evt.y - rect.top) * scale;
                        const p = new Point();
                        p.x = x;
                        p.y = y;
                        const zone = this.zoneList.find(it=>this.pip(it.polygon, p));
                        if (zone) {
                            const qrs = zone.qrSet || this.qrSet;
                            if (qrs) {
                                const qrList = quickReplyApi.listQuickReplies(qrs);
                                if (qrList.length > 0) {
                                    evt.stopPropagation();
                                    evt.preventDefault();
                                    const menu = new ContextMenu(qrList.map(qr=>
                                        new MenuItem(qr, ()=>{
                                            quickReplyApi.executeQuickReply(qrs, qr, {
                                                map: this.entry.comment,
                                                zone: zone.label,
                                            });
                                            dom?.remove();
                                        }),
                                    ));
                                    menu.show(evt);
                                }
                            }
                        }
                    });
                    /**@type {Zone}*/
                    let hoverZone;
                    let busy = false;
                    canvas.addEventListener('pointermove', async(evt)=>{
                        if (busy) return;
                        busy = true;
                        Array.from(dom.querySelectorAll('.stcdx--map-zone.stcdx--active')).forEach(it=>it.classList.remove('stcdx--active'));
                        const rect = canvas.getBoundingClientRect();
                        const scale = canvas.width / rect.width;
                        const x = (evt.x - rect.left) * scale;
                        const y = (evt.y - rect.top) * scale;
                        const p = new Point();
                        p.x = x;
                        p.y = y;
                        const zone = this.zoneList.find(it=>this.pip(it.polygon, p));
                        if (zone) {
                            if (zone != hoverZone && zone.polygon && zone.polygon.length > 0) {
                                if (hoverZone) {
                                    log('SWITCHING ZONES');
                                    hoverZone = zone;
                                    hover.style.transition = 'none';
                                    await new Promise(resolve=>requestAnimationFrame(resolve));
                                    hover.classList.remove('stcdx--hovered');
                                    hover.style.transform = '';
                                    hover.style.filter = '';
                                    canvas.style.cursor = '';
                                    con.clearRect(0, 0, canvas.width, canvas.height);
                                    await new Promise(resolve=>requestAnimationFrame(resolve));
                                    hover.style.transition = '';
                                } else {
                                    log('ACTIVATING ZONE');
                                    hoverZone = zone;
                                }
                                const last = zone.polygon.slice(-1)[0];
                                con.clearRect(0, 0, canvas.width, canvas.height);
                                hover.style.transform = '';
                                con.save();
                                con.beginPath();
                                con.moveTo(last.x, last.y);
                                for (const p of zone.polygon) {
                                    con.lineTo(p.x, p.y);
                                }
                                con.closePath();
                                con.clip();
                                con.drawImage(this.img, 0, 0);
                                con.restore();
                                const cx = (zone.polygon.reduce((max,p)=>Math.max(max,p.x),0) - zone.polygon.reduce((min,p)=>Math.min(min,p.x),canvas.width)) / 2 + zone.polygon.reduce((min,p)=>Math.min(min,p.x),canvas.width);
                                const cy = (zone.polygon.reduce((max,p)=>Math.max(max,p.y),0) - zone.polygon.reduce((min,p)=>Math.min(min,p.y),canvas.height)) / 2 + zone.polygon.reduce((min,p)=>Math.min(min,p.y),canvas.height);
                                hover.style.transformOrigin = `${cx / canvas.width * 100}% ${cy / canvas.height * 100}%`;
                                hover.classList.add('stcdx--hovered');
                                if (zone.overrideZoom) hover.style.transform = `scale(${1 + zone.zoom / 100})`;
                                else hover.style.transform = '';
                                if (zone.overrideShadow || zone.overrideShadowColor) {
                                    hover.style.filter = `drop-shadow(0 0 ${zone.overrideShadow ? zone.shadow : settings.mapShadow}px ${zone.overrideShadowColor ? zone.shadowColor : settings.mapShadowColor})`;
                                } else {
                                    hover.style.filter = '';
                                }
                                canvas.style.cursor = 'pointer';
                            }
                        } else if (hoverZone) {
                            log('DEACTIVATING ZONE');
                            const hz = hoverZone;
                            hover.style.transition = 'none';
                            await new Promise(resolve=>requestAnimationFrame(resolve));
                            hover.classList.remove('stcdx--hovered');
                            hover.style.transform = '';
                            hover.style.filter = '';
                            canvas.style.cursor = '';
                            con.clearRect(0, 0, canvas.width, canvas.height);
                            await new Promise(resolve=>requestAnimationFrame(resolve));
                            hover.style.transition = '';
                            if (hoverZone == hz) hoverZone = null;
                        }
                        busy = false;
                    });
                    mapCont.append(canvas);
                }
                const hover = document.createElement('canvas'); {
                    hover.classList.add('stcdx--hover');
                    hover.width = this.img.naturalWidth;
                    hover.height = this.img.naturalHeight;
                    con = hover.getContext('2d');
                    mapCont.append(hover);
                }
                dom.append(mapCont);
            }
        }
        document.body.append(dom);
    }


    updateHover(poly = null) {
        const con = this.con;
        const canvas = this.canvas;
        con.clearRect(0, 0, canvas.width, canvas.height);
        const pointSize = 10;
        for (const zone of this.zoneList) {
            if (zone == this.hoverZone) {
                con.fillStyle = 'rgba(255, 0, 0, 1)';
                con.strokeStyle = 'rgba(255, 0, 0, 1)';
            } else {
                con.fillStyle = 'rgba(255, 0, 0, 0.5)';
                con.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            }
            for (const p of zone.polygon) {
                con.fillRect(p.x - pointSize / 2, p.y - pointSize / 2, pointSize, pointSize);
            }
            con.beginPath();
            con.lineWidth = 5;
            con.moveTo(zone.polygon.slice(-1)[0].x, zone.polygon.slice(-1)[0].y);
            for (const p of zone.polygon) {
                con.lineTo(p.x, p.y);
            }
            con.closePath();
            con.stroke();
        }
        if (this.hoverPoint) {
            con.strokeStyle = 'rgba(255, 255, 0, 1)';
            con.lineWidth = 5;
            con.strokeRect(this.hoverPoint.x - pointSize, this.hoverPoint.y - pointSize, pointSize * 2, pointSize * 2);
        }
        if (poly) {
            for (const p of poly) {
                con.fillStyle = 'rgba(255, 0, 255, 0.8)';
                con.fillRect(p.x - pointSize / 2, p.y - pointSize / 2, pointSize, pointSize);
            }
            con.beginPath();
            con.strokeStyle = 'rgba(255, 0, 255, 0.8)';
            con.lineWidth = 5;
            con.moveTo(poly.slice(-1)[0].x, poly.slice(-1)[0].y);
            for (const p of poly) {
                con.lineTo(p.x, p.y);
            }
            con.closePath();
            con.stroke();
        }
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
    getPoint(evt) {
        const rect = this.canvas.getBoundingClientRect();
        const scale = this.canvas.width / rect.width;
        const x = (evt.x - rect.left) * scale;
        const y = (evt.y - rect.top) * scale;
        const p = new Point();
        p.x = x;
        p.y = y;
        return p;
    }
    getZonePoint(/**@type {Point}*/p) {
        for (const zone of this.zoneList) {
            for (const zp of zone.polygon) {
                if (Math.abs(zp.x - p.x) < 5 && Math.abs(zp.y - p.y) < 5) {
                    return zp;
                }
            }
        }
    }
    async editDetails(zone) {
        const html = `
            <div id="stcdx--mapEditor">
                <label>
                    <span class="stcdx--labelText">URL</span>
                    <input type="text" class="text_pole" id="stcdx--map-url" placeholder="URL: /user/images/codex/map.png">
                </label>
                <label>
                    <span class="stcdx--labelText">Default Command</span><br>
                    <small>Macros: <code>{{map}} {{zone}}</code></small>
                    <textarea type="text" class="text_pole" id="stcdx--map-command"></textarea>
                </label>
                <label>
                    <span class="stcdx--labelText">Default Context Menu (QR Set, <small><code>{{arg::map}} {{arg::zone}}</code></small>)</span>
                    <select class="text_pole" id="stcdx--map-qrSet">
                        <option value="">--Pick a QR set--</option>
                    </select>
                </label>
                <label>
                    <span class="stcdx--labelText">Description</span>
                    <textarea type="text" class="text_pole" id="stcdx--map-description"></textarea>
                </label>
            </div>
        `;
        const template = document.createRange().createContextualFragment(html).querySelector('#stcdx--mapEditor');
        /**@type {HTMLElement} */
        // @ts-ignore
        const dom = template.cloneNode(true);
        const popProm = callPopup(dom, 'text', undefined, { okButton: 'OK', wide: true, large: true, rows: 1 });
        const url = dom.querySelector('#stcdx--map-url');
        const oldUrl = this.url;
        url.value = this.url ?? '';
        url.addEventListener('input', ()=>{
            this.url = url.value.trim();
        });
        const description = dom.querySelector('#stcdx--map-description');
        description.value = this.description ?? '';
        description.addEventListener('input', ()=>{
            this.description = description.value.trim();
        });
        const command = dom.querySelector('#stcdx--map-command');
        command.value = this.command ?? '';
        command.addEventListener('input', ()=>{
            this.command = command.value.trim();
        });
        const qrSet = dom.querySelector('#stcdx--map-qrSet');
        quickReplyApi.listSets().forEach(qrs=>{
            const opt = document.createElement('option'); {
                opt.value = qrs;
                opt.textContent = qrs;
                qrSet.append(opt);
            }
        });
        qrSet.value = this.qrSet ?? '';
        qrSet.addEventListener('change', ()=>{
            this.qrSet = qrSet.value.trim();
        });
        await popProm;
        await this.save();
        if (this.url != oldUrl) {
            this.refreshEditor();
        }
        return true;
    }
    async editZone(/**@type {Zone}*/zone) {
        const html = `
            <div id="stcdx--zoneEditor">
                <label>
                    <span class="stcdx--labelText">Label</span>
                    <input type="text" class="text_pole" id="stcdx--zone-label">
                </label>
                <label>
                    <span class="stcdx--labelText">Command</span><br>
                    <small>Macros: <code>{{map}} {{zone}}</code></small>
                    <textarea type="text" class="text_pole" id="stcdx--zone-command"></textarea>
                </label>
                <label>
                    <span class="stcdx--labelText">Context Menu (QR Set, <small><code>{{arg::map}} {{arg::zone}}</code></small>)</span>
                    <select class="text_pole" id="stcdx--zone-qrSet">
                        <option value="">--Pick a QR set--</option>
                    </select>
                </label>
                <div class="stcdx--overrideContainer">
                    <span class="stcdx--labelText">Override zoom (hover) [%]</span>
                    <div class="stcdx--inputs">
                        <input type="checkbox" id="stcdx--zone-overrideZoom">
                        <input type="number" class="text_pole" id="stcdx--zone-zoom" min="0">
                    </div>
                </div>
                <div class="stcdx--overrideContainer">
                    <span class="stcdx--labelText">Override shadow strength (hover) [px]</span>
                    <div class="stcdx--inputs">
                        <input type="checkbox" id="stcdx--zone-overrideShadow">
                        <input type="number" class="text_pole" id="stcdx--zone-shadow" min="0">
                    </div>
                </div>
                <div class="stcdx--overrideContainer">
                    <span class="stcdx--labelText">Override shadow color (hover)</span>
                    <div class="stcdx--inputs">
                        <input type="checkbox" id="stcdx--zone-overrideShadowColor">
                        <toolcool-color-picker id="stcdx--zone-shadowColor"></toolcool-color-picker>
                    </div>
                </div>
                <label>
                    <span class="stcdx--labelText">World Info Key</span>
                    <input type="text" class="text_pole" id="stcdx--zone-key" placeholder="Leave description blank to use WI">
                </label>
                <label>
                    <span class="stcdx--labelText">Description</span>
                    <textarea type="text" class="text_pole" id="stcdx--zone-description" placeholder="Leave blank to use WI matched by World Info Key"></textarea>
                </label>
            </div>
        `;
        const template = document.createRange().createContextualFragment(html).querySelector('#stcdx--zoneEditor');
        /**@type {HTMLElement} */
        // @ts-ignore
        const dom = template.cloneNode(true);
        const popProm = callPopup(dom, 'text', undefined, { okButton: 'OK', wide: true, large: true, rows: 1 });
        const label = dom.querySelector('#stcdx--zone-label');
        label.value = zone.label ?? '';
        label.addEventListener('input', ()=>{
            zone.label = label.value.trim();
        });
        const command = dom.querySelector('#stcdx--zone-command');
        command.value = zone.command ?? '';
        command.addEventListener('input', ()=>{
            zone.command = command.value.trim();
        });
        const qrSet = dom.querySelector('#stcdx--zone-qrSet');
        quickReplyApi.listSets().forEach(qrs=>{
            const opt = document.createElement('option'); {
                opt.value = qrs;
                opt.textContent = qrs;
                qrSet.append(opt);
            }
        });
        qrSet.value = zone.qrSet ?? '';
        qrSet.addEventListener('change', ()=>{
            zone.qrSet = qrSet.value.trim();
        });

        const oZoom = dom.querySelector('#stcdx--zone-overrideZoom');
        oZoom.checked = zone.overrideZoom ?? false;
        oZoom.addEventListener('click', ()=>{
            zone.overrideZoom = oZoom.checked;
        });
        const zoom = dom.querySelector('#stcdx--zone-zoom');
        zoom.value = zone.zoom ?? 10;
        zoom.addEventListener('input', ()=>{
            zone.zoom = zoom.value;
        });
        const oShadow = dom.querySelector('#stcdx--zone-overrideShadow');
        oShadow.checked = zone.overrideShadow ?? false;
        oShadow.addEventListener('click', ()=>{
            zone.overrideShadow = oShadow.checked;
        });
        const shadow = dom.querySelector('#stcdx--zone-shadow');
        shadow.value = zone.shadow ?? 3;
        shadow.addEventListener('input', ()=>{
            zone.shadow = shadow.value;
        });

        const oShadowColor = dom.querySelector('#stcdx--zone-overrideShadowColor');
        oShadowColor.checked = zone.overrideShadowColor ?? false;
        oShadowColor.addEventListener('click', ()=>{
            zone.overrideShadowColor = oShadowColor.checked;
        });
        const shadowColor = dom.querySelector('#stcdx--zone-shadowColor');
        shadowColor.color = zone.shadowColor;
        shadowColor.addEventListener('change', (evt)=>{
            zone.shadowColor = evt.detail.rgba;
        });

        const key = dom.querySelector('#stcdx--zone-key');
        key.value = zone.key ?? '';
        key.addEventListener('input', ()=>{
            zone.key = key.value.trim();
        });
        const description = dom.querySelector('#stcdx--zone-description');
        description.value = zone.description ?? '';
        description.addEventListener('input', ()=>{
            zone.description = description.value.trim();
        });
        await popProm;
        this.save();
        return true;
    }
    async refreshEditor() {
        this.img = new Image();
        const imgPromise = new Promise(resolve=>{
            this.img.addEventListener('load', resolve);
            this.img.addEventListener('error', resolve);
        });
        this.img.src = this.url;
        if (!this.img.complete) {
            await imgPromise;
        }
        this.canvas.width = this.img.naturalWidth;
        this.canvas.height = this.img.naturalHeight;
        this.hoverCanvas.width = this.img.naturalWidth;
        this.hoverCanvas.height = this.img.naturalHeight;
        this.con = this.hoverCanvas.getContext('2d');
        const mainCon = this.canvas.getContext('2d');
        mainCon.clearRect(0, 0, this.canvas.width, this.canvas.height);
        mainCon.drawImage(this.img, 0, 0);
    }
    async showEditor() {
        return new Promise(async(resolve)=>{
            this.isEditing = true;
            const dom = document.createElement('div'); {
                this.dom = dom;
                dom.classList.add('stcdx--me');
                const menu = document.createElement('div'); {
                    menu.classList.add('stcdx--menu');
                    const hints = document.createElement('div'); {
                        hints.classList.add('stcdx--hintList');
                        [
                            '[HELP]',
                            'hold ctrl and click to draw a new zone',
                            'hold alt and click into a zone to remove a zone',
                            'hold shift and click into a zone to edit a zone',
                            'hold ctrl and drag a point to move a point',
                            'hold alt and click a point to remove a point',
                            'hold shift and click a point to add a point',
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
                                    this.dom?.remove();
                                    this.dom = null;
                                    this.isEditing = false;
                                    resolve();
                                    return;
                                }
                            });
                            actions.append(close);
                        }
                        menu.append(actions);
                    }
                    dom.append(menu);
                }
                const imgPromise = new Promise(resolve=>{
                    this.img.addEventListener('load', resolve);
                    this.img.addEventListener('error', resolve);
                });
                if (!this.img.complete) {
                    await imgPromise;
                }
                const mapCont = document.createElement('div'); {
                    mapCont.classList.add('stcdx--mapContainer');
                    const canvas = document.createElement('canvas'); {
                        this.canvas = canvas;
                        canvas.classList.add('stcdx--map');
                        canvas.width = this.img.naturalWidth;
                        canvas.height = this.img.naturalHeight;
                        const mainCon = canvas.getContext('2d');
                        mainCon.drawImage(this.img, 0, 0);
                        canvas.addEventListener('pointermove', (evt)=>{
                            if (this.isDragging && this.dragPoint) {
                                const p = this.getPoint(evt);
                                this.dragPoint.x = p.x;
                                this.dragPoint.y = p.y;
                                this.updateHover();
                                evt.stopPropagation();
                                return;
                            }
                            if (this.isDrawing) return;
                            const p = this.getPoint(evt);
                            const zone = this.zoneList.find(it=>this.pip(it.polygon, p));
                            let needsUpdate = false;
                            if (zone && this.hoverZone != zone) {
                                this.hoverZone = zone;
                                needsUpdate = true;
                                evt.stopPropagation();
                            } else if (this.hoverZone && !zone) {
                                this.hoverZone = null;
                                needsUpdate = true;
                                evt.stopPropagation();
                            }
                            let hp;
                            if (zone) {
                                hp = zone.polygon.find(it=>it.checkHover(p));
                            } else {
                                hp = this.zoneList.map(z=>z.polygon.find(it=>it.checkHover(p))).find(it=>it);
                            }
                            if (hp != this.hoverPoint) {
                                this.hoverPoint = hp;
                                needsUpdate = true;
                            }
                            if (needsUpdate) {
                                this.updateHover();
                            }
                        });
                        canvas.addEventListener('pointerdown', async(evt)=>{
                            const p = this.getPoint(evt);
                            const zp = this.getZonePoint(p);
                            if (!zp) return;
                            if (this.isDrawing && this.newPoly.length == 0) {
                                this.isDragging = true;
                                this.dragPoint = zp;
                                evt.stopPropagation();
                                return;
                            }
                            if (evt.shiftKey) {
                                const zone = this.zoneList.find(it=>it.polygon.includes(zp));
                                if (zone) {
                                    zone.polygon.splice(zone.polygon.indexOf(zp) + 1, 0, p);
                                    this.isDragging = true;
                                    this.dragPoint = p;
                                    this.updateHover();
                                }
                                evt.stopPropagation();
                                return;
                            }
                        });
                        canvas.addEventListener('pointerup', (evt)=>{
                            if (!this.isDragging || !this.dragPoint) return;
                            evt.stopPropagation();
                            this.dragPoint = null;
                            this.save();
                            this.updateHover();
                            delay(10).then(()=>this.isDragging = false);
                        });
                        canvas.addEventListener('click', async(evt)=>{
                            if (this.isDragging) return;
                            if (evt.altKey) {
                                const p = this.getPoint(evt);
                                const zp = this.getZonePoint(p);
                                if (zp) {
                                    const zone = this.zoneList.find(it=>it.polygon.includes(zp));
                                    if (zone) {
                                        zone.polygon.splice(zone.polygon.indexOf(zp), 1);
                                        this.updateHover();
                                    }
                                } else {
                                    const zone = this.zoneList.find(it=>this.pip(it.polygon, p));
                                    if (zone) {
                                        this.zoneList.splice(this.zoneList.indexOf(zone), 1);
                                        this.save();
                                        this.updateHover();
                                    }
                                }
                                return;
                            }
                            if (evt.shiftKey) {
                                const p = this.getPoint(evt);
                                const zone = this.zoneList.find(it=>this.pip(it.polygon, p));
                                if (zone) {
                                    if (await this.editZone(zone)) {
                                        this.save();
                                        this.updateHover();
                                    }
                                }
                                return;
                            }
                            if (!this.isDrawing) return;
                            const p = this.getPoint(evt);
                            this.newPoly.push(p);
                            this.updateHover(this.newPoly);
                        });
                        mapCont.append(canvas);
                    }
                    const hover = document.createElement('canvas'); {
                        this.hoverCanvas = hover;
                        hover.classList.add('stcdx--hover');
                        hover.width = this.img.naturalWidth;
                        hover.height = this.img.naturalHeight;
                        this.con = hover.getContext('2d');
                        this.updateHover();
                        mapCont.append(hover);
                    }
                    dom.append(mapCont);
                }
                document.body.append(dom);
                if (!this.url) await this.editDetails();
            }
        });
    }
}
