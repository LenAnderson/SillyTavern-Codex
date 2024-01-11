import { characters, chat, chat_metadata, eventSource, event_types, getRequestHeaders, messageFormatting, substituteParams } from '../../../../script.js';
import { getContext } from '../../../extensions.js';
import { groups } from '../../../group-chats.js';
import { executeSlashCommands, registerSlashCommand } from '../../../slash-commands.js';
import { delay, isTrueBoolean, uuidv4 } from '../../../utils.js';
import { world_info, world_info_case_sensitive } from '../../../world-info.js';
import { initSettings, settings } from './settings.js';
import { Tooltip } from './src/Tooltip.js';
import { Map } from './src/map/Map.js';

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
/**@type {Object[]} */
const hist = [];
/**@type {Number} */
let histIdx = 0;
/**@type {HTMLElement}*/
let histBack;
/**@type {HTMLElement}*/
let histForward;
/**@type {HTMLElement}*/
let editHead;
/**@type {HTMLElement}*/
let editTrigger;
/**@type {HTMLElement}*/
let editor;
/**@type {Boolean}*/
let isEditing = false;
/**@type {String}*/
let editBook;
/**@type {Object}*/
let editEntry;
/**@type {Boolean}*/
let needsReload = false;
/**@type {Map[]}*/
let mapList = [];

