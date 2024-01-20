// eslint-disable-next-line no-unused-vars
import { Zone } from './Zone.js';




export class PaintLayer {
    static from(props) {
        const instance = Object.assign(new this(), props);
        instance.zone = instance.zone ? Zone.from(instance.zone) : null;
        return instance;
    }



    /**@type {Boolean}*/ isZone = false;
    /**@type {Boolean}*/ isLocked = false;
    /**@type {String}*/ paint;
    /**@type {Zone}*/ zone;
}
