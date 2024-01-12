import { Point } from './Point.js';

export class Zone {
    static from(props) {
        const instance = Object.assign(new this(), props);
        instance.polygon = (props.polygon ?? []).map(it=>Point.from(it));
        return instance;
    }




    /**@type {String}*/ label;
    /**@type {String}*/ description;
    /**@type {String}*/ key;
    /**@type {Boolean}*/ overrideZoom = false;
    /**@type {Number}*/ zoom = 10;
    /**@type {Boolean}*/ overrideShadow = false;
    /**@type {Number}*/ shadow = 3;
    /**@type {Boolean}*/ overrideShadowColor = false;
    /**@type {String}*/ shadowColor = 'rgba(0, 0, 0, 1)';
    /**@type {Point[]}*/ polygon;
    /**@type {String}*/ command;
    /**@type {String}*/ qrSet;

    /**@type {HTMLElement}*/ dom;


    toJSON() {
        return {
            label: this.label,
            description: this.description,
            key: this.key,
            polygon: this.polygon,
            command: this.command,
            qrSet: this.qrSet,
            overrideZoom: this.overrideZoom,
            zoom: this.zoom,
            overrideShadow: this.overrideShadow,
            shadow: this.shadow,
            overrideShadowColor: this.overrideShadowColor,
            shadowColor: this.shadowColor,
        };
    }
}
