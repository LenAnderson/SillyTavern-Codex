import { chat, eventSource, event_types } from '../../../../../script.js';
import { getContext } from '../../../../extensions.js';
import { delay } from '../../../../utils.js';

import { Linker } from './Linker.js';
// eslint-disable-next-line no-unused-vars
import { Match } from './Match.js';
import { Matcher } from './Matcher.js';
import { Settings } from './Settings.js';
import { debounceAsync } from './lib/debounce.js';
import { log } from './lib/log.js';
import { Codex } from './ui/Codex.js';
import { Book } from './st/wi/Book.js';
import { Entry } from './st/wi/Entry.js';
import { WorldInfoSettings } from './st/wi/Settings.js';
import { Tooltip } from './ui/Tooltip.js';




export class CodexManager {
    /**@type {Settings}*/ settings;
    /**@type {WorldInfoSettings}*/ wiSettings;
    /**@type {Book[]}*/ bookList = [];

    /**@type {Matcher}*/ matcher;
    /**@type {Linker}*/ linker;

    /**@type {Codex}*/ codex;

    /**@type {HTMLElement}*/ wiButton;

    /**@type {Boolean}*/ isActive = false;
    /**@type {Boolean}*/ isRestarting = false;
    /**@type {Boolean}*/ isStarting = false;
    /**@type {Boolean}*/ isStopping = false;
    get isReady() {
        return this.isActive && !this.isRestarting && !this.isStarting && !this.isStopping;
    }

    /**@type {Number[]}*/ messageQueue = [];

    /**@type {Function}*/ restartDebounced;
    /**@type {Function}*/ processQueueDebounced;




