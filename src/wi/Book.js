// eslint-disable-next-line no-unused-vars
import { getRequestHeaders } from '../../../../../../script.js';
import { executeSlashCommands } from '../../../../../slash-commands.js';

import { log, warn } from '../lib/log.js';
import { Entry } from './Entry.js';




export class Book {
    /**@type {String}*/ name;
    /**@type {Entry[]}*/ entryList = [];




    /**
     *
     * @param {String} name The WI book's name
     */
    constructor(name) {
        this.name = name;
    }

    async load() {
        log('BOOK.load', this.name);
        const result = await fetch('/api/worldinfo/get', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({ name:this.name }),
        });
        if (result.ok) {
            const data = await result.json();
            for (const uid of Object.keys(data.entries)) {
                const entry = Entry.from(this.name, data.entries[uid]);
                entry.onSave = ()=>this.save(entry);
                this.entryList.push(entry);
            }
        } else {
            toastr.warning(`Failed to load World Info book: ${this.name}`);
            warn(`Failed to load World Info book: ${this.name}`);
        }
        log('/BOOK.load', this);
    }

    async save(entry) {
        await executeSlashCommands(`/setentryfield file="${this.name}" uid=${entry.uid} field=content ${entry.content.replace(/([{}|])/g, '\\$1')}`);
    }
}
