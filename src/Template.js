export class Template {
    static from(props) {
        const instance = Object.assign(new this(), props);
        instance.content = props.content ?? props.template;
        return instance;
    }




    /**@type {String}*/ name;
    /**@type {String}*/ content;
}
