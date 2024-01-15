import { dragElement } from '../../../../../RossAscends-mods.js';
import { delay } from '../../../../../utils.js';

// eslint-disable-next-line no-unused-vars
import { Linker } from '../Linker.js';
import { Match } from '../Match.js';
// eslint-disable-next-line no-unused-vars
import { Matcher } from '../Matcher.js';
// eslint-disable-next-line no-unused-vars
import { Settings } from '../Settings.js';
// eslint-disable-next-line no-unused-vars
import { Book } from '../wi/Book.js';
// eslint-disable-next-line no-unused-vars
import { CodexBaseEntry } from './CodexBaseEntry.js';
import { CodexEntry } from './CodexEntry.js';
import { CodexMap } from './CodexMap.js';

export class Codex {
    /**@type {Settings}*/ settings;
    /**@type {Matcher}*/ matcher;
    /**@type {Linker}*/ linker;
    /**@type {Book[]}*/ bookList;

    /**@type {CodexBaseEntry}*/ content;
    /**@type {CodexBaseEntry}*/ newContent;

    /**@type {Match[]}*/ history = [];
    /**@type {Number}*/ historyIdx = 0;
    /**@type {HTMLElement}*/ historyBack;
    /**@type {HTMLElement}*/ historyForward;

    /**@type {HTMLElement}*/ searchWrap;
    /**@type {HTMLElement}*/ searchResults;

    /**@type {HTMLElement}*/ edit;
    /**@type {HTMLElement}*/ editHeader;

    /**@type {HTMLElement}*/ dom;

    get isEditing() { return this.content?.isEditing ?? false; }




    /**
     *
     * @param {Matcher} matcher
     */
    constructor(settings, matcher, linker, bookList) {
        this.settings = settings;
        this.matcher = matcher;
        this.linker = linker;
        this.bookList = bookList;
    }




    goBack() {
        if (this.historyIdx > 0) {
            this.historyIdx--;
            this.show(this.history[this.historyIdx], true);
        }
        this.updateHistoryButtons();
    }

    goForward() {
        if (this.historyIdx + 1 < this.history.length) {
            this.historyIdx++;
            this.show(this.history[this.historyIdx], true);
        }
        this.updateHistoryButtons();
    }

    updateHistoryButtons() {
        this.historyBack.classList[this.historyIdx == 0 ? 'add' : 'remove']('stcdx--disabled');
        this.historyForward.classList[this.historyIdx + 1 >= this.history.length ? 'add' : 'remove']('stcdx--disabled');
    }

    addToHistory(match) {
        if (this.history.length > 0 && this.history[this.historyIdx].entry == match.entry) return;
        while (this.historyIdx + 1 < this.history.length) this.history.pop();
        this.history.push(match);
        while (this.history.length > this.settings.historyLength) this.history.shift();
        this.historyIdx = this.history.length - 1;
        this.updateHistoryButtons();
    }


    performSearch(query) {
        const text = query.trim().toLowerCase();
        if (text.length == 0) {
            this.searchResults?.remove();
            this.searchResults = null;
            return;
        }
        const keyTest = (e)=>e.keyList
            .filter(k=>!k.startsWith('codex-tpl:') && !k.startsWith('codex-title:') && !k.startsWith('codex-map:'))
            .find(k=>(!this.settings.requirePrefix || k.startsWith('codex:')) && k.toLowerCase().replace(/^codex:/,'').includes(text))
        ;
        let entries = [
            ...this.matcher.findMatches(text)
                .map(m=>m.entry)
            ,
            ...this.bookList
                .map(b=>b.entryList)
                .flat()
                .filter(e=>!e.keyList.includes('codex-skip:'))
                .filter(e=>keyTest(e) || e.comment.toLowerCase().includes(text))
            ,
        ];
        if (entries.length == 0) {
            this.searchResults?.remove();
            this.searchResults = null;
            return;
        }
        entries = entries.filter((m, idx)=>entries.indexOf(m) == idx);
        const results = this.searchResults ?? document.createElement('div'); {
            this.searchResults = results;
            results.classList.add('stcdx--results');
            results.innerHTML = '';
            entries.forEach(entry=>{
                const item = document.createElement('div'); {
                    item.classList.add('stcdx--result');
                    item.textContent = `${entry.book}: ${entry.title}`;
                    item.addEventListener('mousedown', ()=>this.show(new Match(entry.book, entry)));
                    results.append(item);
                }
            });
            this.searchWrap.append(results);
        }
    }

