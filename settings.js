import { saveSettingsDebounced } from "../../../../script.js";
import { extension_settings } from "../../../extensions.js";
import { restartDebounced } from "./index.js";

export let settings;
export const initSettings = ()=>{
    settings = Object.assign({
        isEnabled: true,
        color: 'rgba(0, 255, 255, 1)',
        icon: '🧾',
    }, extension_settings.codex ?? {});
    extension_settings.codex = settings;

    const html = `
        <div class="stcdx--settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Codex</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content" style="font-size:small;">
                    <div class="flex-container">
                        <label class="checkbox_label">
                            <input type="checkbox" id="stcdx--isEnabled" ${settings.isEnabled ? 'checked' : ''}>
                            Enable codex
                        </label>
                    </div>
                    <div class="flex-container">
                        <toolcool-color-picker id="stcdx--color" color="${settings.color}"></toolcool-color-picker>
                        <span>Codex link color</span>
                    </div>
                    <div class="flex-container">
                        <label>
                            Icon next to codex link
                            <input type="text" class="text_pole" id="stcdx--icon" value="${settings.icon}">
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;
    $('#extensions_settings').append(html);
    document.querySelector('#stcdx--isEnabled').addEventListener('click', ()=>{
        settings.isEnabled = document.querySelector('#stcdx--isEnabled').checked;
        saveSettingsDebounced();
        restartDebounced();
    });
    document.querySelector('#stcdx--color').addEventListener('change', (evt)=>{
        settings.color = evt.detail.rgba;
        document.querySelector('#chat').style.setProperty('--stcdx--color', `${settings.color}`);
        saveSettingsDebounced();
    });
    document.querySelector('#stcdx--icon').addEventListener('change', ()=>{
        settings.icon = document.querySelector('#stcdx--icon').value;
        document.querySelector('#chat').style.setProperty('--stcdx--icon', `"${settings.icon}"`);
        saveSettingsDebounced();
    });
};
