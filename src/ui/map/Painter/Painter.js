import { callPopup } from '../../../../../../../../script.js';
import { log, warn } from '../../../lib/log.js';
import { PaintLayer } from '../PaintLayer.js';
import { Point } from '../Point.js';
import { Layer } from './Layer.js';
import { Brush } from './tool/Brush.js';
import { Eraser } from './tool/Eraser.js';
import { Line } from './tool/Line.js';
import { Pencil } from './tool/Pencil.js';
import { Rectangle } from './tool/Rectangle.js';
// eslint-disable-next-line no-unused-vars
import { Tool } from './tool/Tool.js';




export class Painter {
    /**@type {HTMLElement}*/ parent;
    /**@type {HTMLElement}*/ controlsContainer;
    /**@type {Number}*/ width;
    /**@type {Number}*/ height;
    /**@type {PaintLayer[]}*/ paintList = [];

    /**@type {Tool}*/ tool;
    /**@type {Layer[]}*/ layerList = [];
    /**@type {Number}*/ layerIndex = -1;
    get layer() { return this.layerList[this.layerIndex]; }
    /**@type {HTMLElement}*/ layerPanel;

    /**@type {Boolean}*/ isDrawing = false;

    /**@type {HTMLCanvasElement}*/ inputCanvas;
    /**@type {CanvasRenderingContext2D}*/ inputContext;




    constructor(parent, controlsContainer, width, height, paintList) {
        this.parent = parent;
        this.controlsContainer = controlsContainer;
        this.width = width;
        this.height = height;
        this.paintList = paintList;
        this.tool = new Pencil();
        this.tool.width = 10;
        this.tool.color = 'rgba(0, 0, 0, 1)';
    }

    async render() {
        this.renderControls();

        for (const paint of this.paintList ?? [new PaintLayer()]) {
            await this.addLayer(paint);
        }

        const inputCanvas = document.createElement('canvas'); {
            this.inputCanvas = inputCanvas;
            inputCanvas.classList.add('stcdx--painter-inputCanvas');
            inputCanvas.width = this.width;
            inputCanvas.height = this.height;
            inputCanvas.addEventListener('pointerdown', (evt)=>this.handlePointerDown(evt));
            inputCanvas.addEventListener('touchstart', (evt)=>this.handlePointerDown(evt));
            inputCanvas.addEventListener('pointerup', (evt)=>this.handlePointerUp(evt));
            inputCanvas.addEventListener('touchend', (evt)=>this.handlePointerUp(evt));
            inputCanvas.addEventListener('pointermove', (evt)=>this.handlePointerMove(evt));
            inputCanvas.addEventListener('touchmove', (evt)=>this.handlePointerMove(evt));
            this.inputContext = inputCanvas.getContext('2d');
            this.parent.append(inputCanvas);
        }

        this.tool.context = this.inputContext;
        this.updateCursor();
    }

