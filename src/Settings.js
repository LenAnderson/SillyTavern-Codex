import { saveSettingsDebounced } from '../../../../../script.js';
import { extension_settings } from '../../../../extensions.js';

import { Template } from './Template.js';
import { debounceAsync } from './lib/debounce.js';
import { warn } from './lib/log.js';




export class Settings {
    /**@type {Boolean}*/ isEnabled = true;
    /**@type {Boolean}*/ isVerbose = true;

    /**@type {String}*/ color = 'rgba(0, 255, 255, 1)';
    /**@type {String}*/ icon = '🧾';
    /**@type {Boolean}*/ onlyFirst = false;

    /**@type {Boolean}*/ noTooltips = false;
    /**@type {Boolean}*/ fixedTooltips = false;

    /**@type {Boolean}*/ requirePrefix = false;

    /**@type {String}*/ template = '## {{title}}\n\n{{content}}';
    /**@type {String}*/ mapTemplate = '## {{title}}\n\n{{map}}\n\n{{desription}}\n\n{{zones}}y';
    /**@type {Template[]}*/ templateList = [];

    /**@type {Boolean}*/ cycle = true;
    /**@type {Number}*/ cycleDelay = 1000;

    /**@type {Number}*/ mapZoom = 10;
    /**@type {Number}*/ mapShadow = 3;
    /**@type {String}*/ mapShadowColor = 'rgba(0, 0, 0, 1)';
    /**@type {Number}*/ mapDesaturate = 50;

    /**@type {Number}*/ headerFontSize = 2;

    /**@type {Number}*/ transitionTime = 400;
    /**@type {Number}*/ zoomTime = 400;
    /**@type {Number}*/ mapZoneZoomTime = 200;

    /**@type {Number}*/ historyLength = 10;

    /**@type {Function}*/ restartDebounced;
    /**@type {Function}*/ rerenderDebounced;

    /**@type {Function}*/ onRestartRequired;
    /**@type {Function}*/ onRerenderRequired;




    constructor(onRestartRequired, onRerenderRequired) {
        Object.assign(this, extension_settings.codex);
        this.templateList = this.templateList.map(it => Template.from(it));
        this.onRestartRequired = onRestartRequired;
        this.onRerenderRequired = onRerenderRequired;

        this.restartDebounced = debounceAsync(() => this.requestRestart());
        this.rerenderDebounced = debounceAsync(() => this.requestRerender());
        this.init();
    }


    toJSON() {
        return {
            isEnabled: this.isEnabled,
            isVerbose: this.isVerbose,

            color: this.color,
            icon: this.icon,
            onlyFirst: this.onlyFirst,

            noTooltips: this.noTooltips,
            fixedTooltips: this.fixedTooltips,

            requirePrefix: this.requirePrefix,

            template: this.template,
            templateList: this.templateList,

            cycle: this.cycle,
            cycleDelay: this.cycleDelay,

            mapZoom: this.mapZoom,
            mapShadow: this.mapShadow,
            mapShadowColor: this.mapShadowColor,
            mapDesaturate: this.mapDesaturate,

            headerFontSize: this.headerFontSize,

            transitionTime: this.transitionTime,
            zoomTime: this.zoomTime,
            mapZoneZoomTime: this.mapZoneZoomTime,

            historyLength: this.historyLength,
        };
    }


    save() {
        extension_settings.codex = this.toJSON();
        saveSettingsDebounced();
    }

    requestRestart() {
        this.onRestartRequired();
    }
    requestRerender() {
        this.onRerenderRequired();
    }


