import { registerSlashCommand } from '../../../../slash-commands.js';
import { isTrueBoolean } from '../../../../utils.js';
// eslint-disable-next-line no-unused-vars
import { CodexManager } from './CodexManager.js';




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
}