const queueMessage = async(...idxList)=>{
    if (!isReady) return;
    log('queueMessage', idxList);
    queue.push(...idxList);
    await processQueueDebounced();
};
const queueMessageAndCycle = async(...idxList)=>{
    queueMessage(...idxList);
    if (settings.cycle && idxList.length == 1) {
        const idx = idxList[0];
        const msg = document.querySelector(`#chat > .mes[mesid="${idx}"]`);
        const nodes = document.evaluate('.//text()', msg.querySelector('.mes_text'), null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
        const resultNodes = await checkNodes(nodes);
        let matches = resultNodes.map(it=>it.matches.toSorted((a,b)=>a.start - b.start)).flat();
        matches = matches.filter((m,idx)=>idx == matches.findIndex(it=>it.book == m.book && it.entry == m.entry));
        cycle(matches);
    }
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


let isCycling = false;
const cycle = async(matches)=>{
    if (isCycling) return;
    isCycling = true;
    for (const match of matches) {
        await renderCodex(match, true);
        await delay(settings.cycleDelay ?? 1000);
    }
    isCycling = false;
};




const init = async()=>{
    initSettings();

    eventSource.on(event_types.CHAT_CHANGED, ()=>restartDebounced());
    eventSource.on(event_types.WORLDINFO_SETTINGS_UPDATED, async()=>{
        await delay(500);
        await restartDebounced();
    });
    eventSource.on(event_types.WORLDINFO_UPDATED, ()=>restartDebounced());

    eventSource.on(event_types.CHARACTER_EDITED, ()=>restartIfBooksChanged());
    eventSource.on(event_types.SETTINGS_UPDATED, ()=>restartIfBooksChanged());

    eventSource.on(event_types.MESSAGE_EDITED, (idx)=>{
        document.querySelector(`#chat .mes[mesid="${idx}"] .mes_text`).removeAttribute('data-codex');
        queueMessage(idx);
    });
    eventSource.on(event_types.MESSAGE_SWIPED, (idx)=>{
        document.querySelector(`#chat .mes[mesid="${idx}"] .mes_text`).removeAttribute('data-codex');
        queueMessage(idx);
    });
    eventSource.on(event_types.USER_MESSAGE_RENDERED, (idx)=>queueMessageAndCycle(idx));
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (idx)=>queueMessageAndCycle(idx));

    registerSlashCommand('codex', async(args, value)=>{
        if (value && value.length > 0) {
            const matches = findMatches(value);
            if (matches.length > 0) {
                if (matches.length == 1 || isTrueBoolean(args.first)) {
                    await renderCodex(matches[0], true);
                    if (args.zoom !== null) {
                        const zoom = Number(args.zoom);
                        if (!Number.isNaN(zoom)) {
                            const imgs = Array.from(codexContent.querySelectorAll('img'));
                            if (imgs.length > zoom) {
                                imgs[zoom].click();
                            }
                        }
                    }
                } else {
                    await cycle(matches);
                }
            } else {
                if (!isTrueBoolean(args.silent)) toastr.warning(`No codex entries found for: ${value}`);
            }
        } else {
            switch (args.state) {
                case 'show':
                case 'on': {
                    if (!root) renderCodex();
                    break;
                }
                case 'hide':
                case 'off': {
                    if (root) unrenderCodex();
                    break;
                }
                default: {
                    root ? unrenderCodex() : renderCodex();
                    break;
                }
            }
        }
    }, [], '<span class="monospace">[optional state=show|hide] [optional silent=true] [optional zoom=number] (optional text / keys)</span> – Toggle codex. <code>state=show|hide</code> to explicitly show or hide codex. Provide text or keys to open a relevant entry (cycles through entries if multiple are found). <code>silent=true</code> to suppress warnings when no entries are found. <code>first=true</code> to prevent cycling and only show the first matching entry. <code>zoom=0|1|2|...</code> to zoom the n-th image of the opened codex entry (only works if a only single entry was found or first=true is set).', true, true);
};
eventSource.on(event_types.APP_READY, ()=>init());


const getBook = async(name)=>{
    const result = await fetch('/api/worldinfo/get', {
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
const renderCodex = async(match, force = false, noHist = false)=>{
    if (!isReady) return;
    document.body.style.setProperty('--stcdx--discordToggle', window.getComputedStyle(document.body).getPropertyValue('--nav-bar-width') ? 1 : 0);
    if (currentCodex && currentCodex.book == match?.book && currentCodex.entry == match?.entry) {
        if (!force) {
            unrenderCodex();
        }
    }
    else {
        if (!noHist && hist.slice(-1)[0] != match) {
            hist.splice(histIdx + 1, hist.length, match);
            log('HIST', hist);
            histIdx = hist.length - 1;
        }
        if (!root) makeRoot();
        editTrigger.classList.add('stcdx--end');
        histBack.classList[histIdx - 1 >= 0 ? 'remove' : 'add']('stcdx--end');
        histForward.classList[histIdx + 1 < hist.length ? 'remove' : 'add']('stcdx--end');
        if (!match) return;
        editTrigger.classList.remove('stcdx--end');
        const nc = document.createElement('div'); {
            nc.classList.add('stcdx--content');
            nc.classList.add('mes_text');
            nc.append(...await makeCodexDom(match));
            root.append(nc);
        }
        const nodes = document.evaluate('.//text()', nc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
        const resultNodes = await checkNodes(nodes, match);
        if (resultNodes.length > 0) {
            await updateNodes(resultNodes);
        }
        await delay(10);
        await Promise.all(
            Array.from(nc.querySelectorAll('img'))
                .map(img=>new Promise(resolve=>{
                    if (img.complete) resolve();
                    img.addEventListener('load', resolve);
                    img.addEventListener('error', resolve);
                })),
        );
        codexContent.classList.remove('stcdx--active');
        nc.classList.add('stcdx--active');
        await delay(500);
        codexContent.remove();
        codexContent = nc;
        const entry = books.find(b=>b.name == match.book)?.entries?.[match.entry];
        editHead.textContent = `${match.book}: (${entry.uid}) ${entry.comment ?? entry.key.join(', ')}`;
        editor.value = entry?.content;
        editBook = match.book;
        editEntry = entry;
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
export const rerenderCodex = ()=>{
    if (currentCodex) {
        const match = currentCodex;
        currentCodex = null;
        renderCodex(match);
    }
};
export const subParams = (text)=>{
    return substituteParams(text).replace(
        /\{\{wi::(?:((?:(?!(?:::)).)+)::)?((?:(?!(?:::)).)+)\}\}/g,
        (all, book, key)=>{
            log('ARGS', { book, key });
            const matches = findMatches(key).filter(it=>book === undefined || it.book.toLowerCase() == book.toLowerCase());
            if (matches.length > 0) {
                return subParams(matches[0].content);
            }
            return all;
        },
    );
};
export const getTitle = (entry)=>{
    const titleKey = entry.key.find(it=>it.startsWith('codex-title:'))?.substring(12);
    if (titleKey) {
        if (/^key\[\d+\]$/i.test(titleKey)) {
            return entry.key[titleKey.replace(/^key\[(\d+)\]$/i, '$1')];
        }
        return entry[titleKey];
    }
    return entry.comment.length > 50 ? entry.key?.join(' / ') : (entry.comment || entry.key?.join(' / ')) ?? '???';
};
export const getEntry = (match)=>{
    return books.find(it=>it.name == match.book)?.entries?.[match.entry];
};
export const makeCodexMapDom = async (book, entry)=>{
    const data = JSON.parse(entry.content || '{}');
    const map = Map.from(data, book, entry);
    mapList.push(map);
    return [await map.render()];
};
export const makeCodexDom = async (match)=>{
    const entry = books.find(b=>b.name == match.book)?.entries?.[match.entry];
    if (entry.key.find(it=>it.startsWith('codex-map:'))) {
        return await makeCodexMapDom(match.book, entry);
    }
    let messageText = subParams(entry?.content ?? '');
    let template = settings.templateList?.find(tpl=>tpl.name == entry?.key?.find(it=>it.startsWith('codex-tpl:'))?.substring(10))?.template ?? settings.template;
    messageText = template
        .replace(/\{\{comment\}\}/g, entry?.comment)
        .replace(/\{\{comment::url\}\}/g, encodeURIComponent(entry?.comment))
        .replace(/\{\{content\}\}/g, messageText)
        .replace(/\{\{content::url\}\}/g, encodeURIComponent(messageText))
        .replace(/\{\{key\[(\d+)\]\}\}/g, (_,idx)=>entry?.key?.[idx]?.replace(/^codex:/, ''))
        .replace(/\{\{key\[(\d+)\]::url\}\}/g, (_,idx)=>encodeURIComponent(entry?.key?.[idx]?.replace(/^codex:/, '')))
        .replace(/\{\{title\}\}/g, ()=>getTitle(entry))
        .replace(/\{\{title::url\}\}/g, ()=>encodeURIComponent(getTitle(entry)))
    ;
    messageText = messageFormatting(
        messageText,
        'Codex',
        false,
        false,
    );
    const dom = document.createElement('div');
    dom.innerHTML = messageText;
    return Array.from(dom.children);
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
    if (msg.querySelector('[data-codex]')) {
        let messageText = substituteParams(chat[Number(msg.getAttribute('mesid'))].mes);
        messageText = messageFormatting(
            messageText,
            'Codex',
            false,
            false,
        );
        msg.querySelector('.mes_text').innerHTML = messageText;
    }
};
const updateMessage = async(/**@type {HTMLElement}*/msg)=>{
    log('updateMessage', msg);
    restoreMessage(msg);
    const nodes = document.evaluate('.//text()', msg.querySelector('.mes_text'), null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    const resultNodes = await checkNodes(nodes);
    if (resultNodes.length > 0) {
        await updateNodes(resultNodes);
        const fingerprint = document.createElement('span'); {
            fingerprint.setAttribute('data-codex', uuidv4());
            msg.querySelector('.mes_text').append(fingerprint);
        }
    }
};
const checkNodes = async(nodes, skipMatch = null)=>{
    const resultNodes = [];
    const found = [];
    for (let i = 0; i < nodes.snapshotLength; i++) {
        const node = nodes.snapshotItem(i);
        const matches = findMatches(node.textContent, true, found, skipMatch);
        found.push(...matches.map(it=>`${it.book}---${it.entry}`));
        if (matches.length) {
            resultNodes.push({ node, matches });
        }
    }
    return resultNodes;
};
const updateNodes = async(nodes)=>{
    for (const { node, matches } of nodes) {
        const parent = node.parentElement;
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
                    el.addEventListener('click', async()=>{
                        tt.isFrozen = true;
                        el.style.pointerEvents = 'none';
                        await renderCodex(match);
                        el.style.pointerEvents = '';
                        tt?.hide(true);
                        tt.isFrozen = false;
                    });
                    let tt;
                    if (!settings.noTooltips) {
                        tt = Tooltip.create(el, match, settings.fixedTooltips);
                    }
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
};

export const findMatches = (text, includeMaps = true, alreadyFound = [], skipMatch = null)=>{
    const found = [...alreadyFound];
    const matches = [];
    for (const book of books) {
        for (const entryIdx of Object.keys(book.entries)) {
            const entry = book.entries[entryIdx];
            if (entry.key.includes('codex-skip:')) continue;
            if (!includeMaps && entry.key.includes('codex-map:')) continue;
            if (book.name == skipMatch?.book && entry.uid == skipMatch?.entry) continue;
            const keys = entry.key.filter(it=>!settings.requirePrefix || it.startsWith('codex:'));
            for (const key of keys) {
                if (settings.onlyFirst && found.includes(`${book.name}---${entry.uid}`)) break;
                let searchKey = key.substring(settings.requirePrefix || key.startsWith('codex:') ? 6 : 0);
                let re;
                let plain;
                let searchText = text;
                if (searchKey.match(/^\/.+\/[a-z]*$/)) {
                    try {
                        re = new RegExp(searchKey.replace(/^\/(.+)\/([a-z]*)$/, '$1'), searchKey.replace(/^\/(.+)\/([a-z]*)$/, '$2'));
                    } catch (ex) {
                        warn(ex.message, ex);
                    }
                } else {
                    plain = searchKey;
                    if (!world_info_case_sensitive) {
                        plain = plain.toLowerCase();
                        searchText = searchText.toLowerCase();
                    }
                }
                let offset = 0;
                while (searchText.substring(offset).search(re ?? plain) != -1) {
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
                            if (searchText.search(reKs ?? plainKs) != -1) {
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
                        const match = searchText.substring(offset).match(re);
                        let idx = offset + match.index;
                        if (match[1]) {
                            idx += match[0].search(match[1]);
                        }
                        start = idx;
                        end = start + (match[1] ?? match[0]).length;
                    } else {
                        start = offset + searchText.substring(offset).search(re ?? plain);
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
                    found.push(`${book.name}---${entry.uid}`);
                }
            }
        }
    }
    return matches;
};

const makeRoot = ()=>{
    isEditing = false;
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
                        books.toSorted((a,b)=>a.name.localeCompare(b.name)).forEach(book=>{
                            const entries = Object.keys(book.entries)
                                .map(key=>book.entries[key])
                                .filter(e=>e.key.find(k=>!settings.requirePrefix || k.startsWith('codex:')))
                                .filter(e=>!e.key.includes('codex-skip:'))
                                .map(entry=>({ ...entry, title:entry.comment.length > 50 ? entry.key?.join(' / ') : (entry.comment || entry.key?.join(' / ')) ?? '???' }))
                                .toSorted((a,b)=>a.title.localeCompare(b.title))
                            ;
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
                                            link.textContent = entry.title;
                                            link.addEventListener('click', (evt)=>{
                                                evt.stopPropagation();
                                                renderCodex({ book:book.name, entry:entry.uid }, true);
                                                bookList.remove();
                                                bookList = null;
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
            const back = document.createElement('div'); {
                histBack = back;
                back.classList.add('stcdx--back');
                back.textContent = '↩';
                back.addEventListener('click', (evt)=>{
                    evt.preventDefault();
                    if (histIdx - 1 < 0) return;
                    histIdx--;
                    renderCodex(hist[histIdx], true, true);
                });
                head.append(back);
            }
            const forward = document.createElement('div'); {
                histForward = forward;
                forward.classList.add('stcdx--forward');
                forward.textContent = '↪';
                forward.addEventListener('click', (evt)=>{
                    evt.preventDefault();
                    if (histIdx + 1 >= hist.length) return;
                    histIdx++;
                    renderCodex(hist[histIdx], true, true);
                });
                head.append(forward);
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
                            let matches = [
                                ...findMatches(inp.value),
                                ...books
                                    .map(b=>Object.keys(b.entries).map(k=>({ book:b.name, ...b.entries[k] })))
                                    .flat()
                                    .filter(e=>!e.key.includes('codex-skip:') && e.key.find(k=>k.toLowerCase().includes(text)))
                                    .map(e=>({ book:e.book, entry:e.uid }))
                                ,
                            ]
                                .map(match=>({ ...match, title: `${match.book}: ${books.find(it=>it.name == match.book).entries[match.entry].key.filter(it=>!/^codex-[a-z]+:.*$/i.test(it)).map(it=>it.substring(it.startsWith('codex:') ? 6 : 0)).join(' / ')}` }))
                                .toSorted((a,b)=>a.title.localeCompare(b.title))
                            ;
                            if (matches.length > 0) {
                                matches = matches.filter((m1,idx)=>idx == matches.findIndex(m2=>m1.book == m2.book && m1.entry == m2.entry));
                                results = results ?? document.createElement('div'); {
                                    results.innerHTML = '';
                                    results.classList.add('stcdx--results');
                                    matches.forEach(match=>{
                                        const item = document.createElement('div'); {
                                            item.classList.add('stcdx--result');
                                            item.textContent = match.title;
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
            editHead = document.createElement('div'); {
                editHead.classList.add('stcdx--editHead');
                head.append(editHead);
            }
            editTrigger = document.createElement('div'); {
                editTrigger.classList.add('stcdx--editTrigger');
                editTrigger.classList.add('stcdx--end');
                editTrigger.textContent = '✎';
                editTrigger.title = 'Edit entry';
                editTrigger.addEventListener('click', async(evt)=>{
                    evt.preventDefault();
                    if (!currentCodex) return;
                    if (mapList.length > 0) {
                        isEditing = true;
                        await mapList.slice(-1)[0].showEditor();
                        isEditing = false;
                    } else {
                        root.classList.toggle('stcdx--editing');
                        isEditing = !isEditing;
                    }
                    if (!isEditing && needsReload) {
                        needsReload = false;
                        const match = { ...currentCodex };
                        await restart();
                        await renderCodex(match);
                    }
                });
                head.append(editTrigger);
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
        editor = document.createElement('textarea'); {
            editor.classList.add('stcdx--editor');
            editor.classList.add('text_pole');
            editor.addEventListener('input', async()=>{
                saveWorldDebounced();
            });
            root.append(editor);
        }
        codexContent = document.createElement('div'); {
            codexContent.classList.add('stcdx--content');
            codexContent.classList.add('mes_text');
            root.append(codexContent);
        }
        document.body.append(root);
    }
};
const saveWorldDebounced = debounceAsync(async()=>{
    if (!isEditing) return;
    editEntry.content = editor.value;
    const result = await fetch('/api/worldinfo/get', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ name:editBook }),
    });
    if (result.ok) {
        const data = await result.json();
        data.entries[editEntry.uid].content = editEntry.content;
        log('UPDATE', editEntry.content.replace(/([{}|])/g, '\\\\$1'));
        await executeSlashCommands(`/setentryfield file="${editBook}" uid=${editEntry.uid} field=content ${editEntry.content.replace(/([{}|])/g, '\\$1')}`);
    }
});

const getBookNames = ()=>{
    const context = getContext();
    let names = [
        ...(world_info.globalSelect ?? []),
        ...(world_info.charLore?.map(it=>it.extraBooks)?.flat() ?? []),
        chat_metadata.world_info,
        characters[context.characterId]?.data?.character_book?.name,
        ...(groups.find(it=>it.id == context.groupId)?.members?.map(m=>characters.find(it=>it.avatar == m)?.data?.character_book?.name) ?? []),
    ].filter(it=>it);
    names = names.filter((it,idx)=>names.indexOf(it) == idx);
    return names;
};
const loadBooks = async()=>{
    log('loadBooks');
    toastr.info('Codex: load books');
    while (books.length) books.pop();
    let names = getBookNames();
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
    if (isEditing || mapList.find(it=>it.isEditing)) {
        needsReload = true;
        return;
    }
    restarting = true;
    await end();
    await delay(500);
    await start();
    restarting = false;
};
const restartIfBooksChanged = async ()=>{
    if (!isReady) return;
    const names = getBookNames();
    for (const name of names) {
        if (!books.find(it=>it.name == name)) {
            return await restartDebounced();
        }
    }
    for (const name of books.map(it=>it.name)) {
        if (!names.includes(name)) {
            return await restartDebounced();
        }
    }
};
export const restartDebounced = debounceAsync(async()=>await restart());
const start = async()=>{
    if (!settings.isEnabled || !getContext().chatId) return;
    document.body.style.setProperty('--stcdx--color', `${settings.color}`);
    document.body.style.setProperty('--stcdx--icon', `"${settings.icon}"`);
    await loadBooks();
    isReady = true;
    await updateChat();
};
const end = async()=>{
    isReady = false;
    root?.remove();
    root = null;
    codexContent = null;
    currentCodex = null;
    const msgList = Array.from(document.querySelectorAll('#chat > .mes'));
    for (const msg of msgList) {
        restoreMessage(msg);
    }
    while (hist.length > 0) hist.pop();
    while (mapList.length > 0) mapList.pop();
    Tooltip.clear();
    clearCache();
};
