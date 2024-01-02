import { eventSource, event_types, getRequestHeaders, messageFormatting, substituteParams } from '../../../../script.js';
import { registerSlashCommand } from '../../../slash-commands.js';
import { delay, uuidv4 } from '../../../utils.js';
import { world_info } from '../../../world-info.js';
import { initSettings, settings } from './settings.js';
import { Tooltip } from './src/Tooltip.js';

const log = (...msg)=>console.log('[STCDX]', ...msg);
const warn = (...msg)=>console.warn('[STCDX]', ...msg);

function debounceAsync(func, timeout = 300) {
    let timer;
    /**@type {Promise}*/
    let debouncePromise;
    /**@type {Function}*/
    let debounceResolver;
    return async(...args) => {
        clearTimeout(timer);
        if (!debouncePromise) {
            debouncePromise = new Promise(resolve => {
                debounceResolver = resolve;
            });
        }
        timer = setTimeout(() => {
            debounceResolver(func.apply(this, args));
            debouncePromise = null;
        }, timeout);
        return debouncePromise;
    };
}




/**@type {Map<String, HTMLElement[]>}*/
const originals = {};
const books = [];
/**@type {HTMLElement}*/
let root;
/**@type {HTMLElement}*/
let codexContent;
/**@type {Number[]}*/
const queue = [];

const queueMessage = async(...idxList)=>{
    if (!isReady) return;
    log('queueMessage', idxList);
    queue.push(...idxList);
    await processQueueDebounced();
};

const processQueue = async()=>{
    if (queue.length == 0) return;
    log('processQueue', queue);
    const done = [];
    while (queue.length > 0) {
        const idx = queue.shift();
        if (done.includes(idx)) continue;
        await updateMessageIdx(idx);
        done.push(idx);
    }
};
const processQueueDebounced = debounceAsync(async()=>await processQueue());




const init = async()=>{
    initSettings();

    eventSource.on(event_types.CHAT_CHANGED, ()=>restartDebounced());
    eventSource.on(event_types.WORLDINFO_SETTINGS_UPDATED, ()=>restartDebounced());
    eventSource.on(event_types.WORLDINFO_UPDATED, ()=>restartDebounced());

    eventSource.on(event_types.MESSAGE_EDITED, (idx)=>{
        document.querySelector(`#chat .mes[mesid="${idx}"] .mes_text`).removeAttribute('data-codex');
        queueMessage(idx);
    });
    eventSource.on(event_types.MESSAGE_SWIPED, (idx)=>{
        document.querySelector(`#chat .mes[mesid="${idx}"] .mes_text`).removeAttribute('data-codex');
        queueMessage(idx);
    });
    eventSource.on(event_types.USER_MESSAGE_RENDERED, (idx)=>queueMessage(idx));
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (idx)=>queueMessage(idx));
};
eventSource.on(event_types.APP_READY, ()=>init());


const getBook = async(name)=>{
    const result = await fetch('/getworldinfo', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ name }),
    });
    if (result.ok) {
        return await result.json();
    }
    return null;
};


let currentCodex;
const unrenderCodex = ()=>{
    root.remove();
    root = null;
    codexContent = null;
    currentCodex = null;
};
const renderCodex = (match)=>{
    if (currentCodex && currentCodex.book == match.book && currentCodex.entry == match.entry) {
        unrenderCodex();
    }
    else {
        if (!root) makeRoot();
        codexContent.innerHTML = makeCodexDom(match);
        Array.from(codexContent.querySelectorAll('img')).forEach(img=>{
            img.addEventListener('click', async()=>{
                const rect = img.getBoundingClientRect();
                let clone;
                const blocker = document.createElement('div'); {
                    blocker.classList.add('stcdx--blocker');
                    blocker.addEventListener('click', async()=>{
                        const rect = img.getBoundingClientRect();
                        blocker.classList.remove('stcdx--active');
                        clone.style.top = `${rect.top}px`;
                        clone.style.left = `${rect.left}px`;
                        clone.style.width = `${rect.width}px`;
                        clone.style.height = `${rect.height}px`;
                        await delay(550);
                        blocker.remove();
                    });
                    clone = document.createElement('img'); {
                        clone.classList.add('stcdx--clone');
                        clone.src = img.src;
                        clone.style.top = `${rect.top}px`;
                        clone.style.left = `${rect.left}px`;
                        clone.style.width = `${rect.width}px`;
                        clone.style.height = `${rect.height}px`;
                        blocker.append(clone);
                    }
                    document.body.append(blocker);
                }
                await delay(50);
                blocker.classList.add('stcdx--active');
                clone.style.top = '0';
                clone.style.left = '0';
                clone.style.width = '100vw';
                clone.style.height = '100vh';
            });
        });
        currentCodex = match;
    }
};
export const makeCodexDom = (match)=>{
    let messageText = substituteParams(books.find(b=>b.name == match.book)?.entries?.[match.entry]?.content ?? '');
    messageText = messageFormatting(
        messageText,
        'Codex',
        false,
        false,
    );
    return messageText;
};




