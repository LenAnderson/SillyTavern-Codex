// eslint-disable-next-line no-unused-vars
import { Linker } from '../Linker.js';
// eslint-disable-next-line no-unused-vars
import { Matcher } from '../Matcher.js';
// eslint-disable-next-line no-unused-vars
import { Settings } from '../Settings.js';
// eslint-disable-next-line no-unused-vars
import { Entry } from '../st/wi/Entry.js';
import { CodexCharList } from './CodexCharList.js';
import { CodexEntry } from './CodexEntry.js';
import { CodexMap } from './CodexMap.js';




export class CodexEntryFactory {
    /**
     * @param {Entry} entry
     * @param {Settings} settings
     * @param {Matcher} matcher
     * @param {Linker} linker
     */
    static create(entry, settings, matcher, linker) {
        let content;
        if (entry.isMap) {
            content = new CodexMap(entry, settings, matcher, linker);
        } else if (entry.isCharList) {
            content = new CodexCharList(entry, settings, matcher, linker);
        } else {
            content = new CodexEntry(entry, settings, matcher, linker);
        }
        return content;
    }
}
