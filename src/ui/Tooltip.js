// eslint-disable-next-line no-unused-vars
import { Linker } from '../Linker.js';
// eslint-disable-next-line no-unused-vars
import { Matcher } from '../Matcher.js';
// eslint-disable-next-line no-unused-vars
import { Settings } from '../Settings.js';
import { waitForFrame } from '../lib/wait.js';
// eslint-disable-next-line no-unused-vars
import { Entry } from '../st/wi/Entry.js';
// eslint-disable-next-line no-unused-vars
import { CodexBaseEntry } from './CodexBaseEntry.js';
import { CodexEntryFactory } from './CodexEntryFactory.js';




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
    /**@type {Boolean}*/ isHidden = true;

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
        this.isHidden = false;
        if (!this.content) {
            let content = CodexEntryFactory.create(this.entry, this.settings, this.matcher, this.linker);
            this.dom.append(await content.render());
            if (this.isHidden) return;
            this.content = content;
            content.dom.classList.add('stcdx--preactive');
            content.dom.classList.add('stcdx--active');
        }
        this.dom.classList.add('stcdx--active');
        this.dom.classList[this.settings.fixedTooltips ? 'add' : 'remove']('stcdx--fixed');
        // @ts-ignore
        window.addEventListener('pointermove', this.boundMove);
        // @ts-ignore
        evt.target.addEventListener('wheel', this.boundScroll);
        document.body.append(this.dom);
        await waitForFrame();
        this.updatePosition(evt.x, evt.y);
    }

    hide(isForced = false) {
        if (this.isFrozen && !isForced) return;
        this.isHidden = true;
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
