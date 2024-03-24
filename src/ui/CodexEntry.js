import { delay } from '../../../../../utils.js';
import { log } from '../lib/log.js';
import { waitForFrame } from '../lib/wait.js';
import { CodexBaseEntry } from './CodexBaseEntry.js';




export class CodexEntry extends CodexBaseEntry {
    /**@type {HTMLDivElement}*/ editor;




    async unrender() {
        super.unrender();
    }
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
            let editor;
            const wrapper = document.createElement('div'); {
                this.editor = wrapper;
                wrapper.classList.add('stcdx--editor');
                const title = document.createElement('input'); {
                    title.classList.add('text_pole');
                    title.classList.add('stcdx--editor-title');
                    title.placeholder = 'Title / Memo';
                    title.title = 'Title / Memo';
                    title.value = this.entry.comment;
                    title.addEventListener('input', async()=>{
                        if (!this.isEditing || this.isTogglingEditor) return;
                        this.entry.comment = title.value;
                        this.entry.saveDebounced();
                    });
                    wrapper.append(title);
                }
                const keywords = document.createElement('input'); {
                    keywords.classList.add('text_pole');
                    keywords.classList.add('stcdx--editor-tags');
                    keywords.placeholder = 'Primary Keywords';
                    keywords.title = 'Primary Keywords';
                    keywords.value = this.entry.keyList.join(', ');
                    keywords.addEventListener('input', async()=>{
                        if (!this.isEditing || this.isTogglingEditor) return;
                        this.entry.keyList = keywords.value.split(/\s*,\s*/);
                        this.entry.saveDebounced();
                    });
                    wrapper.append(keywords);
                }
                const actions = document.createElement('div'); {
                    actions.classList.add('stcdx--editor-actions');
                    const wi = document.createElement('div'); {
                        wi.classList.add('menu_button');
                        wi.textContent = 'Open in WI Panel';
                        wi.addEventListener('click', ()=>{
                            this.toggleEditor();
                            this.entry.showInWorldInfo();
                        });
                        actions.append(wi);
                    }
                    const del = document.createElement('div'); {
                        del.classList.add('menu_button');
                        del.classList.add('redWarningBG');
                        del.textContent = 'Delete';
                        //TODO no exported function or slash command to delete WI entries
                        // actions.append(del);
                    }
                    wrapper.append(actions);
                }
                editor = document.createElement('textarea'); {
                    editor.classList.add('text_pole');
                    editor.classList.add('stcdx--editor-content');
                    editor.value = this.entry.content;
                    editor.addEventListener('input', async()=>{
                        if (!this.isEditing || this.isTogglingEditor) return;
                        this.entry.content = editor.value;
                        this.entry.saveDebounced();
                    });
                    wrapper.append(editor);
                }
                this.dom.insertAdjacentElement('afterend', wrapper);
            }
            wrapper.classList.add('stcdx--preactive');
            await waitForFrame();
            this.dom.classList.remove('stcdx--active');
            wrapper.classList.add('stcdx--active');
            await delay(this.settings.transitionTime + 10);
            this.dom.classList.remove('stcdx--preactive');
            editor.selectionStart = 0;
            editor.selectionEnd = 0;
            editor.focus();
        }
        this.isTogglingEditor = false;
        log('/CodexEntry.toggleEditor');
        while (this.isEditing) await delay(100);
    }
}
