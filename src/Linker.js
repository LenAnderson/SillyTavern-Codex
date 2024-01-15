import { chat, messageFormatting, substituteParams } from '../../../../../script.js';
import { uuidv4 } from '../../../../utils.js';

import { Matcher } from './Matcher.js';
import { ResultNode } from './ResultNode.js';
import { Settings } from './Settings.js';
import { log } from './lib/log.js';




export class Linker {
    /**@type {Settings}*/ settings;
    /**@type {Matcher}*/ matcher;

    /**@type {Function}*/ onShowCodex;




    /**
     *
     * @param {Settings} settings
     * @param {Matcher} matcher
     * @param {Function} onShowCodex
     */
    constructor(settings, matcher, onShowCodex) {
        this.settings = settings;
        this.matcher = matcher;
        this.onShowCodex = onShowCodex;
    }




    /**
     *
     * @param {HTMLElement} el
     */
    addCodexLinks(el, skipEntries = []) {
        log('ADD CODEX LINKS', el.textContent);
        const nodes = document.evaluate('.//text()', el, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
        const resultNodes = this.matcher.checkNodes(nodes, skipEntries);
        if (resultNodes.length > 0) {
            this.updateNodes(resultNodes);
            const fingerprint = document.createElement('span'); {
                fingerprint.setAttribute('data-codex', uuidv4());
                el.append(fingerprint);
            }
        }
        log('/ADD CODEX LINKS');
    }


    /**
     *
     * @param {ResultNode[]} resultNodes
     */
    updateNodes(resultNodes) {
        for (const resultNode of resultNodes) {
            const node = resultNode.node;
            const parent = node.parentElement;
            const matches = resultNode.matchList.toSorted((a,b)=>a.start - b.start);
            const els = [];
            let idx = 0;
            for (const match of matches) {
                if (match.start > idx) {
                    const el = document.createElement('span'); {
                        el.textContent = node.textContent.substring(idx, match.start);
                        els.push(el);
                    }
                }
                if (match.start >= idx) {
                    const el = document.createElement('span'); {
                        el.classList.add('stcdx--link');
                        el.textContent = node.textContent.substring(match.start, match.end);
                        el.addEventListener('click', ()=>{
                            if (this.onShowCodex) {
                                this.onShowCodex(match);
                            }
                        });
                        //TODO codex link tooltip
                        els.push(el);
                    }
                    idx = match.end;
                }
            }
            if (idx < node.textContent.length) {
                const el = document.createElement('span'); {
                    el.textContent = node.textContent.substring(idx);
                    els.push(el);
                }
            }
            const anchor = document.createElement('span');
            let prev = anchor;
            parent.replaceChild(anchor, node);
            for (const el of els) {
                prev.insertAdjacentElement('afterend', el);
                prev = el;
            }
            anchor.remove();
        }
    }


    /**
     *
     * @param {HTMLElement} el
     */
    restoreChatMessage(el) {
        if (el.querySelector('[data-codex]')) {
            let messageText = substituteParams(chat[el.closest('.mes').getAttribute('mesid')].mes);
            el.innerHTML = messageFormatting(
                messageText,
                'Codex',
                false,
                false,
            );
        }
    }
}
