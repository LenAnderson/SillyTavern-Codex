import { eventSource, event_types } from '../../../../../../../script.js';
import { delay } from '../../../../../../utils.js';
import { debounceAsync } from '../../lib/debounce.js';




export class Entry {
    static from(book, props) {
        const instance = Object.assign(new this(book), {
            uid: props.uid,
            keyList: props.key,
            secondaryKeyList: props.keysecondary,
            secondaryKeyLogic: props.selectiveLogic,
            comment: props.comment,
            content: props.content,
            isDisabled: props.disable,
            isCaseSensitive: props.caseSensitive,
            isMatchingWholeWords: props.matchWholeWords,
            originalKeyList: props.key.join(', '),
            originalComment: props.comment,
            originalContent: props.content,
        });
        return instance;
    }



    /**@type {String}*/ book;
    /**@type {Number}*/ uid;
    /**@type {String[]}*/ keyList;
    /**@type {String[]}*/ secondaryKeyList;
    /**@type {Number}*/ secondaryKeyLogic;
    /**@type {String}*/ comment;
    /**@type {String}*/ content;
    /**@type {Boolean}*/ isDisabled;
    /**@type {Boolean}*/ isCaseSensitive;
    /**@type {Boolean}*/ isMatchingWholeWords;

    /**@type {String}*/ originalKeyList;
    /**@type {String}*/ originalComment;
    /**@type {String}*/ originalContent;

    /**@type {Function}*/ saveDebounced;

    /**@type {Function}*/ onSave;

    get isMap() { return this.keyList.includes('codex-map:'); }
    get isCharList() { return this.keyList.find(it=>it.startsWith('codex-chars:')); }

    get title() {
        const key = this.keyList.find(it=>it.startsWith('codex-title:'))?.substring(12);
        if (key) {
            const reKey = /^key\[(\d+)]$/i;
            if (reKey.test(key)) {
                return this.keyList[key.replace(reKey, '$1')];
            }
            return this[key];
        }
        return this.comment.length > 50 ? this.keyList.join(' / ') : (this.comment || this.keyList.join(' / ')) ?? '???';
    }




    constructor(book) {
        this.book = book;

        this.saveDebounced = debounceAsync(async()=>await this.save());
    }


    toJSON() {
        return {
            uid: this.uid,
            key: this.keyList,
            keysecondary: this.secondaryKeyList,
            selectiveLogic: this.secondaryKeyLogic,
            comment: this.comment,
            content: this.content,
            disable: this.isDisabled,
            caseSensitive: this.isCaseSensitive,
            matchWholeWords: this.isMatchingWholeWords,
        };
    }




    async showInWorldInfo() {
        const drawer = document.querySelector('#WorldInfo');
        if (!drawer.classList.contains('openDrawer')) {
            document.querySelector('#WI-SP-button > .drawer-toggle').click();
        }
        const sel = document.querySelector('#world_editor_select');
        const bookIndex = Array.from(sel.children).find(it=>it.textContent.trim() == this.book)?.value;
        const afterBookLoaded = async()=>{
            const container = document.querySelector('#world_popup_entries_list');
            const entry = container.querySelector(`.world_entry[uid="${this.uid}"]`);
            if (entry.querySelector('.inline-drawer-toggle .inline-drawer-icon.down')) {
                entry.querySelector('.inline-drawer-toggle').click();
            }
            entry.scrollIntoView();
            entry.classList.add('stcdx--flash');
            await delay(510);
            entry.classList.remove('stcdx--flash');
        };
        if (sel.value != bookIndex) {
            eventSource.once(event_types.WORLDINFO_UPDATED, async()=>afterBookLoaded());
            sel.value = bookIndex;
            sel.dispatchEvent(new Event('change'));
        } else {
            afterBookLoaded();
        }
    }




    getChanges() {
        const changes = [];
        if (this.originalComment != this.comment) changes.push('comment');
        if (this.originalContent != this.content) changes.push('content');
        if (this.originalKeyList != this.keyList.join(', ')) changes.push('key');
        return changes;
    }
    async save() {
        if (this.onSave) {
            const changes = this.getChanges();
            if (changes.length > 0) {
                await this.onSave(this, changes);
            }
        }
    }
}