    constructor() {
        this.restartDebounced = debounceAsync(async()=>await this.restart(), 500);
        this.processQueueDebounced = debounceAsync(async()=>await this.processQueue());

        this.settings = new Settings(
            ()=>this.restartDebounced(),
            ()=>this.codex?.rerender(),
        );

        this.wiSettings = new WorldInfoSettings();
        this.wiSettings.onSettingsChanged = ()=>this.handleWorldInfoSettingsChange();
        this.wiSettings.onBookUpdated = (book, entries)=>this.handleBookUpdate(book, entries);

        eventSource.on(event_types.CHAT_CHANGED, (chatIdx)=>this.handleChatChange(chatIdx));

        eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (idx)=>this.queueMessageAndCycle(idx));
        eventSource.on(event_types.USER_MESSAGE_RENDERED, (idx)=>this.queueMessageAndCycle(idx));
        eventSource.on(event_types.MESSAGE_SWIPED, (idx)=>this.queueMessageAndCycle(idx));
        eventSource.on(event_types.MESSAGE_EDITED, (idx)=>this.queueMessageAndCycle(idx));
    }


    async restart() {
        if (this.isRestarting) return;
        if (this.codex?.isEditing) return;
        this.isRestarting = true;
        log('== RESTART ==');

        await this.stop();
        await delay(500);
        await this.start();

        log('/== RESTART ==');
        this.isRestarting = false;
    }

    async start() {
        if (this.isStarting) return;
        if (!this.settings.isEnabled) return;
        if (!getContext().chatId) return;
        this.isStarting = true;
        log('START');

        this.wiSettings.load(true);
        await this.loadBooks();
        this.matcher = new Matcher(
            this.settings,
            this.wiSettings,
            this.bookList,
        );
        this.linker = new Linker(
            this.settings,
            this.matcher,
            (match)=>this.toggleCodex(match),
        );
        if (this.codex) {
            this.codex.stopReload(this.bookList);
        } else {
            this.codex = new Codex(
                this.settings,
                this.matcher,
                this.linker,
                this.bookList,
            );
        }

        this.wiButton = document.createElement('div'); {
            this.wiButton.classList.add('stcdx--wiButton');
            this.wiButton.classList.add('menu_button');
            this.wiButton.textContent = 'Toggle Codex';
            this.wiButton.addEventListener('click', ()=>{
                this.toggleCodex();
            });
            document.querySelector('#WI_panel_pin_div').append(this.wiButton);
        }

        document.body.style.setProperty('--stcdx--color', this.settings.color);
        document.body.style.setProperty('--stcdx--icon', `"${this.settings.icon}"`);

        document.body.style.setProperty('--stcdx--mapDesaturate', `${this.settings.mapDesaturate}`);
        document.body.style.setProperty('--stcdx--mapShadow', `${this.settings.mapShadow}`);
        document.body.style.setProperty('--stcdx--mapShadowColor', this.settings.mapShadowColor);
        document.body.style.setProperty('--stcdx--mapZoom', `${this.settings.mapZoom}`);

        document.body.style.setProperty('--stcdx--headerFontSize', `${this.settings.headerFontSize}`);

        document.body.style.setProperty('--stcdx--transitionTime', `${this.settings.transitionTime}`);
        document.body.style.setProperty('--stcdx--zoomTime', `${this.settings.zoomTime}`);
        document.body.style.setProperty('--stcdx--mapZoneZoomTime', `${this.settings.mapZoneZoomTime}`);

        document.body.classList[this.settings.isParchment ? 'add' : 'remove']('stcdx--parchment');

        this.isActive = true;
        await this.updateChat();

        log('/START');
        this.isStarting = false;
    }

    async stop() {
        if (this.isStopping) return;
        if (!this.isActive) return;
        this.isStopping = true;
        log('STOP');

        this.isActive = false;
        // @ts-ignore
        Array.from(document.querySelectorAll('#chat > .mes .mes_text')).forEach(it=>this.linker.restoreChatMessage(it));
        this.matcher = null;
        this.linker = null;
        if (!getContext().chatId) {
            this.codex?.unrender();
            this.codex = null;
        } else {
            this.codex?.startReload();
        }
        this.wiButton.remove();
        this.wiButton = null;
        while (this.messageQueue.length > 0) this.messageQueue.pop();
        while (this.bookList.length > 0) this.bookList.pop();
        while (Tooltip.list.length > 0) Tooltip.list.pop().remove();

        log('/STOP');
        this.isStopping = false;
    }


    async loadBooks() {
        log('LOAD BOOKS');
        for (const name of this.wiSettings.bookNameList) {
            const book = new Book(name);
            await book.load();
            this.bookList.push(book);
        }
        log('/LOAD BOOKS');
    }


    async queueMessage(...idxList) {
        log('QUEUE MESSAGE', idxList);
        this.messageQueue.push(...idxList);
        await this.processQueueDebounced();
    }
    async queueMessageAndCycle(...idxList) {
        if (!this.isReady) return;
        log('QUEUE MESSAGE AND CYCLE', idxList);
        await this.queueMessage(...idxList);
        if (this.settings.cycle && idxList.length > 0) {
            const matches = this.matcher.findMatches(chat[idxList[0]].mes);
            this.cycleCodex(matches);
        }
    }
    async processQueue() {
        if (!this.isActive) return;
        if (this.messageQueue.length == 0) return;
        log('PROCESS QUEUE', this.messageQueue);
        const done = [];
        while (this.messageQueue.length > 0) {
            const idx = this.messageQueue.shift();
            if (done.includes(idx)) continue;
            if (!this.settings.disableLinks) {
                await this.updateMessageIdx(idx);
            }
            done.push(idx);
        }
        log('/PROCESS QUEUE');
    }


    async updateChat() {
        log('UPDATE CHAT');
        await this.queueMessage(...Array.from(document.querySelectorAll('#chat > .mes')).map(it=>it.getAttribute('mesid')));
        log('/UPDATE CHAT');
    }

    async updateMessageIdx(idx) {
        await this.updateMessage(document.querySelector(`#chat > .mes[mesid="${idx}"] .mes_text`));
    }
    async updateMessage(msg) {
        log('UPDATE MESSAGE', msg);
        this.linker.restoreChatMessage(msg);
        this.linker.addCodexLinks(msg);
        log('/UPDATE MESSAGE', msg);
    }




    /**
     *
     * @param {Number} chatIdx Index of the currently active chat
     */
    async handleChatChange(chatIdx) {
        if (this.codex?.isEditing) return;
        log('CHAT_CHANGED');
        await this.restartDebounced();
        log('/CHAT_CHANGED');
    }

    async handleWorldInfoSettingsChange() {
        if (this.codex?.isEditing) return;
        log('WI_CHANGED');
        await this.restartDebounced();
        log('/WI_CHANGED');
    }

    async handleBookUpdate(book, entries) {
        if (this.codex?.isEditing) return;
        if (JSON.stringify(this.bookList.find(it=>it.name == book)?.entryList ?? null) == JSON.stringify(entries.map(it=>Entry.from(book, it)))) {
            log('BOOK_UPDAtED', '--> same');
            return;
        }
        log('BOOK_UPDAtED', '--> diff', {
            o:JSON.stringify(this.bookList.find(it=>it.name == book)?.entryList ?? null),
            n:JSON.stringify(entries.map(it=>Entry.from(book, it))),
        });
        await this.restartDebounced();
        log('/BOOK_UPDAtED');
    }

    /**
     *
     * @param {Match} match
     */
    async showCodex(match = null) {
        await this.codex.show(match);
    }

    async hideCodex() {
        await this.codex.hide();
    }

    /**
     *
     * @param {Match} match
     */
    async toggleCodex(match = null) {
        await this.codex.toggle(match);
    }

    async cycleCodex(matches) {
        await this.codex.cycle(matches);
    }

    zoomCodex(idx) {
        this.codex.zoom(idx);
    }
}