    hideSearchResults() {
        this.searchResults?.remove();
    }
    showSearchResults() {
        if (this.searchResults) {
            this.searchWrap.append(this.searchResults);
        }
    }




    rerender() {
        if (!this.content) return;
        this.show(new Match(this.content.entry.book, this.content.entry), false, true);
    }
    render() {
        if (!this.dom) {
            const root = document.createElement('div'); {
                this.dom = root;
                root.id = 'stcdx--codex';
                root.classList.add('stcdx--root');
                root.classList.add('draggable');
                const head = document.createElement('div'); {
                    head.classList.add('stcdx--header');
                    const menuTrigger = document.createElement('div'); {
                        menuTrigger.classList.add('stcdx--action');
                        menuTrigger.classList.add('stcdx--menu');
                        menuTrigger.textContent = '≡';
                        menuTrigger.title = 'Entries';
                        menuTrigger.addEventListener('click', ()=>{
                            menu.classList.toggle('stcdx--active');
                        });
                        const menu = document.createElement('ul'); {
                            menu.classList.add('stcdx--books');
                            this.bookList.forEach(book=>{
                                const entries = book.entryList
                                    .filter(e=>e.keyList.find(k=>!this.settings.requirePrefix || k.startsWith('codex:')))
                                    .filter(e=>!e.keyList.includes('codex-skip:'))
                                    .toSorted((a,b)=>a.title.localeCompare(b.title))
                                ;
                                if (entries.length == 0) return;
                                const li = document.createElement('li'); {
                                    li.classList.add('stcdx--book');
                                    const name = document.createElement('div'); {
                                        name.classList.add('stcdx--name');
                                        name.textContent = book.name;
                                        li.append(name);
                                    }
                                    const entryList = document.createElement('ul'); {
                                        entryList.classList.add('stcdx--entries');
                                        entries.forEach(entry=>{
                                            const link = document.createElement('li'); {
                                                link.classList.add('stcdx--entry');
                                                link.textContent = entry.title;
                                                link.addEventListener('click', (evt)=>{
                                                    this.show(new Match(book.name, entry));
                                                });
                                                entryList.append(link);
                                            }
                                        });
                                        li.append(entryList);
                                    }
                                    menu.append(li);
                                }
                            });
                            menuTrigger.append(menu);
                        }
                        head.append(menuTrigger);
                    }
                    const back = document.createElement('div'); {
                        this.historyBack = back;
                        back.classList.add('stcdx--action');
                        back.classList.add('stcdx--back');
                        back.classList.add('stcdx--disabled');
                        back.textContent = '↩';
                        back.title = 'Back';
                        back.addEventListener('click', ()=>this.goBack());
                        head.append(back);
                    }
                    const forward = document.createElement('div'); {
                        this.historyForward = forward;
                        forward.classList.add('stcdx--action');
                        forward.classList.add('stcdx--forward');
                        forward.classList.add('stcdx--disabled');
                        forward.textContent = '↪';
                        forward.title = 'Forward';
                        forward.addEventListener('click', ()=>this.goForward());
                        head.append(forward);
                    }
                    const search = document.createElement('div'); {
                        this.searchWrap = search;
                        search.classList.add('stcdx--search');
                        const inp = document.createElement('input'); {
                            inp.classList.add('stcdx--searchInput');
                            inp.classList.add('text_pole');
                            inp.type = 'search';
                            inp.placeholder = 'search codex';
                            inp.addEventListener('blur', ()=>this.hideSearchResults());
                            inp.addEventListener('focus', ()=>this.showSearchResults());
                            inp.addEventListener('input', ()=>this.performSearch(inp.value));
                            search.append(inp);
                        }
                        head.append(search);
                    }
                    const editHeader = document.createElement('div'); {
                        this.editHeader = editHeader;
                        editHeader.classList.add('stcdx--editHeader');
                        head.append(editHeader);
                    }
                    const edit = document.createElement('div'); {
                        this.edit = edit;
                        edit.classList.add('stcdx--action');
                        edit.classList.add('stcdx--edit');
                        edit.classList.add('stcdx--disabled');
                        edit.textContent = '✎';
                        edit.title = 'Edit entry';
                        edit.addEventListener('click', async()=>{
                            if (!this.isEditing) {
                                editHeader.textContent = `${this.content?.entry?.book}: (${this.content?.entry?.uid}) ${this.content?.entry?.comment ?? this.content?.entry?.keyList?.join(' / ')}`;
                                root.classList.add('stcdx--isEditing');
                            }
                            await this.content?.toggleEditor();
                            if (!this.isEditing) {
                                root.classList.remove('stcdx--isEditing');
                            }
                        });
                        head.append(edit);
                    }
                    const drag = document.createElement('div'); {
                        drag.id = 'stcdx--codexheader';
                        drag.classList.add('stcdx--action');
                        drag.classList.add('stcdx--drag');
                        drag.classList.add('fa-solid');
                        drag.classList.add('fa-grip');
                        drag.classList.add('drag-grabber');
                        head.append(drag);
                    }
                    const close = document.createElement('div'); {
                        close.classList.add('stcdx--close');
                        close.classList.add('stcdx--action');
                        close.classList.add('fa-solid');
                        close.classList.add('fa-circle-xmark');
                        close.title = 'Close';
                        close.addEventListener('click', ()=>this.hide());
                        head.append(close);
                    }
                    root.append(head);
                }
                document.body.append(root);
                dragElement($(root));
            }
        } else if (!this.dom.parentElement) {
            // workaround for Ross escape
            document.body.append(this.dom);
        }
        return this.dom;
    }
    unrender() {
        this.dom?.remove();
        this.dom = null;
    }




