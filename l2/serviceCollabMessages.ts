/// <mls fileReference="_102020_/l2/serviceCollabMessages.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';

import { setEnvironment } from '/_102036_/l2/environmentContract.js';
import { collabEnvironment } from '/_102020_/l2/collabMessagesEnvironment.js';
import { loadNotificationPreferences } from '/_102025_/l2/collabMessagesHelper.js';

import { checkIfNotificationUnread, listenToThreadEvents } from '/_102025_/l2/collabMessagesSyncNotifications.js';
import { getThread } from '/_102025_/l2/collabMessagesIndexedDB.js';

import { loadLastTab } from "/_102025_/l2/collabMessagesHelper.js";
import { openService } from "/_102027_/l2/libCommom.js";


import '/_102025_/l2/collabMessages.js';
import '/_102025_/l2/collabMessagesSettingsGeral.js';
import '/_102020_/l2/pluginFindTask.js';

/// **collab_i18n_start** 
const message_pt = {
    loading: 'Carregando...',
    crm: 'CRM',
    tasks: 'Tasks',
    docs: 'Docs',
    connect: 'Conectar',
    alertMsgTitle: 'Ative as notificações',
    alertMsgBody: 'Para não perder mensagens importantes, permita notificações no navegador.',
    moments: 'Moments',
    apps: 'Apps'

}

const message_en = {
    loading: 'Loading...',
    crm: 'CRM',
    tasks: 'Tasks',
    docs: 'Docs',
    connect: 'Connect',
    alertMsgTitle: 'Enable notifications',
    alertMsgBody: 'To avoid missing important messages, allow notifications in your browser.',
    moments: 'Moments',
    apps: 'Apps'
}

type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = {
    'en': message_en,
    'pt': message_pt
}
/// **collab_i18n_end**

@customElement('service-collab-messages-102020')
export class ServiceCollabMessages extends ServiceBase {

    private msg: MessageType = messages['en'];

    @property() activeTab: string = '';
    @property() msize: string = '';

    @state() threadToOpen: string = '';
    @state() taskToOpen: string = '';
    @state() lastLevel: number = -1;

    @query('collab-messages-102025') collabMessagesEl?: HTMLElement;

    public details: IService = {
        icon: '&#xf086',
        state: 'background',
        position: 'right',
        tooltip: 'Messages',
        visible: true,
        widget: '_102020_serviceCollabMessages',
        level: [0, 1, 2, 3, 4, 5, 6, 7]
    }


    public onClickTabs(index: number) {

        if (this.activeTab === ETabs[index]) {
            this.activeTab = 'Loading';
            setTimeout(() => {
                this.activeTab = ETabs[index] as ITabType;
            }, 0)
            return;
        };
        this.activeTab = ETabs[index] as ITabType;

    }

    public onClickMain(op: string) {
        if (op === 'opAboutThis') this.showAboutThis();
        if (op === 'opSettings2') this.openSettings2();
        if (op === 'opFindTask') this.openFindTask();
    }

    public menu: IServiceMenu = {
        title: '',
        main: {
            // opReset: { text: 'Reset onboarding', icon: 'f2ea' },
            opSettings2: { text: 'Settings', icon: 'f085' },
            opFindTask: { text: 'Find Task', icon: 'f002' },
            opAboutThis: 'About this content',
        },
        tools: {
        },
        tabs: {
            group: 'Mode',
            type: 'onlyicon',
            selected: ETabs.Loading,
            options: [
                { text: this.msg.crm, icon: 'f095' },
                { text: this.msg.tasks, icon: 'f0ae' },
                { text: this.msg.connect, icon: 'f0c1' },
                { text: this.msg.moments, icon: 'f1ea' },
                { text: this.msg.apps, icon: 'f58d' },
            ]
        },
        onClickMain: this.onClickMain.bind(this),
        onClickTabs: this.onClickTabs.bind(this),

    }

    onServiceClick(visible: boolean, reinit: boolean, el: IToolbarContent | null) {
        if (visible) {
            this.configureByLevel();
        }
    }

    async connectedCallback() {
        super.connectedCallback();
        this.setEvents();
        this.bootstrapCollabMessages()
    }

    disconnectedCallback() {
        this.removeEvents();
    }

    firstUpdated(changedProperties: Map<string | number | symbol, unknown>) {
        super.firstUpdated(changedProperties)
        this.checkNotificationPending();
    }

    updated(changedProperties: Map<string | number | symbol, unknown>) {
        if (changedProperties.has('msize')) {
            if (!this.visible || !this.collabMessagesEl) return;
            const [w, h] = this.msize.split(',');
            this.collabMessagesEl.style.height = `${h}px`
        }
        super.updated(changedProperties)
    }

    render() {
        return html`<collab-messages-102025 
            .activeTab=${this.activeTab} 
            .threadToOpen=${this.threadToOpen}
            .taskToOpen=${this.taskToOpen}
         ></collab-messages-102025>`;
    }

