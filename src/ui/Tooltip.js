// eslint-disable-next-line no-unused-vars
import { Linker } from '../Linker.js';
// eslint-disable-next-line no-unused-vars
import { Matcher } from '../Matcher.js';
// eslint-disable-next-line no-unused-vars
import { Settings } from '../Settings.js';
// eslint-disable-next-line no-unused-vars
import { Entry } from '../st/wi/Entry.js';
// eslint-disable-next-line no-unused-vars
import { CodexBaseEntry } from './CodexBaseEntry.js';
import { CodexCharList } from './CodexCharList.js';
import { CodexEntry } from './CodexEntry.js';
import { CodexMap } from './CodexMap.js';




export class Tooltip {
    /**@type {Tooltip[]}*/ static list = [];


    static get(entry, settings, matcher, linker) {
        let item = this.list.find(it=>it.entry == entry);
        if (!item) {
            item = new this(entry, settings, matcher, linker);
            this.list.push(item);
        }
        return item;
    }




    /**@type {Entry}*/ entry;
    /**@type {Settings}*/ settings;
    /**@type {Matcher}*/ matcher;
    /**@type {Linker}*/ linker;

    /**@type {Boolean}*/ isFrozen = false;

    /**@type {Function}*/ boundMove;
    /**@type {Function}*/ boundScroll;

    /**@type {HTMLElement[]}*/ triggerList = [];

    /**@type {HTMLElement}*/ dom;
    /**@type {CodexBaseEntry}*/ content;




    constructor(entry, settings, matcher, linker) {
        this.entry = entry;
        this.settings = settings;
        this.matcher = matcher;
        this.linker = linker;

        this.boundMove = this.move.bind(this);
        this.boundScroll = this.scroll.bind(this);

        this.dom = document.createElement('div'); {
            this.dom.classList.add('stcdx--tooltip');
            this.dom.classList.add('stcdx--root');
            this.dom.classList.add('draggable');
            this.dom.setAttribute('data-codex', this.entry.title);
        }
    }


    remove() {
        while (this.triggerList.length > 0) this.removeTrigger(this.triggerList[0]);
        this.hide();
        this.dom.remove();
        if (Tooltip.list.includes(this)) {
            Tooltip.list.splice(Tooltip.list.indexOf(this), 1);
        }
    }


    addTrigger(el) {
        this.triggerList.push(el);
        el.addEventListener('pointerenter', evt=>this.show(evt));
        el.addEventListener('pointerleave', evt=>this.hide());
    }
    removeTrigger(el) {
        while (this.triggerList.includes(el)) {
            this.triggerList.splice(this.triggerList.indexOf(el), 1);
        }
    }


    freeze() {
        this.isFrozen = true;
    }




    updatePosition(x, y) {
        if (this.settings.fixedTooltips) {
            this.dom.style.left = '';
            this.dom.style.left = '';
            return;
        }
        const rect = this.dom.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        x += 10;
        y += 10;
        if (x + w > window.innerWidth) {
            x = x - w - 20;
        }
        y = Math.min(window.innerHeight - h - 10, y);
        this.dom.style.left = `${x}px`;
        this.dom.style.top = `${y}px`;
    }


    /**
     *
     * @param {PointerEvent} evt
     */
    async show(evt) {
        if (!this.content) {
            let content;
            if (this.entry.isMap) {
                content = new CodexMap(this.entry, this.settings, this.matcher, this.linker);
            } else if (this.entry.isCharList) {
                content = new CodexCharList(this.entry, this.settings, this.matcher, this.linker);
            } else {
                content = new CodexEntry(this.entry, this.settings, this.matcher, this.linker);
            }
            this.dom.append(await content.render());
            this.content = content;
            content.dom.classList.add('stcdx--preactive');
            content.dom.classList.add('stcdx--active');
        }
        this.dom.classList.add('stcdx--active');
        this.dom.classList[this.settings.fixedTooltips ? 'add' : 'remove']('stcdx--fixed');
        this.updatePosition(evt.x, evt.y);
        // @ts-ignore
        window.addEventListener('pointermove', this.boundMove);
        // @ts-ignore
        evt.target.addEventListener('wheel', this.boundScroll);
        document.body.append(this.dom);
    }

    hide(isForced = false) {
        if (this.isFrozen && !isForced) return;
        this.isFrozen = false;
        this.dom?.remove();
        // @ts-ignore
        window.removeEventListener('pointermove', this.boundMove);
        // @ts-ignore
        this.triggerList.forEach(it=>it.removeEventListener('scroll', this.boundScroll));
    }




    move(evt) {
        this.updatePosition(evt.x, evt.y);
    }
    scroll(evt) {
        evt.preventDefault();
        this.content.scroll(evt.deltaY);
    }
}
