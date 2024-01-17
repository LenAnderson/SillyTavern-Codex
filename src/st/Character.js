export class Character {
    static from(props) {
        const instance = Object.assign(new this(), props);
        return instance;
    }




    /**@type {String}*/ avatar;
    /**@type {String}*/ name;
    /**@type {String}*/ description;
    /**@type {String}*/ personality;
}
