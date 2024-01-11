import { debounceAsync, makeCodexDom } from '../index.js';

export class Tooltip {
    /**@type {HTMLElement}*/ trigger;
    /**@type {HTMLElement}*/ root;
    /**@type {Function}*/ boundMove;
    /**@type {Function}*/ boundScroll;
    /**@type {Function}*/ updatePositionDebounced;
    /**@type {Object}*/ match;
    /**@type {Boolean}*/ isFixed;




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
        this.root.innerHTML = makeCodexDom(this.match);
        document.body.append(this.root);
        this.updatePosition(evt.clientX, evt.clientY);
        window.addEventListener('pointermove', this.boundMove);
        this.trigger.addEventListener('wheel', this.boundScroll);
    }
    hide() {
        this.root?.remove();
        window.removeEventListener('pointermove', this.boundMove);
        window.removeEventListener('pointermove', this.boundScroll);
    }
    move(/**@type {PointerEvent}*/evt) {
        this.updatePositionDebounced(evt.clientX, evt.clientY);
    }
    scroll(/**@type {WheelEvent}*/evt) {
        evt.preventDefault();
        this.root.scrollTop += evt.deltaY;
    }
}