    renderControls() {
        const dom = this.controlsContainer;
        const basics = document.createElement('div'); {
            basics.classList.add('stcdx--painter-group');
            const layers = document.createElement('div'); {
                layers.classList.add('stcdx--painter-layers');
                layers.classList.add('stcdx--active');
                layers.title = 'Layers';
                layers.addEventListener('click', ()=>{
                    layers.classList.toggle('stcdx--active');
                });
                const lp = document.createElement('div'); {
                    this.layerPanel = lp;
                    lp.classList.add('stcdx--painter-layerPanel');
                    const add = document.createElement('div'); {
                        add.classList.add('stcdx--painter-add');
                        add.textContent = '+';
                        add.title = 'Add layer';
                        add.addEventListener('click', (evt)=>{
                            evt.stopPropagation();
                            this.addLayer();
                        });
                        lp.append(add);
                    }
                    layers.append(lp);
                }
                basics.append(layers);
            }
            const undo = document.createElement('div'); {
                undo.classList.add('stcdx--painter-undo');
                undo.title = 'Undo';
                undo.addEventListener('click', ()=>{
                    this.layer.undo();
                });
                basics.append(undo);
            }
            const redo = document.createElement('div'); {
                redo.classList.add('stcdx--painter-redo');
                redo.title = 'Redo';
                redo.addEventListener('click', ()=>{
                    this.layer.redo();
                });
                basics.append(redo);
            }
            const clear = document.createElement('div'); {
                clear.classList.add('stcdx--painter-clear');
                clear.title = 'Clear';
                clear.addEventListener('click', ()=>{
                    this.layer.clear();
                    this.layer.memorize();
                });
                basics.append(clear);
            }
            const eraser = document.createElement('div'); {
                eraser.classList.add('stcdx--painter-eraser');
                eraser.classList.add('stcdx--tool');
                eraser.title = 'Eraser';
                eraser.addEventListener('click', ()=>{
                    const t = new Eraser();
                    t.width = this.tool.width;
                    t.color = this.tool.color;
                    t.context = this.inputContext;
                    t.targetCanvas = this.layer.canvas;
                    this.tool = t;
                    Array.from(tools.querySelectorAll('.stcdx--tool.stcdx--active')).forEach(it=>it.classList.remove('stcdx--active'));
                    eraser.classList.add('stcdx--active');
                });
                basics.append(eraser);
            }
            dom.append(basics);
        }
        const tools = document.createElement('div'); {
            tools.classList.add('stcdx--painter-group');
            const pencil = document.createElement('div'); {
                pencil.classList.add('stcdx--painter-pencil');
                pencil.classList.add('stcdx--tool');
                pencil.classList.add('stcdx--active');
                pencil.title = 'Pencil';
                pencil.addEventListener('click', ()=>{
                    const t = new Pencil();
                    t.width = this.tool.width;
                    t.color = this.tool.color;
                    t.context = this.inputContext;
                    this.tool = t;
                    Array.from(tools.querySelectorAll('.stcdx--tool.stcdx--active')).forEach(it=>it.classList.remove('stcdx--active'));
                    pencil.classList.add('stcdx--active');
                });
                tools.append(pencil);
            }
            const brush = document.createElement('div'); {
                brush.classList.add('stcdx--painter-brush');
                brush.classList.add('stcdx--tool');
                brush.title = 'Brush';
                brush.addEventListener('click', ()=>{
                    const t = new Brush();
                    t.width = this.tool.width;
                    t.color = this.tool.color;
                    t.context = this.inputContext;
                    this.tool = t;
                    Array.from(tools.querySelectorAll('.stcdx--tool.stcdx--active')).forEach(it=>it.classList.remove('stcdx--active'));
                    brush.classList.add('stcdx--active');
                });
                tools.append(brush);
            }
            const rect = document.createElement('div'); {
                rect.classList.add('stcdx--painter-rectangle');
                rect.classList.add('stcdx--tool');
                rect.title = 'Rectangle\n-------------------\n[CTRL] expand from center\n[SHIFT] draw square\n[SPACE] draw at an angle';
                rect.addEventListener('click', ()=>{
                    const t = new Rectangle();
                    t.width = this.tool.width;
                    t.color = this.tool.color;
                    t.context = this.inputContext;
                    this.tool = t;
                    Array.from(tools.querySelectorAll('.stcdx--tool.stcdx--active')).forEach(it=>it.classList.remove('stcdx--active'));
                    rect.classList.add('stcdx--active');
                });
                tools.append(rect);
            }
            const oval = document.createElement('div'); {
                oval.classList.add('stcdx--painter-oval');
                oval.classList.add('stcdx--tool');
                oval.title = 'Oval (not implemented)';
                tools.append(oval);
            }
            const line = document.createElement('div'); {
                line.classList.add('stcdx--painter-line');
                line.classList.add('stcdx--tool');
                line.title = 'Line\n-------------------\n[CTRL] expand from center\n[SHIFT] draw at 45° angles';
                line.addEventListener('click', ()=>{
                    const t = new Line();
                    t.width = this.tool.width;
                    t.color = this.tool.color;
                    t.context = this.inputContext;
                    this.tool = t;
                    Array.from(tools.querySelectorAll('.stcdx--tool.stcdx--active')).forEach(it=>it.classList.remove('stcdx--active'));
                    line.classList.add('stcdx--active');
                });
                tools.append(line);
            }
            dom.append(tools);
        }
        const smooth = document.createElement('div'); {
            smooth.classList.add('stcdx--painter-group');
            const smoothing = document.createElement('div'); {
                smoothing.classList.add('stcdx--painter-smoothing-radius');
                smoothing.classList.add('stcdx--active');
                smoothing.title = 'Line Smoothing\n-------------------\n(enabled, config not implemented)\nWith line smoothing enabled, the drawn line will trail a bit behind your cursor to create smoother strokes';
                smooth.append(smoothing);
            }
            const catchUp = document.createElement('div'); {
                catchUp.classList.add('stcdx--painter-smoothing-catchup');
                catchUp.classList.add('stcdx--active');
                catchUp.title = 'Catch up\n-------------------\n(enabled, config not implemented)\nContinue the smoothed line to the cursor position when lifting the pen';
                catchUp.textContent = '';
                smooth.append(catchUp);
            }
            dom.append(smooth);
        }
        const color = document.createElement('div'); {
            color.classList.add('stcdx--painter-colors');
            const cs = window.getComputedStyle(document.body);
            [
                'rgba(0, 0, 0, 1)',
                'rgba(255, 255, 255, 1)',
                cs.getPropertyValue('--SmartThemeBodyColor'),
                cs.getPropertyValue('--SmartThemeQuoteColor'),
                cs.getPropertyValue('--SmartThemeEmColor'),

                'rgba(255, 0, 0, 1)',
                'rgba(0, 255, 0, 1)',
                'rgba(0, 0, 255, 1)',
                'rgba(255, 255, 0, 1)',
                'rgba(255, 0, 255, 1)',
            ].forEach(c=>{
                const swatch = document.createElement('div'); {
                    swatch.classList.add('stcdx--painter-swatch');
                    swatch.style.backgroundColor = c;
                    swatch.addEventListener('click', ()=>{
                        this.tool.color = c;
                    });
                    color.append(swatch);
                }
            });
            dom.append(color);
        }
        const width = document.createElement('div'); {
            width.classList.add('stcdx--painter-width');
            const inp = document.createElement('input'); {
                inp.classList.add('stcdx--painter-widthInput');
                inp.type = 'range';
                inp.min = '1';
                inp.max = '100';
                inp.value = '10';
                width.append(inp);
            }
            const dc = document.createElement('div'); {
                dc.classList.add('stcdx--painter-widthDisplayContainer');
                const disp = document.createElement('div'); {
                    disp.classList.add('stcdx--painter-widthDisplay');
                    disp.style.width = '10px';
                    disp.style.height = '10px';
                    dc.append(disp);
                }
                inp.addEventListener('input', ()=>{
                    const value = Number(inp.value);
                    disp.style.width = `${value}px`;
                    disp.style.height = `${value}px`;
                    this.tool.width = value;
                    this.updateCursor();
                });
                width.append(dc);
            }
            dom.append(width);
        }
    }

