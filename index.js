import { eventSource, event_types } from '../../../../script.js';
import { CodexManager } from './src/CodexManager.js';
import { SlashCommandHandler } from './src/SlashCommandHandler.js';
import { log } from './src/lib/log.js';




const init = ()=>{
    log('init');
    const codex = new CodexManager();
    // eslint-disable-next-line no-unused-vars
    const slashHandler = new SlashCommandHandler(codex);
    log('CODEX:', codex);
};
eventSource.on(event_types.APP_READY, ()=>init());
