import { sendSystemMessage } from '../../../../../script.js';
import { getSlashCommandsHelp, registerSlashCommand } from '../../../../slash-commands.js';
import { delay, isTrueBoolean } from '../../../../utils.js';
// eslint-disable-next-line no-unused-vars
import { CodexManager } from './CodexManager.js';
import { warn } from './lib/log.js';
import { waitForFrame } from './lib/wait.js';
import { CodexMap } from './ui/CodexMap.js';




export class SlashCommandHandler {
    /**@type {CodexManager}*/ manager;

    get matcher() { return this.manager.matcher; }




    constructor(manager) {
        this.manager = manager;

        registerSlashCommand(
            'codex',
            (args, value)=>this.handleCodex(args, value),
            [],
            '<span class="monospace">[optional state=show|hide] [optional silent=true] [optional zoom=number] (optional text / keys)</span> – Toggle codex. <code>state=show|hide</code> to explicitly show or hide codex. Provide text or keys to open a relevant entry (cycles through entries if multiple are found). <code>silent=true</code> to suppress warnings when no entries are found. <code>first=true</code> to prevent cycling and only show the first matching entry. <code>zoom=0|1|2|...</code> to zoom the n-th image of the opened codex entry (only works if a only single entry was found or first=true is set).',
            true,
            true,
        );

        registerSlashCommand(
            'codex-map',
            (args, value)=>this.handleCodexMap(args, value),
            [],
            '<span class="monospace">(text / keys)</span> – open a map in full screen',
            true,
            true,
        );

        registerSlashCommand(
            'codex-edit',
            (args, value)=>this.handleCodexEdit(args, value),
            [],
            '<span class="monospace">(text / keys)</span> – open an entry editor',
            true,
            true,
        );

        registerSlashCommand(
            'codex-paint',
            (args, value)=>this.handleCodexPaint(args, value),
            [],
            '<span class="monospace">(text / keys)</span> – open a map editor painter',
            true,
            true,
        );


        registerSlashCommand(
            'codex?',
            ()=>this.showHelp(),
            [],
            '<span></span><span></span> – get help on how to use the Codex extension',
            true,
            true,
        );
        window.addEventListener('click', async(evt)=>{
            if (evt.target.hasAttribute && evt.target.hasAttribute('data-stcdx--href')) {
                const mes = evt.target.closest('.mes_text');
                const target = mes.querySelector(`#stcdx--help--${evt.target.getAttribute('data-stcdx--href')}`);
                if (target) {
                    target.scrollIntoView();
                    target.classList.add('stcdx--flash');
                    await delay(510);
                    target.classList.remove('stcdx--flash');
                }
            }
        });
    }




    async handleCodex(args, value) {
        if (value && value.length > 0) {
            const matches = this.matcher.findMatches(value);
            if (matches.length > 0) {
                if (matches.length == 1 || isTrueBoolean(args.first)) {
                    await this.manager.showCodex(matches[0]);
                    if (args.zoom !== null) {
                        const zoom = Number(args.zoom);
                        if (!Number.isNaN(zoom)) {
                            await this.manager.zoomCodex(zoom);
                        }
                    }
                } else {
                    await this.manager.cycleCodex(matches);
                }
            } else {
                if (!isTrueBoolean(args.silent)) toastr.warning(`No codex entry found for: ${value}`);
            }
        } else {
            switch (args.state) {
                case 'show':
                case 'on': {
                    await this.manager.showCodex();
                    break;
                }
                case 'hide':
                case 'off': {
                    await this.manager.hideCodex();
                    break;
                }
                default: {
                    await this.manager.toggleCodex();
                    break;
                }
            }
        }
    }


    async handleCodexMap(args, value) {
        const matches = this.matcher.findMatches(value).filter(it=>it.entry.isMap);
        if (matches.length > 0) {
            const map = new CodexMap(matches[0].entry, this.manager.settings, this.matcher, this.manager.linker);
            await map.render();
            await map.renderZoom();
        }
    }


    async handleCodexEdit(args, value) {
        const matches = this.matcher.findMatches(value);
        if (matches.length > 0) {
            await this.manager.showCodex(matches[0]);
            this.manager.codex.content.toggleEditor();
        }
    }

    async handleCodexPaint(args, value) {
        const matches = this.matcher.findMatches(value).filter(it=>it.entry.isMap);
        if (matches.length > 0) {
            await this.manager.showCodex(matches[0]);
            /**@type {CodexMap} */
            const c = this.manager.codex.content;
            c.toggleEditor();
            while (!c.editor.editorDom) await delay(100);
            await c.editor.launchPainter();
        }
    }


    async showHelp() {
        const response = await fetch('/scripts/extensions/third-party/SillyTavern-Codex/html/help.html');
        if (!response.ok) {
            return warn('failed to fetch template: help.html');
        }
        const helpText = (await response.text());
        window.x = helpText;
        const now = new Date().getTime();
        const toc = Array.from(helpText.matchAll(/<h2[^>]+id="stcdx--help--([^"]+)"[^>]*>.*?<a[^>]*>.*?<\/a>(.*?)<\/h2>/igs))
            .map((match)=>`<li><a data-stcdx--href="${match[1]}">${match[2]}</a></li>`)
            .join('\n')
        ;
        const slashHelp = document.createRange().createContextualFragment(getSlashCommandsHelp());
        const slashList = Array.from(slashHelp.querySelector('ol').querySelectorAll(':scope > li'))
            .filter(it=>it.querySelector('span').textContent.startsWith('/codex'))
            .map(it=>{
                const li = document.createElement('li'); {
                    const code = document.createElement('code'); {
                        const cmd = it.querySelector('span');
                        cmd.remove();
                        code.append(cmd.textContent);
                        code.append(' ');
                        const q = document.createElement('q'); {
                            const args = it.querySelector('span');
                            args.remove();
                            q.append(args.textContent);
                            code.append(q);
                        }
                        li.append(code);
                    }
                    const p = document.createElement('p'); {
                        p.innerHTML = it.innerHTML;
                        li.append(p);
                    }
                }
                return li.outerHTML;
            })
            .join('\n')
        ;
        const message = helpText
            .replaceAll('%%TIMESTAMP%%', `${now}`)
            .replaceAll('%%TOC%%', toc)
            .replaceAll('%%COMMANDS%%', slashList)
        ;
        sendSystemMessage('generic', message);
        await waitForFrame();
        document.querySelector(`#stcdx--help--${now}`)?.scrollIntoView();
    }
}
