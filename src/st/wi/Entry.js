import { debounceAsync } from '../../lib/debounce.js';




export class Entry {
    static from(book, props) {
        const instance = Object.assign(new this(book), {
            uid: props.uid,
            keyList: props.key,
            secondaryKeyList: props.keysecondary,
            secondaryKeyLogic: props.selectiveLogic,
            comment:props.comment,
            content: props.content,
            isDisabled: props.disable,
            isCaseSensitive: props.caseSensitive,
            isMatchingWholeWords: props.matchWholeWords,
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




    async save() {
        if (this.onSave) {
            await this.onSave(this);
        }
    }
}