const updateChat = async()=>{
    log('updateChat');
    const msgList = Array.from(document.querySelectorAll('#chat > .mes'));
    await queueMessage(...msgList.map(msg=>msg.getAttribute('mesid')));
};
const updateMessageIdx = async(idx)=>{
    await updateMessage(document.querySelector(`#chat > .mes[mesid="${idx}"]`));
};
const restoreMessage = (/**@type {HTMLElement}*/msg) => {
    const oldId = msg.querySelector('.mes_text').getAttribute('data-codex');
    if (oldId && originals[oldId] && originals[oldId].textContent == msg.querySelector('.mes_text').textContent) {
        msg.querySelector('.mes_text').replaceWith(originals[oldId]);
        originals[oldId] = undefined;
        msg.querySelector('.mes_text').removeAttribute('data-codex');
    }
};
const updateMessage = async(/**@type {HTMLElement}*/msg)=>{
    log('updateMessage', msg);
    restoreMessage(msg);
    const nodes = document.evaluate('.//text()', msg.querySelector('.mes_text'), null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    let modified = false;
    const found = [];
    for (let i = 0; i < nodes.snapshotLength; i++) {
        const node = nodes.snapshotItem(i);
        const parent = node.parentElement;
        const matches = [];
        for (const book of books) {
            for (const entryIdx of Object.keys(book.entries)) {
                const entry = book.entries[entryIdx];
                const keys = entry.key.filter(it=>!settings.requirePrefix || it.startsWith('codex:'));
                for (const key of keys) {
                    if (settings.onlyFirst && found.includes(entry.uid)) break;
                    let searchKey = key.substring(settings.requirePrefix || key.startsWith('codex:') ? 6 : 0);
                    let re;
                    let plain;
                    if (searchKey.match(/^\/.+\/[a-z]*$/)) {
                        try {
                            re = new RegExp(searchKey.replace(/^\/(.+)\/([a-z]*)$/, '$1'), searchKey.replace(/^\/(.+)\/([a-z]*)$/, '$2'));
                        } catch (ex) {
                            warn(ex.message, ex);
                        }
                    } else {
                        plain = searchKey;
                    }
                    let offset = 0;
                    while (node.textContent.substring(offset).search(re ?? plain) != -1) {
                        if (settings.onlyFirst && found.includes(entry.uid)) break;
                        // secondary keys
                        const ksList = entry.keysecondary;
                        if (ksList.length > 0) {
                            let any = false;
                            let all = true;
                            for (const ks of ksList) {
                                const searchKs = ks;
                                let reKs;
                                let plainKs;
                                if (searchKs.match(/^\/.+\/[a-z]*$/)) {
                                    try {
                                        re = new RegExp(searchKs.replace(/^\/(.+)\/([a-z]*)$/, '$1'), searchKs.replace(/^\/(.+)\/([a-z]*)$/, '$2'));
                                    } catch (ex) {
                                        warn(ex.message, ex);
                                    }
                                } else {
                                    plainKs = searchKs;
                                }
                                if (node.textContent.search(reKs ?? plainKs) != -1) {
                                    any = true;
                                } else {
                                    all = false;
                                }
                            }
                            // const world_info_logic = {
                            //     AND_ANY: 0,
                            //     NOT_ALL: 1,
                            //     NOT_ANY: 2,
                            // };
                            switch (entry.selectiveLogic) {
                                case 0: {
                                    if (!any) continue;
                                    break;
                                }
                                case 1: {
                                    if (all) continue;
                                    break;
                                }
                                case 2: {
                                    if (any) continue;
                                    break;
                                }
                            }
                        }
                        // /secondary keys
                        let start;
                        let end;
                        if (re) {
                            const match = node.textContent.substring(offset).match(re);
                            let idx = offset + match.index;
                            if (match[1]) {
                                idx += match[0].search(match[1]);
                            }
                            start = idx;
                            end = start + (match[1] ?? match[0]).length;
                        } else {
                            start = offset + node.textContent.substring(offset).search(re ?? plain);
                            end = start + key.length - (key.startsWith('codex:') ? 6 : 0);
                        }
                        matches.push({
                            start,
                            end,
                            key: key.substring(settings.requirePrefix || key.startsWith('codex:') ? 6 : 0),
                            content: entry.content,
                            book: book.name,
                            entry: entry.uid,
                        });
                        offset += end;
                        found.push(entry.uid);
                    }
                }
            }
        }
        if (matches.length) {
            log('FOUND', { msg, text:node.textContent, matches });
            if (!modified) {
                const id = uuidv4();
                msg.querySelector('.mes_text').setAttribute('data-codex', id);
                originals[id] = msg.querySelector('.mes_text').cloneNode(true);
            }
            modified = true;
            matches.sort((a,b)=>a.start - b.start);
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
                        el.addEventListener('click', ()=>renderCodex(match));
                        const tt = new Tooltip(el, match);
                        els.push(el);
                    }
                    idx = match.end;
                }
            }
            if (idx + 1 < node.textContent.length) {
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
};

const makeRoot = ()=>{
    root?.remove();
    root = document.createElement('div'); {
        root.classList.add('stcdx--root');
        root.classList.add('draggable');
        const head = document.createElement('div'); {
            head.classList.add('stcdx--header');
            const title = document.createElement('div'); {
                title.classList.add('stcdx--title');
                title.textContent = 'Codex';
                head.append(title);
            }
            const controls = document.createElement('div'); {
                controls.classList.add('stcdx--controls');
                controls.classList.add('panelControlBar');
                controls.classList.add('flex-container');
                const drag = document.createElement('div'); {
                    drag.id = 'stcdx--popoutheader';
                    drag.classList.add('fa-solid');
                    drag.classList.add('fa-grip');
                    drag.classList.add('drag-grabber');
                    drag.classList.add('hoverglow');
                    controls.append(drag);
                }
                const close = document.createElement('div'); {
                    close.classList.add('stcdx--close');
                    close.classList.add('fa-solid');
                    close.classList.add('fa-circle-xmark');
                    close.classList.add('hoverglow');
                    close.addEventListener('click', ()=>unrenderCodex());
                    controls.append(close);
                }
                head.append(controls);
            }
            root.append(head);
        }
        codexContent = document.createElement('div'); {
            codexContent.classList.add('stcdx--content');
            codexContent.classList.add('mes_text');
            root.append(codexContent);
        }
        document.body.append(root);
    }
};

const loadBooks = async()=>{
    log('loadBooks');
    while (books.length) books.pop();
    const names = [...(world_info.globalSelect ?? []), ...(world_info.charLore ?? [])];
    for (const name of names) {
        const book = await getBook(name);
        if (book) {
            book.name = name;
            books.push(book);
        }
    }
    log('BOOKS:', books);
};




let restarting = false;
let isReady = false;
const restart = async()=>{
    if (restarting) return;
    restarting = true;
    await end();
    await delay(500);
    await start();
    restarting = false;
};
export const restartDebounced = debounceAsync(async()=>await restart());
const start = async()=>{
    if (!settings.isEnabled) return;
    document.querySelector('#chat').style.setProperty('--stcdx--color', `${settings.color}`);
    document.querySelector('#chat').style.setProperty('--stcdx--icon', `"${settings.icon}"`);
    await loadBooks();
    isReady = true;
    await updateChat();
};
const end = async()=>{
    isReady = false;
    root?.remove();
    root = null;
    codexContent = null;
    const msgList = Array.from(document.querySelectorAll('#chat > .mes'));
    for (const msg of msgList) {
        restoreMessage(msg);
    }
};
