import { characters } from '../../../../../../script.js';
import { Character } from '../st/Character.js';
import { Entry } from '../st/wi/Entry.js';
import { CodexBaseEntry } from './CodexBaseEntry.js';




export class CodexCharList extends CodexBaseEntry {
    /**@type {Character[]}*/ charList = [];




    constructor(entry, settings, matcher, linker) {
        super(entry, settings, matcher, linker);

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


    renderCharTemplate(c) {
        let template = `
            ![](/characters/{{char::name}}/joy.png)

        `;
        let messageText = this.subParams(entry.content);
        messageText = template
            .replace(/{{comment}}/g, entry.comment)
            .replace(/{{comment::url}}/g, encodeURIComponent(entry.comment))
            .replace(/{{content}}/g, entry.content)
            .replace(/{{content::url}}/g, encodeURIComponent(entry.content))
            .replace(/{{key\[(\d+)\]}}/g, (_,idx)=>entry.keyList[idx])
            .replace(/{{key\[(\d+)\]::url}}/g, (_,idx)=>encodeURIComponent(entry.keyList[idx]))
            .replace(/{{title}}/g, entry.title)
            .replace(/{{title::url}}/g, encodeURIComponent(entry.title))
        ;
        messageText = messageFormatting(
            messageText,
            'Codex',
            false,
            false,
        );
        const dom = document.createElement('div');
        dom.innerHTML = messageText;
        this.linker.addCodexLinks(dom, [this.entry]);
        return Array.from(dom.children);
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
}
