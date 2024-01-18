import { executeSlashCommands } from '../../../../../slash-commands.js';
import { delay } from '../../../../../utils.js';
import { tryDecodeBase64 } from '../lib/base64.js';
import { log } from '../lib/log.js';
import { waitForFrame } from '../lib/wait.js';
import { CodexBaseEntry } from './CodexBaseEntry.js';
import { Map } from './map/Map.js';
import { MapEditor } from './map/MapEditor.js';
import { Zone } from './map/Zone.js';




export class CodexMap extends CodexBaseEntry {
    /**@type {String}*/ url;
    /**@type {String}*/ description;
    /**@type {String}*/ command;
    /**@type {String}*/ qrSet;
    /**@type {Zone[]}*/ zoneList;

    /**@type {HTMLImageElement}*/ image;
    /**@type {CanvasRenderingContext2D}*/ mapContext;
    /**@type {CanvasRenderingContext2D}*/ hoverContext;

    /**@type {Map}*/ map;
    /**@type {Map}*/ zoomedMap;

    /**@type {MapEditor}*/ editor;

    /**@type {HTMLElement}*/ zoneListDom;
    /**@type {HTMLElement}*/ zoomedMapContainer;




    constructor(entry, settings, matcher, linker) {
        super(entry, settings, matcher, linker);
        const data = JSON.parse(entry.content || '{}');
        this.url = tryDecodeBase64(data.url);
        this.description = tryDecodeBase64(data.description);
        this.command = tryDecodeBase64(data.command);
        this.qrSet = tryDecodeBase64(data.qrSet);
        this.zoneList = (data.zoneList ?? []).map(it=>Zone.from(it));
    }


    async save() {
        this.entry.content = JSON.stringify({
            url: btoa(this.url ?? ''),
            description: btoa(this.description ?? ''),
            command: btoa(this.command ?? ''),
            qrSet: btoa(this.qrSet ?? ''),
            zoneList: this.zoneList,
        });
        await this.entry.saveDebounced();
    }




    async fetchImage() {
        return new Promise(resolve=>{
            if (!this.image) {
                this.image = new Image();
            }
            if (this.image.src != this.url) {
                this.image.src = this.url;
            }
            if (!this.image.complete) {
                this.image.addEventListener('load', ()=>resolve(this.image));
                this.image.addEventListener('error', ()=>resolve(this.image));
            } else {
                resolve(this.image);
            }
        });
    }

    async render() {
        if (!this.dom) {
            const dom = document.createElement('div'); {
                this.dom = dom;
                dom.classList.add('stcdx--content');
                dom.classList.add('stcdx--map');
                await this.renderContent();
            }
        }
        return this.dom;
    }

    scroll(deltaY) {
        if (!this.zoneListDom) return;
        this.zoneListDom.scrollTop += deltaY;
    }

    async renderContent() {
        this.dom.innerHTML = '';
        const title = document.createElement('h2'); {
            title.classList.add('stcdx--title');
            title.textContent = this.entry.title;
            title.addEventListener('click', async()=>{
                await this.renderZoom();
            });
            this.dom.append(title);
        }

        const map = new Map(this.settings, await this.fetchImage(), this.zoneList); {
            //TODO map listeners (click, context, hover)
            map.onZoneClick = (zone, evt) => this.handleZoneClicked(zone, evt, false);
            map.onZoneHover = (zone, evt) => this.handleZoneHovered(zone, evt);
            this.map = map;
            const mapEl = await map.render();
            mapEl.addEventListener('click', async()=>{
                await this.renderZoom();
            });
            this.dom.append(mapEl);
        }

        const zoneCont = document.createElement('div'); {
            this.zoneListDom = zoneCont;
            zoneCont.classList.add('stcdx--zoneContainer');
            for (const zone of this.zoneList?.toSorted((a,b)=>(a.label ?? '').localeCompare(b.label ?? '')) ?? []) {
                let entry;
                if (zone.key) {
                    entry = this.matcher.findMatches(zone.key)[0]?.entry;
                }
                const z = document.createElement('div'); {
                    zone.dom = z;
                    z.classList.add('stcdx--zone');
                    const label = document.createElement('div'); {
                        label.classList.add('stcdx--title');
                        label.textContent = zone.label ?? entry?.title ?? '???';
                        z.append(label);
                    }
                    const content = document.createElement('div'); {
                        content.classList.add('stcdx--content');
                        content.classList.add('mes_text');
                        if (zone.description) {
                            const p = document.createElement('p');
                            p.textContent = zone.description;
                            content.append(p);
                        } else if (entry) {
                            content.append(...this.renderTemplate(entry));
                            Array.from(content.querySelectorAll('img, h1, h2, h3, h4')).forEach(it=>it.remove());
                        }
                        z.append(content);
                    }
                    zoneCont.append(z);
                }
            }
            this.dom.append(zoneCont);
        }
    }

