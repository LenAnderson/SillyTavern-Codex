import { Entry } from './wi/Entry.js';




export class Match {
    /**@type {String}*/ book;
    /**@type {Entry}*/ entry;
    /**@type {Number}*/ start;
    /**@type {Number}*/ end;

    get uid() { return this.entry.uid; }




    /**
     *
     * @param {String} book book name
     * @param {Entry} entry World Info entry
     * @param {Number} start start index
     * @param {Number} end end index
     */
    constructor(book, entry, start = null, end = null) {
        this.book = book;
        this.entry = entry;
        this.start = start;
        this.end = end;
    }
}
