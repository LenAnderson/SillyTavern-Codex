import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { rerenderCodex, restartDebounced } from './index.js';

export let settings;
export const initSettings = ()=>{
    settings = Object.assign({
        isEnabled: true,
        color: 'rgba(0, 255, 255, 1)',
        icon: '🧾',
        onlyFirst: false,
        noTooltips: false,
        fixedTooltips: false,
        requirePrefix: true,
        template: '## {{key[0]}}\n\n{{content}}',
        templateList: [],
        cycle: true,
        cycleDelay: 1000,
        mapZoom: 10,
        mapShadow: 3,
        mapShadowColor: 'rgba(0, 0, 0, 1)',
        mapDesaturate: 50,
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
                        <label class="checkbox_label">
                            <input type="checkbox" id="stcdx--requirePrefix" ${settings.requirePrefix ? 'checked' : ''}>
                            Only match keys with <code>codex:</code> prefix
                        </label>
                    </div>
                    <div class="flex-container">
                        <label class="checkbox_label">
                            <input type="checkbox" id="stcdx--onlyFirst" ${settings.onlyFirst ? 'checked' : ''}>
                            Only create link on first occurrence in a message
                        </label>
                    </div>
                    <div class="flex-container">
                        <label class="checkbox_label">
                            <input type="checkbox" id="stcdx--noTooltips" ${settings.noTooltips ? 'checked' : ''}>
                            Don't show tooltips
                        </label>
                    </div>
                    <div class="flex-container">
                        <label class="checkbox_label">
                            <input type="checkbox" id="stcdx--fixedTooltips" ${settings.fixedTooltips ? 'checked' : ''}>
                            Show tooltips on top of codex instead of at cursor
                        </label>
                    </div>
                    <div class="flex-container">
                        <label class="checkbox_label">
                            <input type="checkbox" id="stcdx--cycle" ${settings.cycle ? 'checked' : ''}>
                            Cycle through found entries on new message
                        </label>
                    </div>
                    <div class="flex-container">
                        <label>
                            Cycle delay (ms)
                            <input type="number" class="text_pole" id="stcdx--cycleDelay" min="0" value="${settings.cycleDelay}">
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
                    <div class="flex-container">
                        <label>
                            Maps: zone zoom amount (hover) [%]
                            <input type="number" class="text_pole" min="0" id="stcdx--mapZoom" value="${settings.mapZoom ?? 10}">
                        </label>
                    </div>
                    <div class="flex-container">
                        <label>
                            Maps: zone shadow strength (hover) [px]
                            <input type="number" class="text_pole" min="0" id="stcdx--mapShadow" value="${settings.mapShadow ?? 3}">
                        </label>
                    </div>
                    <div class="flex-container">
                        <toolcool-color-picker id="stcdx--mapShadowColor" color="${settings.mapShadowColor}"></toolcool-color-picker>
                        <span>Maps: zone shadow color (hover)</span>
                    </div>
                    <div class="flex-container">
                        <label>
                            Maps: desaturation (before hover) [%]
                            <input type="number" class="text_pole" min="0" max="100" id="stcdx--mapDesaturate" value="${settings.mapDesaturate ?? 50}">
                        </label>
                    </div>
                    <div class="flex-container">
                        <div class="stcdx--templatesContainer">
                            <label>
                                Codex template (markdown)<br>
                                <small>macros: <code>{{comment}} {{key[0]}} {{key[1]}} {{key[2]}} ... {{content}}</code></small>
                                <textarea class="text_pole" id="stcdx--template" rows="6"></textarea>
                            </label>
                            <div id="stcdx--addTemplate" class="menu_button menu_button_icon fa-solid fa-plus" title="Add template"></div>
                        </div>
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
    document.querySelector('#stcdx--requirePrefix').addEventListener('click', ()=>{
        settings.requirePrefix = document.querySelector('#stcdx--requirePrefix').checked;
        saveSettingsDebounced();
        restartDebounced();
    });
    document.querySelector('#stcdx--onlyFirst').addEventListener('click', ()=>{
        settings.onlyFirst = document.querySelector('#stcdx--onlyFirst').checked;
        saveSettingsDebounced();
        restartDebounced();
    });
    document.querySelector('#stcdx--noTooltips').addEventListener('click', ()=>{
        settings.noTooltips = document.querySelector('#stcdx--noTooltips').checked;
        saveSettingsDebounced();
        restartDebounced();
    });
    document.querySelector('#stcdx--fixedTooltips').addEventListener('click', ()=>{
        settings.fixedTooltips = document.querySelector('#stcdx--fixedTooltips').checked;
        saveSettingsDebounced();
        restartDebounced();
    });
    document.querySelector('#stcdx--cycle').addEventListener('click', ()=>{
        settings.cycle = document.querySelector('#stcdx--cycle').checked;
        saveSettingsDebounced();
    });
    document.querySelector('#stcdx--cycleDelay').addEventListener('input', ()=>{
        try {
            settings.cycleDelay = parseInt(document.querySelector('#stcdx--cycleDelay').value);
            document.body.style.setProperty('--stcdx--cycleDelay', `"${settings.cycleDelay}"`);
            saveSettingsDebounced();
        } catch { /* empty */ }
    });
    document.querySelector('#stcdx--color').addEventListener('change', (evt)=>{
        settings.color = evt.detail.rgba;
        document.body.style.setProperty('--stcdx--color', `${settings.color}`);
        saveSettingsDebounced();
    });
    document.querySelector('#stcdx--icon').addEventListener('change', ()=>{
        settings.icon = document.querySelector('#stcdx--icon').value;
        document.body.style.setProperty('--stcdx--icon', `"${settings.icon}"`);
        saveSettingsDebounced();
    });
    document.querySelector('#stcdx--mapZoom').addEventListener('input', ()=>{
        try {
            settings.mapZoom = parseInt(document.querySelector('#stcdx--mapZoom').value);
            document.body.style.setProperty('--stcdx--mapZoom', `${settings.mapZoom}`);
            saveSettingsDebounced();
        } catch { /* empty */ }
    });
    document.querySelector('#stcdx--mapShadow').addEventListener('input', ()=>{
        try {
            settings.mapShadow = parseInt(document.querySelector('#stcdx--mapShadow').value);
            document.body.style.setProperty('--stcdx--mapShadow', `${settings.mapShadow}`);
            saveSettingsDebounced();
        } catch { /* empty */ }
    });
    document.querySelector('#stcdx--mapShadowColor').addEventListener('change', (evt)=>{
        settings.mapShadowColor = evt.detail.rgba;
        document.body.style.setProperty('--stcdx--mapShadowColor', `${settings.mapShadowColor}`);
        saveSettingsDebounced();
    });
    document.querySelector('#stcdx--mapDesaturate').addEventListener('input', ()=>{
        try {
            settings.mapDesaturate = parseInt(document.querySelector('#stcdx--mapDesaturate').value);
            document.body.style.setProperty('--stcdx--mapDesaturate', `${settings.mapDesaturate}`);
            saveSettingsDebounced();
        } catch { /* empty */ }
    });
    document.querySelector('#stcdx--template').value = settings.template;
    document.querySelector('#stcdx--template').addEventListener('change', ()=>{
        settings.template = document.querySelector('#stcdx--template').value;
        saveSettingsDebounced();
        rerenderCodex();
    });
    const add = document.querySelector('#stcdx--addTemplate');
    settings.templateList.forEach(t=>renderTemplate(t, add));
    add.addEventListener('click', ()=>{
        const template = { name: '', template: '' };
        settings.templateList.push(template);
        saveSettingsDebounced();
        renderTemplate(template, add);
    });
};


const renderTemplate = (template, add)=>{
    const wrap = document.createElement('div'); {
        wrap.classList.add('stcdx--template');
        const cont = document.createElement('div'); {
            cont.classList.add('stcdx--content');
            const row = document.createElement('div'); {
                row.classList.add('stcdx--row');
                const name = document.createElement('input'); {
                    name.classList.add('stcdx--name');
                    name.classList.add('text_pole');
                    name.placeholder = 'name';
                    name.value = template.name;
                    name.addEventListener('input', ()=>{
                        template.name = name.value;
                        saveSettingsDebounced();
                        rerenderCodex();
                    });
                    row.append(name);
                }
                const del = document.createElement('div'); {
                    del.classList.add('stcdx--action');
                    del.classList.add('menu_button');
                    del.classList.add('menu_button_icon');
                    del.classList.add('fa-solid');
                    del.classList.add('fa-trash-can');
                    del.classList.add('redWarningBG');
                    del.title = 'Remove template';
                    del.addEventListener('click', ()=>{
                        wrap.remove();
                        settings.templateList.splice(settings.templateList.indexOf(template), 1);
                        saveSettingsDebounced();
                        rerenderCodex();
                    });
                    row.append(del);
                }
                cont.append(row);
            }
            const tpl = document.createElement('textarea'); {
                tpl.classList.add('stcdx--tpl');
                tpl.classList.add('text_pole');
                tpl.placeholder = 'template (markdown)';
                tpl.rows = 6;
                tpl.value = template.template;
                tpl.addEventListener('input', ()=>{
                    template.template = tpl.value;
                    saveSettingsDebounced();
                    rerenderCodex();
                });
                cont.append(tpl);
            }
            wrap.append(cont);
        }
        add.insertAdjacentElement('beforebegin', wrap);
    }
};
