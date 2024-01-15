import { characters, chat_metadata, eventSource, event_types } from '../../../../../../script.js';
import { getContext } from '../../../../../extensions.js';
import { groups } from '../../../../../group-chats.js';
import { world_info, world_info_case_sensitive, world_info_match_whole_words } from '../../../../../world-info.js';

import { debounceAsync } from '../lib/debounce.js';
import { log } from '../lib/log.js';

export class WorldInfoSettings {
    /**@type {Boolean}*/ isCaseSensitive;
    /**@type {Boolean}*/ isMatchingWholeWords;
    /**@type {String[]}*/ bookNameList = [];

    /**@type {Function}*/ loadDebounced;

    /**@type {Function}*/ onSettingsChanged;
    /**@type {Function}*/ onBookUpdated;




    constructor() {
        this.loadDebounced = debounceAsync(()=>this.load());

        eventSource.on(event_types.WORLDINFO_SETTINGS_UPDATED, ()=>log('[EVENT]', 'WORLDINFO_SETTINGS_UPDATED'));
        eventSource.on(event_types.WORLDINFO_UPDATED, ()=>log('[EVENT]', 'WORLDINFO_UPDATED'));
        eventSource.on(event_types.SETTINGS_UPDATED, ()=>log('[EVENT]', 'SETTINGS_UPDATED'));
        eventSource.on(event_types.CHARACTER_EDITED, ()=>log('[EVENT]', 'CHARACTER_EDITED'));
        eventSource.on(event_types.WORLDINFO_SETTINGS_UPDATED, ()=>this.loadDebounced());
        eventSource.on(event_types.WORLDINFO_UPDATED, (book, data)=>{
            if (this.bookNameList.includes(book)) this.onBookUpdated(book, Object.keys(data.entries).map(key=>data.entries[key]));
        });
        eventSource.on(event_types.SETTINGS_UPDATED, ()=>this.loadDebounced());
        eventSource.on(event_types.CHARACTER_EDITED, ()=>this.loadDebounced());
    }




    /**
     * Loads world info settings and active books.
     * @param {Boolean} isQuiet Prevent sending events
     */
    load(isQuiet = false) {
        log('WISETTINGS.load');
        let isChanged = false;
        if (this.isCaseSensitive != world_info_case_sensitive) {
            this.isCaseSensitive = world_info_case_sensitive;
            isChanged = true;
        }
        if (this.isMatchingWholeWords == world_info_match_whole_words) {
            this.isMatchingWholeWords = world_info_match_whole_words;
            isChanged = true;
        }
        if (this.loadBooks()) {
            isChanged = true;
        }

        if (!isQuiet && isChanged && this.onSettingsChanged) {
            this.onSettingsChanged();
        }
        log('/WISETTINGS.load', this);
    }

    loadBooks() {
        log('WISETTINGS.loadBooks');
        const context = getContext();
        let names = [
            ...(world_info.globalSelect ?? []),
            ...(world_info.charLore?.map(it=>it.extraBooks)?.flat() ?? []),
            chat_metadata.world_info,
            characters[context.characterId]?.data?.character_book?.name,
            ...(groups
                .find(it=>it.id == context.groupId)
                ?.members
                ?.map(m=>characters.find(it=>it.avatar == m)?.data?.character_book?.name)
                    ?? []
            ),
        ].filter(it=>it);
        names = names.filter((it,idx)=>names.indexOf(it) == idx).toSorted((a,b)=>a.localeCompare(b));
        const added = [];
        for (const name of names) {
            if (!this.bookNameList.includes(name)) {
                added.push(name);
            }
        }
        const removed = [];
        for (const name of this.bookNameList) {
            if (!names.includes(name)) {
                removed.push(name);
            }
        }
        this.bookNameList.push(...added);
        for (const name of removed) {
            this.bookNameList.splice(this.bookNameList.indexOf(name), 1);
        }
        log('/WISETTINGS.loadBooks', { added, removed });
        return (added.length + removed.length) > 0;
    }
}
