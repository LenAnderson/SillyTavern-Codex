import { characters } from '../../../../../../script.js';
import { quickReplyApi } from '../../../../quick-reply/index.js';
import { QuickReplySet } from '../../../../quick-reply/src/QuickReplySet.js';
import { log, warn } from '../lib/log.js';
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

        let names;
        if (entry.content.search('\n') == -1) {
            names = entry.content.split(/\s*,\s*/).map(it=>it.trim());
        } else {
            names = entry.content.split(/\n+/).map(it=>it.trim());
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


    async render() {
        if (!this.dom) {
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
}
