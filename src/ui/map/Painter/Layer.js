import { warn } from '../../../lib/log.js';




export class Layer {
    /**@type {Number}*/ width;
    /**@type {Number}*/ height;
    /**@type {Number}*/ index;

    /**@type {HTMLCanvasElement}*/ canvas;
    /**@type {CanvasRenderingContext2D}*/ context;
    /**@type {ImageData[]}*/ history = [];
    /**@type {Number}*/ historyIndex = -1;




    constructor(width, height, index) {
        this.width = width;
        this.height = height;
        this.index = index;
    }


    /**
     *
     * @param {String} paint
     */
    async render(paint = null) {
        if (!this.canvas) {
            const canvas = document.createElement('canvas'); {
                this.canvas = canvas;
                canvas.classList.add('stcdx--painter-layer');
                canvas.width = this.width;
                canvas.height = this.height;
                this.context = canvas.getContext('2d');
                if (paint) {
                    try {
                        const img = new Image();
                        await new Promise(resolve=>{
                            img.addEventListener('load', resolve);
                            img.addEventListener('error', resolve);
                            img.src = paint;
                            if (img.complete) resolve();
                        });
                        this.context.drawImage(img, 0, 0);
                    } catch (ex) {
                        warn('PAINT FAILED', ex);
                    }
                }
            }
            this.memorize();
        }
        return this.canvas;
    }

    unrender() {
        this.canvas.remove();
    }


    clear() {
        this.context.clearRect(0, 0, this.width, this.height);
    }


    memorize() {
        while (this.history.length > this.historyIndex + 1) this.history.pop();
        this.history.push(this.context.getImageData(0, 0, this.width, this.height));
        while (this.history.length > 20) this.history.shift();
        this.historyIndex = this.history.length - 1;
    }

    undo() {
        if (this.history.length > 0 && this.historyIndex > 0) {
            this.historyIndex--;
            this.context.putImageData(this.history[this.historyIndex], 0, 0);
        }
    }

    redo() {
        if (this.history.length > 0 && this.historyIndex + 1 < this.history.length) {
            this.historyIndex++;
            this.context.putImageData(this.history[this.historyIndex], 0, 0);
        }
    }
}
