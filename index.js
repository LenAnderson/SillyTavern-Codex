import { eventSource, event_types, getRequestHeaders, messageFormatting, substituteParams } from '../../../../script.js';
import { registerSlashCommand } from '../../../slash-commands.js';
import { delay, uuidv4 } from '../../../utils.js';
import { world_info } from '../../../world-info.js';
import { initSettings, settings } from './settings.js';
import { Tooltip } from './src/Tooltip.js';

export const log = (...msg)=>console.log('[STCDX]', ...msg);
export const warn = (...msg)=>console.warn('[STCDX]', ...msg);

export function debounceAsync(func, timeout = 300) {
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
    eventSource.on(event_types.WORLDINFO_SETTINGS_UPDATED, async()=>{
        await delay(500);
        await restartDebounced();
    });
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

    registerSlashCommand('codex', ()=>renderCodex(), [], 'Open codex', true, true);
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
    root?.remove();
    root = null;
    codexContent = null;
    currentCodex = null;
};
const renderCodex = (match)=>{
    if (currentCodex && currentCodex.book == match?.book && currentCodex.entry == match?.entry) {
        unrenderCodex();
    }
    else {
        if (!root) makeRoot();
        if (!match) return;
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
const clearCache = ()=>{
    Object.keys(originals).forEach(key=>delete originals[key]);
};
const restoreMessage = (/**@type {HTMLElement}*/msg) => {
    const oldId = msg.querySelector('.mes_text').getAttribute('data-codex');
    if (oldId && originals[oldId] && originals[oldId].textContent == msg.querySelector('.mes_text').textContent) {
        msg.querySelector('.mes_text').replaceWith(originals[oldId]);
        delete originals[oldId];
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
        const matches = findMatches(node.textContent, found);
        found.push(...matches.map(it=>`${it.book}---${it.entry}`));
        if (matches.length) {
            log('FOUND', { msg, text:node.textContent, matches });
            if (!modified) {
                const id = uuidv4();
                originals[id] = msg.querySelector('.mes_text').cloneNode(true);
                msg.querySelector('.mes_text').setAttribute('data-codex', id);
                modified = true;
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

const findMatches = (text, alreadyFound = [])=>{
    const found = [...alreadyFound];
    const matches = [];
    for (const book of books) {
        for (const entryIdx of Object.keys(book.entries)) {
            const entry = book.entries[entryIdx];
            const keys = entry.key.filter(it=>!settings.requirePrefix || it.startsWith('codex:'));
            for (const key of keys) {
                if (settings.onlyFirst && found.includes(`${book.name}---${entry.uid}`)) break;
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
                while (text.substring(offset).search(re ?? plain) != -1) {
                    if (settings.onlyFirst && found.includes(`${book.name}---${entry.uid}`)) break;
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
                            if (text.search(reKs ?? plainKs) != -1) {
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
                        const match = text.substring(offset).match(re);
                        let idx = offset + match.index;
                        if (match[1]) {
                            idx += match[0].search(match[1]);
                        }
                        start = idx;
                        end = start + (match[1] ?? match[0]).length;
                    } else {
                        start = offset + text.substring(offset).search(re ?? plain);
                        end = start + key.length - (key.startsWith('codex:') ? 6 : 1);
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
                    found.push(`${book.name}---${entry.uid}`);
                }
            }
        }
    }
    return matches;
};

const makeRoot = ()=>{
    root?.remove();
    root = document.createElement('div'); {
        root.classList.add('stcdx--root');
        root.classList.add('draggable');
        const head = document.createElement('div'); {
            head.classList.add('stcdx--header');
            const menu = document.createElement('div'); {
                menu.classList.add('stcdx--menuTrigger');
                menu.textContent = '≡';
                let bookList;
                menu.addEventListener('click', ()=>{
                    if (bookList) {
                        bookList.remove();
                        bookList = null;
                        return;
                    }
                    bookList = document.createElement('ul'); {
                        bookList.classList.add('stcdx--books');
                        books.forEach(book=>{
                            const entries = Object.keys(book.entries).map(key=>book.entries[key]).filter(e=>e.key.find(k=>!settings.requirePrefix || k.startsWith('codex:')));
                            if (entries.length == 0) return;
                            const li = document.createElement('li'); {
                                li.classList.add('stcdx--book');
                                const name = document.createElement('div'); {
                                    name.classList.add('stcdx--name');
                                    name.textContent = book.name;
                                    li.append(name);
                                }
                                const entryList = document.createElement('ul'); {
                                    entryList.classList.add('stcdx--entries');
                                    entries.forEach(entry=>{
                                        const link = document.createElement('li'); {
                                            link.classList.add('stcdx--entry');
                                            link.textContent = entry.comment.length > 50 ? entry.key?.join(' / ') : (entry.comment || entry.key?.join(' / ')) ?? '???';
                                            link.addEventListener('click', (evt)=>{
                                                evt.stopPropagation();
                                                renderCodex({ book:book.name, entry:entry.uid });
                                            });
                                            entryList.append(link);
                                        }
                                    });
                                    li.append(entryList);
                                }
                                bookList.append(li);
                            }
                        });
                        menu.append(bookList);
                    }
                });
                head.append(menu);
            }
            const search = document.createElement('div'); {
                search.classList.add('stcdx--search');
                const inp = document.createElement('input'); {
                    inp.classList.add('text_pole');
                    inp.type = 'search';
                    inp.placeholder = 'search codex';
                    let results;
                    inp.addEventListener('blur', ()=>{
                        results?.remove();
                    });
                    inp.addEventListener('focus', ()=>{
                        if (results) search.append(results);
                    });
                    inp.addEventListener('input', ()=>{
                        const text = inp.value.trim().toLowerCase();
                        if (text.length == 0) {
                            results?.remove();
                            results = null;
                        } else {
                            const matches = [
                                ...findMatches(inp.value),
                                ...books
                                    .map(b=>Object.keys(b.entries).map(k=>({ book:b.name, ...b.entries[k] })))
                                    .flat()
                                    .filter(e=>e.key.find(k=>k.toLowerCase().includes(text)))
                                    .map(e=>({ book:e.book, entry:e.uid }))
                                ,
                            ];
                            if (matches.length > 0) {
                                results = results ?? document.createElement('div'); {
                                    results.innerHTML = '';
                                    results.classList.add('stcdx--results');
                                    matches.forEach(match=>{
                                        const item = document.createElement('div'); {
                                            item.classList.add('stcdx--result');
                                            item.textContent = `${match.book}: ${books.find(it=>it.name == match.book).entries[match.entry].key.join(' / ')}`;
                                            item.addEventListener('mousedown', ()=>renderCodex(match));
                                            results.append(item);
                                        }
                                    });
                                    search.append(results);
                                }
                            }
                        }

                    });
                    search.append(inp);
                }
                head.append(search);
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
    clearCache();
};