    async init() {
        const response = await fetch('/scripts/extensions/third-party/SillyTavern-Codex/html/settings.html');
        if (!response.ok) {
            return warn('failed to fetch template: stcdx--settings.html');
        }
        const settingsTpl = document.createRange().createContextualFragment(await response.text()).querySelector('#stcdx--settings');
        /**@type {HTMLElement} */
        // @ts-ignore
        const dom = settingsTpl.cloneNode(true);
        document.querySelector('#extensions_settings').append(dom);

        /**@type {HTMLInputElement} */
        const isEnabled = dom.querySelector('#stcdx--isEnabled');
        isEnabled.checked = this.isEnabled;
        isEnabled.addEventListener('click', () => {
            this.isEnabled = isEnabled.checked;
            this.save();
            this.restartDebounced();
        });
        /**@type {HTMLInputElement} */
        const requirePrefix = dom.querySelector('#stcdx--requirePrefix');
        requirePrefix.checked = this.requirePrefix;
        requirePrefix.addEventListener('click', () => {
            this.requirePrefix = requirePrefix.checked;
            this.save();
            this.restartDebounced();
        });
        /**@type {HTMLInputElement} */
        const onlyFirst = dom.querySelector('#stcdx--onlyFirst');
        onlyFirst.checked = this.onlyFirst;
        onlyFirst.addEventListener('click', () => {
            this.onlyFirst = onlyFirst.checked;
            this.save();
            this.restartDebounced();
        });
        /**@type {HTMLInputElement} */
        const noTooltips = dom.querySelector('#stcdx--noTooltips');
        noTooltips.checked = this.noTooltips;
        noTooltips.addEventListener('click', () => {
            this.noTooltips = noTooltips.checked;
            this.save();
            this.restartDebounced();
        });
        /**@type {HTMLInputElement} */
        const fixedTooltips = dom.querySelector('#stcdx--fixedTooltips');
        fixedTooltips.checked = this.fixedTooltips;
        fixedTooltips.addEventListener('click', () => {
            this.fixedTooltips = fixedTooltips.checked;
            this.save();
            this.restartDebounced();
        });
        /**@type {HTMLInputElement} */
        const transitionTime = dom.querySelector('#stcdx--transitionTime');
        transitionTime.value = `${this.transitionTime}`;
        transitionTime.addEventListener('input', () => {
            try {
                this.transitionTime = parseInt(transitionTime.value);
                document.body.style.setProperty('--stcdx--transitionTime', `${this.transitionTime}`);
                this.save();
            } catch { /* empty */ }
        });
        /**@type {HTMLInputElement} */
        const zoomTime = dom.querySelector('#stcdx--zoomTime');
        zoomTime.value = `${this.zoomTime}`;
        zoomTime.addEventListener('input', () => {
            try {
                this.zoomTime = parseInt(zoomTime.value);
                document.body.style.setProperty('--stcdx--zoomTime', `${this.zoomTime}`);
                this.save();
            } catch { /* empty */ }
        });
        /**@type {HTMLInputElement} */
        const cycle = dom.querySelector('#stcdx--cycle');
        cycle.checked = this.cycle;
        cycle.addEventListener('click', () => {
            this.cycle = cycle.checked;
            this.save();
        });
        /**@type {HTMLInputElement} */
        const cycleDelay = dom.querySelector('#stcdx--cycleDelay');
        cycleDelay.value = `${this.cycleDelay}`;
        cycleDelay.addEventListener('input', () => {
            try {
                this.cycleDelay = parseInt(cycleDelay.value);
                document.body.style.setProperty('--stcdx--cycleDelay', `${this.cycleDelay}`);
                this.save();
            } catch { /* empty */ }
        });
        /**@type {HTMLInputElement} */
        const headerFontSize = dom.querySelector('#stcdx--headerFontSize');
        headerFontSize.value = `${this.headerFontSize}`;
        headerFontSize.addEventListener('input', () => {
            try {
                this.headerFontSize = parseFloat(headerFontSize.value);
                document.body.style.setProperty('--stcdx--headerFontSize', `${this.headerFontSize}`);
                this.save();
            } catch { /* empty */ }
        });
        const color = dom.querySelector('#stcdx--color');
        // @ts-ignore
        color.color = this.color;
        color.addEventListener('change', (evt) => {
            // @ts-ignore
            this.color = evt.detail.rgba;
            document.body.style.setProperty('--stcdx--color', `${this.color}`);
            this.save();
        });
        /**@type {HTMLInputElement} */
        const icon = dom.querySelector('#stcdx--icon');
        icon.value = this.icon;
        icon.addEventListener('change', () => {
            this.icon = icon.value;
            document.body.style.setProperty('--stcdx--icon', `"${this.icon}"`);
            this.save();
        });
        /**@type {HTMLInputElement} */
        const mapZoneZoomTime = dom.querySelector('#stcdx--mapZoneZoomTime');
        mapZoneZoomTime.value = `${this.mapZoneZoomTime}`;
        mapZoneZoomTime.addEventListener('input', () => {
            try {
                this.mapZoneZoomTime = parseInt(mapZoneZoomTime.value);
                document.body.style.setProperty('--stcdx--mapZoneZoomTime', `${this.mapZoneZoomTime}`);
                this.save();
            } catch { /* empty */ }
        });
        /**@type {HTMLInputElement} */
        const mapZoom = dom.querySelector('#stcdx--mapZoom');
        mapZoom.value = `${this.mapZoom}`;
        mapZoom.addEventListener('input', () => {
            try {
                this.mapZoom = parseInt(mapZoom.value);
                document.body.style.setProperty('--stcdx--mapZoom', `${this.mapZoom}`);
                this.save();
            } catch { /* empty */ }
        });
        /**@type {HTMLInputElement} */
        const mapShadow = dom.querySelector('#stcdx--mapShadow');
        mapShadow.value = `${this.mapShadow}`;
        mapShadow.addEventListener('input', () => {
            try {
                this.mapShadow = parseInt(mapShadow.value);
                document.body.style.setProperty('--stcdx--mapShadow', `${this.mapShadow}`);
                this.save();
            } catch { /* empty */ }
        });
        /**@type {HTMLInputElement} */
        const mapShadowColor = dom.querySelector('#stcdx--mapShadowColor');
        // @ts-ignore
        mapShadowColor.color = this.mapShadowColor;
        mapShadowColor.addEventListener('change', (evt) => {
            // @ts-ignore
            this.mapShadowColor = evt.detail.rgba;
            document.body.style.setProperty('--stcdx--mapShadowColor', `${this.mapShadowColor}`);
            this.save();
        });
        /**@type {HTMLInputElement} */
        const mapDesaturate = dom.querySelector('#stcdx--mapDesaturate');
        mapDesaturate.value = `${this.mapDesaturate}`;
        mapDesaturate.addEventListener('input', () => {
            try {
                this.mapDesaturate = parseInt(mapDesaturate.value);
                document.body.style.setProperty('--stcdx--mapDesaturate', `${this.mapDesaturate}`);
                this.save();
            } catch { /* empty */ }
        });
        /**@type {HTMLTextAreaElement} */
        const template = dom.querySelector('#stcdx--template');
        template.value = this.template;
        template.addEventListener('change', () => {
            this.template = template.value;
            this.save();
            this.rerenderDebounced();
        });
        /**@type {HTMLElement} */
        const add = dom.querySelector('#stcdx--addTemplate');
        this.templateList.forEach(t => this.renderTemplate(t, add));
        add.addEventListener('click', () => {
            const template = new Template();
            this.templateList.push(template);
            this.save();
            this.renderTemplate(template, add);
        });
    }


