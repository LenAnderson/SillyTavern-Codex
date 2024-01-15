import { delay } from '../../../../../utils.js';
import { log } from '../lib/log.js';
import { waitForFrame } from '../lib/wait.js';
import { CodexBaseEntry } from './CodexBaseEntry.js';




export class CodexEntry extends CodexBaseEntry {
    /**@type {HTMLTextAreaElement}*/ editor;




    async render(isUpdate = false) {
        let oldDom;
        if (isUpdate || !this.dom) {
            oldDom = this.dom;
            const dom = document.createElement('div'); {
                this.dom = dom;
                dom.classList.add('stcdx--content');
                dom.classList.add('stcdx--entry');
                dom.classList.add('mes_text');
                dom.append(...this.renderTemplate(this.entry));
                const imgLoadList = [];
                Array.from(dom.querySelectorAll('img')).forEach(img=>{
                    img.addEventListener('click', ()=>this.zoomImage(img));
                    imgLoadList.push(new Promise(resolve=>{
                        if (img.complete) return resolve();
                        img.addEventListener('load', resolve);
                        img.addEventListener('error', resolve);
                    }));
                });
                await Promise.all(imgLoadList);
            }
        }
        if (isUpdate && oldDom) {
            oldDom.replaceWith(this.dom);
        }
        return this.dom;
    }


    async zoomImage(img) {
        const rect = img.getBoundingClientRect();
        let clone;
        const blocker = document.createElement('div'); {
            blocker.classList.add('stcdx--blocker');
            blocker.addEventListener('click', async()=>{
                const rect = img.getBoundingClientRect();
                blocker.classList.remove('stcdx--active');
                clone.style.top = `${rect.top}px`;
                clone.style.left = `${rect.left}px`;
                clone.style.width = `${rect.width}px`;
                clone.style.height = `${rect.height}px`;
                await delay(this.settings.zoomTime + 10);
                blocker.remove();
            });
            clone = document.createElement('img'); {
                clone.classList.add('stcdx--clone');
                clone.src = img.src;
                clone.style.top = `${rect.top}px`;
                clone.style.left = `${rect.left}px`;
                clone.style.width = `${rect.width}px`;
                clone.style.height = `${rect.height}px`;
                blocker.append(clone);
            }
            document.body.append(blocker);
        }
        await delay(10);
        blocker.classList.add('stcdx--active');
        clone.style.top = '0';
        clone.style.left = '0';
        clone.style.width = '100vw';
        clone.style.height = '100vh';
    }


    async toggleEditor() {
        log('CodexEntry.toggleEditor');
        if (this.isTogglingEditor) return;
        this.isTogglingEditor = true;
        if (this.isEditing) {
            await this.entry.saveDebounced();
            await this.render(true);
            this.dom.classList.add('stcdx--preactive');
            await waitForFrame();
            this.dom.classList.add('stcdx--active');
            this.editor.classList.remove('stcdx--active');
            await delay(this.settings.transitionTime + 10);
            this.editor.classList.remove('stcdx--preactive');
            this.editor.remove();
            this.editor = null;
            this.isEditing = false;
        } else {
            this.isEditing = true;
            const editor = document.createElement('textarea'); {
                this.editor = editor;
                editor.classList.add('stcdx--editor');
                editor.classList.add('text_pole');
                editor.value = this.entry.content;
                editor.addEventListener('input', async()=>{
                    if (!this.isEditing || this.isTogglingEditor) return;
                    this.entry.content = editor.value;
                    this.entry.saveDebounced();
                });
                this.dom.insertAdjacentElement('afterend', editor);
            }
            editor.classList.add('stcdx--preactive');
            await waitForFrame();
            this.dom.classList.remove('stcdx--active');
            editor.classList.add('stcdx--active');
            await delay(this.settings.transitionTime + 10);
            this.dom.classList.remove('stcdx--preactive');
            editor.selectionStart = 0;
            editor.selectionEnd = 0;
            editor.focus();
        }
        this.isTogglingEditor = false;
        log('/CodexEntry.toggleEditor');
    }
}
