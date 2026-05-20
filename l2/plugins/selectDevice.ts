/// <mls fileReference="_102020_/l2/plugins/selectDevice.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Device',
    desc: 'Select the target device to preview and generate components optimized for that platform.',
    webDesktopTitle: 'Web Desktop',
    webDesktopDesc: 'Full browser experience, optimized for large screens and mouse/keyboard interaction.',
    webMobileTitle: 'Web Mobile',
    webMobileDesc: 'Mobile browser experience, touch-optimized with responsive layouts.',
    androidTitle: 'Android',
    androidDesc: 'Native Android application via WebView or native bridge.',
    iosTitle: 'iOS',
    iosDesc: 'Native iOS application via WKWebView or native bridge.',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Dispositivo',
        desc: 'Selecione o dispositivo alvo para visualizar e gerar componentes otimizados para aquela plataforma.',
        webDesktopTitle: 'Web Desktop',
        webDesktopDesc: 'Experiência completa no navegador, otimizada para telas grandes e interação com mouse e teclado.',
        webMobileTitle: 'Web Mobile',
        webMobileDesc: 'Experiência no navegador mobile, otimizada para toque e layouts responsivos.',
        androidTitle: 'Android',
        androidDesc: 'Aplicativo nativo Android via WebView ou ponte nativa.',
        iosTitle: 'iOS',
        iosDesc: 'Aplicativo nativo iOS via WKWebView ou ponte nativa.',
    },
    es: {
        title: 'Dispositivo',
        desc: 'Seleccione el dispositivo objetivo para previsualizar y generar componentes optimizados para esa plataforma.',
        webDesktopTitle: 'Web Desktop',
        webDesktopDesc: 'Experiencia completa en el navegador, optimizada para pantallas grandes e interacción con ratón y teclado.',
        webMobileTitle: 'Web Mobile',
        webMobileDesc: 'Experiencia en navegador móvil, optimizada para toque y diseños responsivos.',
        androidTitle: 'Android',
        androidDesc: 'Aplicación nativa Android a través de WebView o puente nativo.',
        iosTitle: 'iOS',
        iosDesc: 'Aplicación nativa iOS a través de WKWebView o puente nativo.',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IDeviceInfo {
    value: number;
    titleKey: keyof MessageType;
    descKey: keyof MessageType;
}

const DEVICES: IDeviceInfo[] = [
    { value: 1, titleKey: 'webDesktopTitle', descKey: 'webDesktopDesc' },
    { value: 2, titleKey: 'webMobileTitle',  descKey: 'webMobileDesc'  },
    { value: 3, titleKey: 'androidTitle',    descKey: 'androidDesc'    },
    { value: 4, titleKey: 'iosTitle',        descKey: 'iosDesc'        },
];

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--select-device-102020')
export class PluginSelectDevice extends StateLitElement {

    @property({ attribute: false }) value: number | null = null;

    private get msg(): MessageType {
        const lang = this.getMessageKey(messages);
        return messages[lang];
    }

    createRenderRoot() { return this; }

    render() {
        const v = this.value ?? 1;
        const device = DEVICES.find(d => d.value === v) ?? DEVICES[0];
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderNavHeader(this.msg[device.titleKey], this.msg.desc, v, 1, DEVICES.length)}
                ${this._renderDeviceCard(device)}
            </div>
        `;
    }

    // ─── Renders ─────────────────────────────────────────────────────

    private _renderDeviceCard(device: IDeviceInfo) {
        return html`
            <div class="
                rounded-lg border border-gray-200 dark:border-gray-800
                bg-gray-50 dark:bg-gray-900/50
                px-3 py-3
            ">
                <span class="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
                    ${this.msg[device.descKey]}
                </span>
            </div>
        `;
    }

    private _renderNavHeader(title: string, desc: string, value: number, min: number, max: number) {
        const atMin = value <= min;
        const atMax = value >= max;
        const navBtn = (label: string, target: number, disabled: boolean) => html`
            <button
                class="px-1.5 py-1 rounded text-base font-mono leading-none transition-colors
                    ${disabled
                        ? 'text-gray-300 dark:text-gray-700 cursor-default'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'}"
                ?disabled=${disabled}
                @click=${() => { if (!disabled) this._dispatchSelect(target); }}
            >${label}</button>
        `;
        return html`
            <div class="flex flex-col gap-1">
                <div class="flex items-center">
                    <div class="flex items-center gap-0.5">
                        ${navBtn('«', min, atMin)}
                        ${navBtn('‹', value - 1, atMin)}
                    </div>
                    <span class="flex-1 text-center text-lg font-semibold text-gray-700 dark:text-gray-200">${title}</span>
                    <div class="flex items-center gap-0.5">
                        ${navBtn('›', value + 1, atMax)}
                        ${navBtn('»', max, atMax)}
                    </div>
                </div>
                <span class="text-sm text-gray-400 dark:text-gray-500 leading-relaxed text-center">${desc}</span>
            </div>
        `;
    }

    private _dispatchSelect(value: number) {
        this.dispatchEvent(new CustomEvent('select-device', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }
}
