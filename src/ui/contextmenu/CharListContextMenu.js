import { QuickReply } from '../../../../../quick-reply/src/QuickReply.js';
import { QuickReplySet } from '../../../../../quick-reply/src/QuickReplySet.js';
import { ContextMenu as QrContextMenu } from '../../../../../quick-reply/src/ui/ctx/ContextMenu.js';
import { MenuHeader } from '../../../../../quick-reply/src/ui/ctx/MenuHeader.js';
import { MenuItem } from '../../../../../quick-reply/src/ui/ctx/MenuItem.js';
import { Character } from '../../st/Character.js';




export class CharListContextMenu extends QrContextMenu {
    /**@type {Character}*/ character;




    /**
     *
     * @param {QuickReply} qr
     * @param {Character} character
     */
    constructor(qr, character) {
        super(qr);
        this.character = character;
        this.itemList = this.build(qr).children;
        this.itemList.forEach(item => {
            item.onExpand = () => {
                this.itemList.filter(it => it != item)
                    .forEach(it => it.collapse());
            };
        });
    }

    /**
     * @param {QuickReply} qr
     * @param {String} chainedMessage
     * @param {QuickReplySet[]} hierarchy
     * @param {String[]} labelHierarchy
     */
    build(qr, chainedMessage = null, hierarchy = [], labelHierarchy = []) {
        const tree = {
            label: qr.label,
            message: (chainedMessage && qr.message ? `${chainedMessage} | ` : '') + qr.message,
            children: [],
        };
        qr.contextList.forEach((cl) => {
            if (!hierarchy.includes(cl.set)) {
                const nextHierarchy = [...hierarchy, cl.set];
                const nextLabelHierarchy = [...labelHierarchy, tree.label];
                tree.children.push(new MenuHeader(cl.set.name));
                cl.set.qrList.forEach(subQr => {
                    const subTree = this.build(subQr, cl.isChained ? tree.message : null, nextHierarchy, nextLabelHierarchy);
                    tree.children.push(new MenuItem(
                        subTree.label,
                        subTree.message,
                        (evt) => {
                            evt.stopPropagation();
                            const finalQr = Object.assign(new QuickReply(), subQr);
                            finalQr.message = subTree.message
                                .replace(/%%parent(-\d+)?%%/g, (_, index) => {
                                    return nextLabelHierarchy.slice(parseInt(index ?? '-1'))[0];
                                })
                                .replace(/{{arg::avatar}}/g, this.character?.avatar)
                                .replace(/{{arg::name}}/g, this.character?.name)
                                .replace(/{{arg::description}}/g, this.character?.description)
                                .replace(/{{arg::personality}}/g, this.character?.personality)
                            ;
                            cl.set.execute(finalQr);
                        },
                        subTree.children,
                    ));
                });
            }
        });
        return tree;
    }
}