    renderTemplate(template, add) {
        const wrap = document.createElement('div'); {
            wrap.classList.add('stcdx--template');
            const cont = document.createElement('div'); {
                cont.classList.add('stcdx--content');
                const row = document.createElement('div'); {
                    row.classList.add('stcdx--row');
                    const name = document.createElement('input'); {
                        name.classList.add('stcdx--name');
                        name.classList.add('text_pole');
                        name.placeholder = 'name';
                        name.value = template.name;
                        name.addEventListener('input', () => {
                            template.name = name.value;
                            this.save();
                            this.rerenderDebounced();
                        });
                        row.append(name);
                    }
                    const del = document.createElement('div'); {
                        del.classList.add('stcdx--action');
                        del.classList.add('menu_button');
                        del.classList.add('menu_button_icon');
                        del.classList.add('fa-solid');
                        del.classList.add('fa-trash-can');
                        del.classList.add('redWarningBG');
                        del.title = 'Remove template';
                        del.addEventListener('click', () => {
                            wrap.remove();
                            this.templateList.splice(this.templateList.indexOf(template), 1);
                            this.save();
                            this.rerenderDebounced();
                        });
                        row.append(del);
                    }
                    cont.append(row);
                }
                const tpl = document.createElement('textarea'); {
                    tpl.classList.add('stcdx--tpl');
                    tpl.classList.add('text_pole');
                    tpl.placeholder = 'template (markdown)';
                    tpl.rows = 6;
                    tpl.value = template.content;
                    tpl.addEventListener('input', () => {
                        template.content = tpl.value;
                        this.save();
                        this.rerenderDebounced();
                    });
                    cont.append(tpl);
                }
                wrap.append(cont);
            }
            add.insertAdjacentElement('beforebegin', wrap);
        }
    }
}
