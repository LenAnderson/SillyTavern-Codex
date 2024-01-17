import { callPopup } from '../../../../../../../script.js';
import { quickReplyApi } from '../../../../../quick-reply/index.js';

import { warn } from '../../lib/log.js';
// eslint-disable-next-line no-unused-vars
import { Zone } from './Zone.js';




export class ZoneEditor {
    /**@type {Zone}*/ zone;




    constructor(zone) {
        this.zone = zone;
    }




    async show() {
        const response = await fetch('/scripts/extensions/third-party/SillyTavern-Codex/html/zoneEditor.html');
        if (!response.ok) {
            return warn('failed to fetch template: zoneEditor.html');
        }
        const template = document.createRange().createContextualFragment(await response.text()).querySelector('#stcdx--zoneEditor');
        /**@type {HTMLElement} */
        // @ts-ignore
        const dom = template.cloneNode(true);
        const popProm = callPopup(dom, 'text', undefined, { okButton: 'OK', wide: true, large: true, rows: 1 });
        /**@type {HTMLInputElement}*/
        const label = dom.querySelector('#stcdx--zone-label');
        label.value = this.zone.label ?? '';
        label.addEventListener('input', ()=>{
            this.zone.label = label.value.trim();
        });
        /**@type {HTMLInputElement}*/
        const url = dom.querySelector('#stcdx--zone-url');
        url.value = this.zone.url ?? '';
        url.addEventListener('input', ()=>{
            this.zone.url = url.value.trim();
        });
        /**@type {HTMLInputElement}*/
        const isAlwaysVisible = dom.querySelector('#stcdx--zone-isAlwaysVisible');
        isAlwaysVisible.checked = this.zone.isAlwaysVisible ?? false;
        isAlwaysVisible.addEventListener('click', ()=>{
            this.zone.isAlwaysVisible = isAlwaysVisible.checked;
        });
        /**@type {HTMLTextAreaElement}*/
        const command = dom.querySelector('#stcdx--zone-command');
        command.value = this.zone.command ?? '';
        command.addEventListener('input', ()=>{
            this.zone.command = command.value.trim();
        });
        /**@type {HTMLSelectElement}*/
        const qrSet = dom.querySelector('#stcdx--zone-qrSet');
        quickReplyApi.listSets().forEach(qrs=>{
            const opt = document.createElement('option'); {
                opt.value = qrs;
                opt.textContent = qrs;
                qrSet.append(opt);
            }
        });
        qrSet.value = this.zone.qrSet ?? '';
        qrSet.addEventListener('change', ()=>{
            this.zone.qrSet = qrSet.value.trim();
        });

        /**@type {HTMLInputElement}*/
        const oZoom = dom.querySelector('#stcdx--zone-overrideZoom');
        oZoom.checked = this.zone.overrideZoom ?? false;
        oZoom.addEventListener('click', ()=>{
            this.zone.overrideZoom = oZoom.checked;
        });
        /**@type {HTMLInputElement}*/
        const zoom = dom.querySelector('#stcdx--zone-zoom');
        zoom.value = `${this.zone.zoom ?? 10}`;
        zoom.addEventListener('input', ()=>{
            this.zone.zoom = Number(zoom.value);
        });
        /**@type {HTMLInputElement}*/
        const oShadow = dom.querySelector('#stcdx--zone-overrideShadow');
        oShadow.checked = this.zone.overrideShadow ?? false;
        oShadow.addEventListener('click', ()=>{
            this.zone.overrideShadow = oShadow.checked;
        });
        /**@type {HTMLInputElement}*/
        const shadow = dom.querySelector('#stcdx--zone-shadow');
        shadow.value = `${this.zone.shadow ?? 3}`;
        shadow.addEventListener('input', ()=>{
            this.zone.shadow = Number(shadow.value);
        });

        /**@type {HTMLInputElement}*/
        const oShadowColor = dom.querySelector('#stcdx--zone-overrideShadowColor');
        oShadowColor.checked = this.zone.overrideShadowColor ?? false;
        oShadowColor.addEventListener('click', ()=>{
            this.zone.overrideShadowColor = oShadowColor.checked;
        });
        const shadowColor = dom.querySelector('#stcdx--zone-shadowColor');
        // @ts-ignore
        shadowColor.color = this.zone.shadowColor;
        shadowColor.addEventListener('change', (evt)=>{
            // @ts-ignore
            this.zone.shadowColor = evt.detail.rgba;
        });

        /**@type {HTMLInputElement}*/
        const key = dom.querySelector('#stcdx--zone-key');
        key.value = this.zone.key ?? '';
        key.addEventListener('input', ()=>{
            this.zone.key = key.value.trim();
        });
        /**@type {HTMLTextAreaElement}*/
        const description = dom.querySelector('#stcdx--zone-description');
        description.value = this.zone.description ?? '';
        description.addEventListener('input', ()=>{
            this.zone.description = description.value.trim();
        });
        await popProm;
    }
}
