export class MenuItem {
    /**@type {String}*/ label;
    /**@type {Function}*/ callback;

    /**@type {HTMLElement}*/ root;




    constructor(/**@type{String}*/label, /**@type {Function}*/callback) {
        this.label = label;
        this.callback = callback;
    }



    render() {
        if (!this.root) {
            const item = document.createElement('li'); {
                this.root = item;
                item.classList.add('list-group-item');
                item.classList.add('stcdx--ctx-item');
                if (this.callback) {
                    item.addEventListener('click', (evt) => this.callback(evt, this));
                }
                item.textContent = this.label;
            }
        }
        return this.root;
    }
}
