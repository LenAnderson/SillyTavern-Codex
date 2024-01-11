import { debounceAsync, makeCodexDom } from '../index.js';

export class Tooltip {
    /**@type {Tooltip[]} */ static list = [];


    static create(/**@type {HTMLElement}*/trigger, /**@type {Object}*/match, /**@type {Boolean}*/isFixed) {
        const tt = new Tooltip(trigger, match, isFixed);
        this.list.push(tt);
        return tt;
    }
    static clear() {
        while (this.list.length > 0) {
            const tt = this.list.pop();
            tt.hide();
        }
    }




    /**@type {HTMLElement}*/ trigger;
    /**@type {HTMLElement}*/ root;
    /**@type {Function}*/ boundMove;
    /**@type {Function}*/ boundScroll;
    /**@type {Function}*/ updatePositionDebounced;
    /**@type {Object}*/ match;
    /**@type {Boolean}*/ isFixed;
    /**@type {Boolean}*/ isFrozen = false;




    constructor(/**@type {HTMLElement}*/trigger, /**@type {Object}*/match, /**@type {Boolean}*/isFixed) {
        this.trigger = trigger;
        this.match = match;
        this.isFixed = isFixed;
        const root = document.createElement('div'); {
            this.root = root;
            root.classList.add('stcdx--tooltip');
            root.classList.add('stcdx--fixed');
            root.classList.add('mes_text');
        }
        this.boundMove = this.move.bind(this);
        this.boundScroll = this.scroll.bind(this);
        this.updatePositionDebounced = debounceAsync(async(x, y)=>await this.updatePosition(x, y));
        trigger.addEventListener('pointerenter', evt=>this.show(evt));
        trigger.addEventListener('pointerleave', ()=>this.hide());
    }




    updatePosition(x, y) {
        if (this.isFixed) return;
        if (this.isFrozen) return;
        const rect = this.root.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        x += 10;
        y += 10;
        if (x + w > window.innerWidth) {
            x = x - w - 20;
        }
        y = Math.min(window.innerHeight - h - 10, y);
        this.root.style.left = `${x}px`;
        this.root.style.top = `${y}px`;
    }
    show(/**@type {PointerEvent}*/evt) {
        if (this.isFrozen) return;
        this.root.innerHTML = makeCodexDom(this.match);
        document.body.append(this.root);
        this.updatePosition(evt.clientX, evt.clientY);
        window.addEventListener('pointermove', this.boundMove);
        this.trigger.addEventListener('wheel', this.boundScroll);
    }
    hide(isForced=false) {
        if (!isForced && this.isFrozen) return;
        this.root?.remove();
        window.removeEventListener('pointermove', this.boundMove);
        window.removeEventListener('pointermove', this.boundScroll);
    }
    move(/**@type {PointerEvent}*/evt) {
        if (this.isFrozen) return;
        this.updatePositionDebounced(evt.clientX, evt.clientY);
    }
    scroll(/**@type {WheelEvent}*/evt) {
        if (this.isFrozen) return;
        evt.preventDefault();
        this.root.scrollTop += evt.deltaY;
    }
}