    unrender() {
        for (const layer of this.layerList) {
            layer.unrender();
        }
        this.inputCanvas.remove();
        this.controlsContainer.innerHTML = '';
    }

    updateCursor() {
        const value = this.tool.width;
        const cc = document.createElement('canvas'); {
            const rect = this.inputCanvas.getBoundingClientRect();
            const scale = rect.width / this.width;
            const sv = value * scale;
            cc.width = sv + 2;
            cc.height = sv + 2;
            const con = cc.getContext('2d');
            con.strokeStyle = 'white';
            con.lineWidth = 3;
            con.beginPath();
            con.ellipse(sv / 2 + 1, sv / 2 + 1, sv / 2, sv / 2, 0, 0, 2 * Math.PI);
            con.closePath();
            con.stroke();
            con.strokeStyle = 'silver';
            con.lineWidth = 1;
            con.beginPath();
            con.ellipse(sv / 2 + 1, sv / 2 + 1, sv / 2, sv / 2, 0, 0, 2 * Math.PI);
            con.closePath();
            con.stroke();
            this.inputCanvas.style.cursor = `url(${cc.toDataURL()}) ${sv/2 + 1} ${sv/2 + 1}, auto`;
        }
    }




    /**
     *
     * @param {PaintLayer} paint
     */
    async addLayer(paint = null) {
        const layer = new Layer(this.width, this.height, this.layerList.length == 0 ? 1 : (Math.max(...this.layerList.map(it=>it.index)) + 1));
        layer.isZone = paint?.isZone ?? false;
        layer.zone = paint?.zone;
        layer.name = layer.zone?.label ?? layer.name;
        layer.isLocked = paint?.isLocked;
        this.layerList.push(layer);
        const canvas = await layer.render(paint?.paint);
        this.parent.append(canvas);
        this.layerIndex = this.layerList.length - 1;
        const el = document.createElement('div'); {
            el.classList.add('stcdx--painter-layerTrigger');
            el.title = '';
            const thumb = document.createElement('canvas'); {
                thumb.classList.add('stcdx--painter-thumb');
                thumb.height = 50;
                thumb.width = 50 / this.height * this.width;
                thumb.title = 'Switch to layer';
                thumb.addEventListener('click', (evt)=>{
                    evt.stopPropagation();
                    this.layerIndex = this.layerList.indexOf(layer);
                    Array.from(this.layerPanel.querySelectorAll('.stcdx--painter-layerTrigger.stcdx--active')).forEach(it=>it.classList.remove('stcdx--active'));
                    el.classList.add('stcdx--active');
                });
                layer.thumbContext = thumb.getContext('2d');
                layer.updateThumb();
                el.append(thumb);
            }
            const title = document.createElement('div'); {
                title.classList.add('stcdx--painter-title');
                title.classList.add('menu_button');
                title.textContent = layer.name;
                title.title = 'Rename layer';
                title.addEventListener('click', async(evt)=>{
                    evt.stopPropagation();
                    const newTitle = await callPopup('Layer name', 'input', title.textContent);
                    if (newTitle) {
                        title.textContent = newTitle;
                        layer.name = newTitle;
                    }
                });
                el.append(title);
            }
            const zone = document.createElement('label'); {
                zone.classList.add('stcdx--painter-zoneWrap');
                zone.title = 'Use layer as zone';
                zone.addEventListener('click', (evt)=>evt.stopPropagation());
                zone.append('Zone');
                const cb = document.createElement('input'); {
                    cb.type = 'checkbox';
                    cb.checked = layer.isZone;
                    cb.addEventListener('click', (evt)=>{
                        evt.stopPropagation();
                        layer.isZone = cb.checked;
                    });
                    zone.append(cb);
                }
                el.append(zone);
            }
            const actions = document.createElement('div'); {
                actions.classList.add('stcdx--painter-actions');
                const zoneLock = document.createElement('div'); {
                    zoneLock.classList.add('stcdx--painter-action');
                    zoneLock.classList.add('stcdx--painter-zoneLock');
                    zoneLock.classList.add('menu_button');
                    zoneLock.classList.add('menu_button_icon');
                    zoneLock.classList.add('fa-solid');
                    if (layer.isLocked) {
                        zoneLock.classList.add('fa-lock');
                    } else {
                        zoneLock.classList.add('fa-lock-open');
                    }
                    zoneLock.title = 'Lock / unlock zone\n-------------------\nDo not automatically regenerate zone';
                    zoneLock.addEventListener('click', (evt)=>{
                        evt.stopPropagation();
                        layer.isLocked = !layer.isLocked;
                        zoneLock.classList.toggle('fa-lock-open');
                        zoneLock.classList.toggle('fa-lock');
                    });
                    actions.append(zoneLock);
                }
                const hide = document.createElement('div'); {
                    hide.classList.add('stcdx--painter-action');
                    hide.classList.add('stcdx--painter-hide');
                    hide.classList.add('menu_button');
                    hide.classList.add('menu_button_icon');
                    hide.classList.add('fa-solid');
                    hide.classList.add('fa-eye');
                    hide.title = 'Hide / show layer';
                    hide.addEventListener('click', (evt)=>{
                        evt.stopPropagation();
                        layer.canvas.classList.toggle('stcdx--painter-isHidden');
                        hide.classList.toggle('fa-eye');
                        hide.classList.toggle('fa-eye-slash');
                    });
                    actions.append(hide);
                }
                const remove = document.createElement('div'); {
                    remove.classList.add('stcdx--painter-action');
                    remove.classList.add('stcdx--painter-remove');
                    remove.classList.add('menu_button');
                    remove.classList.add('menu_button_icon');
                    remove.classList.add('fa-solid');
                    remove.classList.add('fa-trash');
                    remove.classList.add('redWarningBG');
                    remove.title = 'Remove layer';
                    remove.addEventListener('click', (evt)=>{
                        evt.stopPropagation();
                        el.remove();
                        this.layerList.splice(this.layerList.indexOf(layer), 1);
                        layer.unrender();
                    });
                    actions.append(remove);
                }
                el.append(actions);
            }
            this.layerPanel.children[0].insertAdjacentElement('afterend', el);
        }

        this.layerIndex = this.layerList.indexOf(layer);
        Array.from(this.layerPanel.querySelectorAll('.stcdx--painter-layerTrigger.stcdx--active')).forEach(it=>it.classList.remove('stcdx--active'));
        el.classList.add('stcdx--active');
    }