    async renderZoom() {
        let mapEl;
        const container = document.createElement('div'); {
            this.zoomedMapContainer = container;
            container.classList.add('stcdx--map-zoomed');
            const map = new Map(this.settings, await this.fetchImage(), this.zoneList);
            //TODO map listeners (click, context, hover)
            map.onZoneClick = async(zone, evt) => {
                if (!zone.keepZoomed) {
                    await this.unrenderZoom();
                }
                this.handleZoneClicked(zone, evt, true);
            };
            this.zoomedMap = map;
            mapEl = await map.render();
            mapEl.addEventListener('click', async()=>{
                await this.unrenderZoom();
                container.remove();
            });
            container.append(mapEl);
        }

        const rect = this.map.mapCanvas.getBoundingClientRect();
        if (rect.width == 0 || rect.height == 0) {
            mapEl.style.transition = 'none';
            document.body.append(container);
            await waitForFrame();
            this.zoomedMap.dom.style.left = '100vw';
            await waitForFrame();
            mapEl.style.transition = '';
        } else {
            this.zoomedMap.dom.style.top = `${rect.top}px`;
            this.zoomedMap.dom.style.left = `${rect.left}px`;
            this.zoomedMap.dom.style.width = `${rect.width}px`;
            this.zoomedMap.dom.style.height = `${rect.height}px`;
            document.body.append(container);
            await waitForFrame();
        }
        container.classList.add('stcdx--active');
        this.zoomedMap.dom.style.top = '';
        this.zoomedMap.dom.style.left = '';
        this.zoomedMap.dom.style.width = '';
        this.zoomedMap.dom.style.height = '';
        await delay(this.settings.zoomTime + 10);
    }

    async unrenderZoom() {
        const rect = this.map.mapCanvas.getBoundingClientRect();
        if (rect.width == 0 || rect.height == 0) {
            const zr = this.zoomedMap.dom.getBoundingClientRect();
            this.zoomedMap.dom.style.top = `${-zr.height}px`;
        } else {
            this.zoomedMap.dom.style.top = `${rect.top}px`;
            this.zoomedMap.dom.style.left = `${rect.left}px`;
            this.zoomedMap.dom.style.width = `${rect.width}px`;
            this.zoomedMap.dom.style.height = `${rect.height}px`;
        }
        this.zoomedMapContainer.classList.remove('stcdx--active');
        await delay(this.settings.zoomTime + 10);
        this.zoomedMapContainer.remove();
        this.zoomedMap = null;
        this.zoomedMapContainer = null;
    }


    async toggleEditor() {
        log('CodexMap.toggleEditor');
        if (this.editor) {
            this.editor.dom.remove();
            this.editor = null;
        } else {
            const editor = new MapEditor(this);
            this.editor = editor;
            await editor.show(this.map.mapCanvas.getBoundingClientRect());
            this.editor = null;
            await this.renderContent();
        }
        log('/CodexMap.toggleEditor');
    }




    async handleZoneClicked(zone, evt, isZoomed) {
        let cmd = zone.command || this.command;
        if (cmd) {
            cmd = cmd
                .replace(/{{map}}/gi, this.entry.title)
                .replace(/{{zone}}/gi, zone.label)
                .replace(/{{zoom}}/g, JSON.stringify(isZoomed))
            ,
            await executeSlashCommands(cmd);
        }
    }

    async handleZoneHovered(zone, evt) {
        Array.from(this.dom.querySelectorAll('.stcdx--active')).forEach(it=>it.classList.remove('stcdx--active'));
        if (!zone) return;
        zone.dom.classList.add('stcdx--active');
        if (zone.dom.scrollIntoViewIfNeeded) {
            zone.dom.scrollIntoViewIfNeeded();
        } else {
            zone.dom.scrollIntoView();
        }
    }
}
