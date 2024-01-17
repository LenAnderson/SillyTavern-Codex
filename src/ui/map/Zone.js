import { tryDecodeBase64 } from '../../lib/base64.js';
import { log } from '../../lib/log.js';
import { Point } from './Point.js';




export class Zone {
    static from(props) {
        const instance = Object.assign(new this(), props);
        instance.polygon = (props.polygon ?? []).map(it => Point.from(it));
        instance.label = instance.label ? tryDecodeBase64(instance.label) : null;
        instance.url = instance.url ? tryDecodeBase64(instance.url) : null;
        instance.description = instance.description ? tryDecodeBase64(instance.description) : null;
        instance.command = instance.command ? tryDecodeBase64(instance.command) : null;
        return instance;
    }




    /**@type {String}*/ label;
    /**@type {String}*/ url;
    /**@type {Promise}*/ imageLoaded;
    /**@type {Boolean}*/ isAlwaysVisible = false;
    /**@type {String}*/ description;
    /**@type {String}*/ key;
    /**@type {Boolean}*/ overrideZoom = false;
    /**@type {Number}*/ zoom = 10;
    /**@type {Boolean}*/ overrideShadow = false;
    /**@type {Number}*/ shadow = 3;
    /**@type {Boolean}*/ overrideShadowColor = false;
    /**@type {String}*/ shadowColor = 'rgba(0, 0, 0, 1)';
    /**@type {Point[]}*/ polygon;
    //TODO add bool for not closing zoomed map on click
    /**@type {String}*/ command;
    /**@type {String}*/ qrSet;

    /**@type {HTMLElement}*/ dom;
    /**@type {HTMLImageElement}*/ image;
    /**@type {String}*/ imageSrc;


    toJSON() {
        return {
            label: this.label ? window.btoa(this.label) : null,
            url: this.url ? window.btoa(this.url) : null,
            isAlwaysVisible: this.isAlwaysVisible,
            description: this.description ? window.btoa(this.description) : null,
            key: this.key,
            polygon: this.polygon,
            command: this.command ? window.btoa(this.command) : null,
            qrSet: this.qrSet,
            overrideZoom: this.overrideZoom,
            zoom: this.zoom,
            overrideShadow: this.overrideShadow,
            shadow: this.shadow,
            overrideShadowColor: this.overrideShadowColor,
            shadowColor: this.shadowColor,
        };
    }




    async init() {
        // await this.loadImage();
    }

    async loadImage() {
        if (this.url) {
            if (!this.imageLoaded || this.imageSrc != this.url) {
                const img = new Image();
                this.image = img;
                this.imageLoaded = new Promise(resolve=>{
                    img.addEventListener('load', resolve);
                    img.addEventListener('error', resolve);
                    img.src = this.url;
                    this.imageSrc = this.url;
                    if (img.complete) {
                        resolve();
                    }
                });
            }
            await this.imageLoaded;
        }
        return this.image;
    }

    async getImage() {
        return await this.loadImage();
    }
}