    /**
     *
     * @param {Match} match
     */
    async show(match = null, isHistory = false, isForced = false) {
        this.render().classList.add('stcdx--active');
        if (match) {
            /**@type {CodexBaseEntry}*/
            let content;
            if (match.entry.isMap) {
                content = new CodexMap(match.entry, this.settings, this.matcher, this.linker);
            } else {
                content = new CodexEntry(match.entry, this.settings, this.matcher, this.linker);
            }
            this.newContent = content;
            this.dom.append(await content.render());
            await Promise.all([
                this.content?.hide(),
                content.show(),
            ]);
            this.content?.unrender();
            if (this.newContent == content) {
                this.content = content;
                this.newContent = null;
                this.edit.classList.remove('stcdx--disabled');
                if (!isHistory) {
                    this.addToHistory(match);
                }
            } else {
                content.unrender();
            }
        }
    }

    async cycle(matches) {
        for (const match of matches) {
            await this.show(match);
            await delay(this.settings.cycleDelay);
        }
    }

    /**
     *
     * @param {Match} match
     */
    async toggle(match = null) {
        if (match) {
            if (match.entry == this.content?.entry) {
                this.render().classList.toggle('stcdx--active');
            } else {
                await this.show(match);
            }
        } else {
            this.render().classList.toggle('stcdx--active');
        }
    }

    async hide() {
        this.dom?.classList?.remove('stcdx--active');
        await delay(this.settings.transitionTime + 10);
    }

    zoom(idx) {
        // @ts-ignore
        Array.from(this.content?.dom?.querySelectorAll('img, canvas') ?? [])[idx]?.click();
    }
}