    /**
     *
     * @param {PointerEvent} evt
     */
    getPoint(evt) {
        const rect = this.inputCanvas.getBoundingClientRect();
        const scale = this.inputCanvas.width / rect.width;
        let x;
        let y;
        if (evt instanceof TouchEvent) {
            const touch = evt.touches[0] || evt.changedTouches[0];
            x = (touch.clientX - rect.left) * scale;
            y = (touch.clientY - rect.top) * scale;
        } else {
            x = (evt.x - rect.left) * scale;
            y = (evt.y - rect.top) * scale;
        }
        const p = new Point();
        p.x = x;
        p.y = y;
        return p;
    }


    async handlePointerDown(evt) {
        log('[PAINTER]', 'DOWN');
        if (this.isDrawing) return;
        evt.preventDefault();
        this.isDrawing = true;
        if (this.tool instanceof Eraser) {
            this.tool.targetCanvas = this.layer.canvas;
        }
        this.tool.start(this.getPoint(evt));
    }
    async handlePointerUp(evt) {
        log('[PAINTER]', 'UP');
        if (!this.isDrawing) return;
        evt.preventDefault();
        this.isDrawing = false;
        this.tool.stop(this.getPoint(evt));
        const path = [...this.tool.path];
        this.tool.drawPath(path, this.layer.context);
        this.layer.memorize();
        this.inputContext.clearRect(0, 0, this.width, this.height);
    }
    async handlePointerMove(evt) {
        if (!this.isDrawing) return;
        evt.preventDefault();
        this.tool.move(this.getPoint(evt));
    }
}
