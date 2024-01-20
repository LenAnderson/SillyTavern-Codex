import { extension_settings } from '../../../../../extensions.js';

export const log = (...msg)=>(extension_settings.codex?.isVerbose ?? true) && console.log('[STCDX2]', ...msg);
export const warn = (...msg)=>(extension_settings.codex?.isVerbose ?? true) && console.warn('[STCDX2]', ...msg);