    private bootstrapCollabMessages() {
        setEnvironment(collabEnvironment);
        this.initNotificationIfEnabled();
    }

    private async initNotificationIfEnabled() {
        try {
            let preferences: string | null | undefined = loadNotificationPreferences();
            if (preferences !== 'granted' && Notification.permission !== 'granted') return;
            listenToThreadEvents();
        } catch (err: any) {
            console.error('Error on listen notifications' + err.message)
        }

    }

    private setEvents() {
        mls.events.addEventListener([0, 1, 2, 3, 4, 5, 6, 7], ['collabMessages'] as any, this.onCollabEventsCollabMessages.bind(this));
        window.addEventListener('thread-notification', this.onThreadReceivedNotification.bind(this));
    }

    private removeEvents() {
        mls.events.removeEventListener([0, 1, 2, 3, 4, 5, 6, 7], ['collabMessages'] as any, this.onCollabEventsCollabMessages.bind(this));
        window.removeEventListener('thread-notification', this.onThreadReceivedNotification.bind(this));
    }

    private async checkNotificationPending() {
        const hasPendingMessages = await checkIfNotificationUnread();
        this.toogleBadge(hasPendingMessages, '_102020_serviceCollabMessages');
    }

    private onThreadReceivedNotification(e: Event) {
        const customEvent = e as CustomEvent;
        this.toogleBadge(customEvent.detail, '_102020_serviceCollabMessages');
    }

    private openSettings2() {
        if (this.menu.setTabActive) this.menu.setTabActive(-1);
        if (this.menu.setMode) {
            const settings = document.createElement('collab-messages-settings-geral-102025');
            (settings as any)['serviceBase'] = this;
            this.menu.setMode('page', settings);
        }
        return true;
    }

    private openFindTask() {
        if (this.menu.setTabActive) this.menu.setTabActive(-1);
        if (this.menu.setMode) {
            const settings = document.createElement('plugin-find-task-102020');
            (settings as any)['serviceBase'] = this;
            this.menu.setMode('page', settings);
        }
        return true;
    }


    private changeDisplayMenu(show: boolean) {
        if (!this.nav3Menu) return;
        const item = this.nav3Menu?.querySelector('li[data-key="4"]') as HTMLElement;
        if (!item) return;
        if (show) item.style.display = 'inline-flex';
        else item.style.display = 'none';
    }

    private isFirstEnter: boolean = true;
    private configureByLevel() {
        if (!this.menu || !this.menu.tabs || !this.menu.setTabActive) return;
        // APPS tab is now available on every level (was restricted to level 7).
        this.changeDisplayMenu(true);
        if (this.isFirstEnter) {
            this.isFirstEnter = false;
            const lastActive = ETabs[loadLastTab() as ITabType];
            this.menu.setTabActive(lastActive);
        }

        this.lastLevel = this.level;
    }

    private async onCollabEventsCollabMessages(ev: mls.events.IEvent) {

        if (!ev.desc) return;
        this.threadToOpen = '';
        this.taskToOpen = '';

        try {
            const data = JSON.parse(ev.desc);
            if (data.type === 'thread-open') {
                if (!data.threadId) return;
                const thread = await getThread(data.threadId);
                if (!thread) return;
                if (data.taskId) this.taskToOpen = data.taskId;

                openService('_102020_serviceCollabMessages', 'left', ev.level);
                const group = thread.group;
                this.threadToOpen = thread.threadId;
                if (group !== this.activeTab) this.activeTab = group as ITabType;
            }
        } catch (err: any) {
            console.error(err.message)
        }

    }


    private showAboutThis(): boolean {

        const div = document.createElement('div');
        div.style.padding = '1rem';

        let name = 'nothing selected';

        switch (this.activeTab) {
            case 'CRM':
                name = 'collab-messages-chat-102025';
                break;
            case 'TASK':
                name = 'collab-messages-tasks-102025';
                break;
            case 'APPS':
                name = 'collab-messages-apps-102025';
                break;
            case 'MOMENTS':
                name = 'collab-messages-moments-102025';
                break;
            case 'CONNECT':
                name = 'collab-messages-chat-102025';
                break;
            default:
                name = 'nothing selected';
        }

        div.innerHTML = `
        
            <h3>About this content</h3>
            <ul>
                <li>Reference: ${name}</li>
                <li>Level: ${this.level}</li>
                <li>Position: ${this.position}</li>
            </ul>
        `;

        if (this.menu.setMode) this.menu.setMode('page', div);
        return true;

    }
}

enum ETabs {
    'CRM' = 0,
    'TASK' = 1,
    'CONNECT' = 2,
    'MOMENTS' = 3,
    'APPS' = 4,
    'Add' = 5,
    'Loading' = 6,
}
type ITabType = 'CRM' | 'TASK' | 'MOMENTS' | 'CONNECT' | 'APPS' | 'Add' | 'Loading';
type IScenery = 'tabs' | 'settings' | 'findTask'
