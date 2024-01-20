// eslint-disable-next-line no-unused-vars
import { Point } from './Point.js';




export class Line {
    /**@type {Point}*/ a;
    /**@type {Point}*/ b;




    constructor(a, b) {
        this.a = a;
        this.b = b;
    }


    toReversed() {
        return new Line(this.b, this.a);
    }
}
