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
    /**@type {Point[]}*/ polygon;

    /**@type {HTMLElement}*/ dom;


    toJSON() {
        return {
            label: this.label,
            description: this.description,
            key: this.key,
            polygon: this.polygon,
        };
    }
}
