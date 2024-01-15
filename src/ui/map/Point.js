export class Point {
    static from(props) {
        const instance = Object.assign(new this(), props);
        return instance;
    }




    /**@type {Number}*/ x;
    /**@type {Number}*/ y;


    toJSON() {
        return {
            x: Math.round(this.x),
            y: Math.round(this.y),
        };
    }




    checkHover(/**@type {Point}*/that) {
        const size = 5;
        return Math.abs(this.x - that.x) <= size && Math.abs(this.y - that.y) <= 5;
    }
}
