import { callPopup } from '../../../../../../../script.js';
import { quickReplyApi } from '../../../../../quick-reply/index.js';

import { warn } from '../../lib/log.js';
// eslint-disable-next-line no-unused-vars
import { CodexMap } from '../CodexMap.js';

export class MapDetailsEditor {
    /**@type {CodexMap}*/ codexMap;




    constructor(codexMap) {
        this.codexMap = codexMap;
    }




    async show() {
        const response = await fetch('/scripts/extensions/third-party/SillyTavern-Codex/html/mapDetailsEditor.html');
        if (!response.ok) {
            return warn('failed to fetch template: mapDetailsEditor.html');
        }
        const template = document.createRange().createContextualFragment(await response.text()).querySelector('#stcdx--mapEditor');
        /**@type {HTMLElement} */
        // @ts-ignore
        const dom = template.cloneNode(true);
        const popProm = callPopup(dom, 'text', undefined, { okButton: 'OK', wide: true, large: true, rows: 1 });
        /**@type {HTMLInputElement}*/
        const comment = dom.querySelector('#stcdx--map-comment');
        comment.value = this.codexMap.entry.comment ?? '';
        comment.addEventListener('input', ()=>{
            this.codexMap.entry.comment = comment.value.trim();
        });
        /**@type {HTMLInputElement}*/
        const keys = dom.querySelector('#stcdx--map-keys');
        keys.value = this.codexMap.entry.keyList?.join(', ') ?? '';
        keys.addEventListener('input', ()=>{
            this.codexMap.entry.keyList = keys.value.trim().split(/\s*,\s*/);
        });
        /**@type {HTMLInputElement}*/
        const url = dom.querySelector('#stcdx--map-url');
        url.value = this.codexMap.url ?? '';
        url.addEventListener('input', ()=>{
            this.codexMap.url = url.value.trim();
        });
        /**@type {HTMLTextAreaElement}*/
        const description = dom.querySelector('#stcdx--map-description');
        description.value = this.codexMap.description ?? '';
        description.addEventListener('input', ()=>{
            this.codexMap.description = description.value.trim();
        });
        /**@type {HTMLTextAreaElement}*/
        const command = dom.querySelector('#stcdx--map-command');
        command.value = this.codexMap.command ?? '';
        command.addEventListener('input', ()=>{
            this.codexMap.command = command.value.trim();
        });
        /**@type {HTMLSelectElement}*/
        const qrSet = dom.querySelector('#stcdx--map-qrSet');
        quickReplyApi.listSets().forEach(qrs=>{
            const opt = document.createElement('option'); {
                opt.value = qrs;
                opt.textContent = qrs;
                qrSet.append(opt);
            }
        });
        qrSet.value = this.codexMap.qrSet ?? '';
        qrSet.addEventListener('change', ()=>{
            this.codexMap.qrSet = qrSet.value.trim();
        });
        await popProm;
        return true;
    }
}
