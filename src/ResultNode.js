// eslint-disable-next-line no-unused-vars
import { Match } from './Match.js';




export class ResultNode {
    /**@type {Node}*/ node;
    /**@type {Match[]}*/ matchList;




    /**
     *
     * @param {Node} node
     * @param {Match[]} matchList
     */
    constructor(node, matchList) {
        this.node = node;
        this.matchList = matchList;
    }
}
