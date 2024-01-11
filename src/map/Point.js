export class Point {
    static from(props) {
        const instance = Object.assign(new this(), props);
        return instance;
    }




    /**@type {Number}*/ x;
    /**@type {Number}*/ y;


    toJSON() {
        return {
            x: this.x,
            y: this.y,
        };
    }
}
