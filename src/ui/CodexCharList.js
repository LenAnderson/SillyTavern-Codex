import { characters } from '../../../../../../script.js';
import { delay } from '../../../../../utils.js';
import { quickReplyApi } from '../../../../quick-reply/index.js';
import { QuickReplySet } from '../../../../quick-reply/src/QuickReplySet.js';
import { log, warn } from '../lib/log.js';
import { waitForFrame } from '../lib/wait.js';
import { Character } from '../st/Character.js';
import { CodexBaseEntry } from './CodexBaseEntry.js';
import { CharListContextMenu } from './contextmenu/CharListContextMenu.js';




export class CodexCharList extends CodexBaseEntry {
    /**@type {Character[]}*/ charList = [];
    /**@type {QuickReplySet}*/ quickReplySet;




    constructor(entry, settings, matcher, linker) {
        super(entry, settings, matcher, linker);

        const qrsName = entry.keyList.find(it=>it.startsWith('codex-chars:')).substring(12);
        if (qrsName.length > 0) {
            this.quickReplySet = quickReplyApi.getSetByName(qrsName);
        }

        this.fetchChars();
    }

    fetchChars() {
        while (this.charList.length > 0) this.charList.pop();
        let names;
        if (this.entry.content.search('\n') == -1) {
            names = this.entry.content.split(/\s*,\s*/).map(it=>it.trim());
        } else {
            names = this.entry.content.split(/\n+/).map(it=>it.trim());
        }
        for (const name of names) {
            const c = characters.find(it=>it.name == name);
            if (c) {
                this.charList.push(Character.from(c));
            }
        }
        this.charList.sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    }


    async save() {
        this.entry.saveDebounced();
    }


    async render(isUpdate = false) {
        let oldDom;
        if (isUpdate || !this.dom) {
            oldDom = this.dom;
            const root = document.createElement('div'); {
                this.dom = root;
                root.classList.add('stcdx--content');
                root.classList.add('stcdx--charList');
                const title = document.createElement('h2'); {
                    title.classList.add('stcdx--title');
                    title.textContent = this.entry.title;
                    root.append(title);
                }
                const chars = document.createElement('div'); {
                    chars.classList.add('stcdx--chars');
                    for (const c of this.charList) {
                        const char = document.createElement('div'); {
                            char.classList.add('stcdx--char');
                            char.title = `${c.name}\n${(this.quickReplySet.qrList[0]?.title || this.quickReplySet.qrList[0]?.message) ?? ''}`;
                            char.addEventListener('click', (evt)=>this.handleClick(evt, c));
                            char.addEventListener('contextmenu', (evt)=>this.handleContextMenu(evt, c));
                            const ava = document.createElement('div'); {
                                ava.classList.add('stcdx--image');
                                ava.style.backgroundImage = `url("/characters/${encodeURIComponent(c.name)}/joy.png")`;
                                char.append(ava);
                            }
                            const name = document.createElement('div'); {
                                name.classList.add('stcdx--name');
                                name.textContent = c.name;
                                char.append(name);
                            }
                            chars.append(char);
                        }
                    }
                    root.append(chars);
                }
            }
        }
        if (isUpdate && oldDom) {
            oldDom.replaceWith(this.dom);
        }
        return this.dom;
    }


    /**
     *
     * @param {MouseEvent} evt
     * @param {Character} character
     */
    async handleClick(evt, character) {
        if (this.quickReplySet && this.quickReplySet.qrList.length > 0) {
            const qr = this.quickReplySet.qrList[0];
            await qr.execute({ ...character });
        }
    }

    /**
     *
     * @param {MouseEvent} evt
     * @param {Character} character
     */
    async handleContextMenu(evt, character) {
        if (this.quickReplySet && this.quickReplySet.qrList.length > 0 && this.quickReplySet.qrList[0].contextList.length > 0) {
            evt.preventDefault();
            const qr = this.quickReplySet.qrList[0];
            const ctx = new CharListContextMenu(qr, character);
            ctx.show(evt);
            log(ctx, ctx.itemList);
        }
    }

    async toggleEditor() {
        log('CodexCharList.toggleEditor');
        if (this.isTogglingEditor) return;
        this.isTogglingEditor = true;
        if (this.isEditing) {
            this.fetchChars();
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
        log('/CodexCharList.toggleEditor');
    }
}
