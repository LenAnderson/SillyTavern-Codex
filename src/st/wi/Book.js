// eslint-disable-next-line no-unused-vars
import { getRequestHeaders } from '../../../../../../../script.js';
import { executeSlashCommands } from '../../../../../../slash-commands.js';

import { log, warn } from '../../lib/log.js';
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
                entry.onSave = (_, changes)=>this.save(entry, changes);
                this.entryList.push(entry);
            }
        } else {
            toastr.warning(`Failed to load World Info book: ${this.name}`);
            warn(`Failed to load World Info book: ${this.name}`);
        }
        log('/BOOK.load', this);
    }

    async save(entry, changes) {
        const commands = [
            !changes.includes('content') ? null : `/setentryfield file="${this.name}" uid=${entry.uid} field=content ${entry.content.replace(/([{}|])/g, '\\$1')}`,
            !changes.includes('key') ? null : `/setentryfield file="${this.name}" uid=${entry.uid} field=key ${entry.keyList.map(it=>it.replace(/([{}|])/g, '\\$1')).join(', ')}`,
            !changes.includes('comment') ? null : `/setentryfield file="${this.name}" uid=${entry.uid} field=comment ${entry.comment.replace(/([{}|])/g, '\\$1')}`,
        ];
        await executeSlashCommands(commands.filter(it=>it).join(' | '));
    }
}
