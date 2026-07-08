/// <mls fileReference="_102020_/l2/plugins/pluginCreateProjectAura.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CollabLitElement } from '/_102029_/l2/collabLitElement.js';
import { createAllFiles, IReqCreateAllFiles } from '/_102027_/l2/libStor.js';
import { createConfigFile } from '/_102027_/l2/libProjectConfig.js';
import { createModel } from '/_102027_/l2/libModel.js';
import { addMessage, createThread } from '/_102025_/l2/collabMessagesHelper.js';
import { getThreadByName } from '/_102025_/l2/collabMessagesIndexedDB.js';
import { setProjectDetails, checkIfHasLocalProject, setLocalProjectName, setLocalProjectDependencies, isValidProjectName } from '/_102027_/l2/libCommom.js';

import {
  template_l2Project,
  projectTypes,
  type IProjectType
} from '/_102027_/l2/libNewProject.js';
import { renderDesignSystemSource } from '/_102020_/l2/dsMatch/buildDesignSystemTs.js';


/// **collab_i18n_start**
const message_pt = {
  createProjectTitle: 'Criar projeto',
  createProjectHelper: 'Por favor escolha o tipo de projeto abaixo e pressione continuar.',
  labelName: 'Nome do projeto',
  labelType: 'Tipo do projeto',
  optionBlank: 'Projeto em branco',
  optionPrompt: 'Iniciar com prompt',
  promptPlaceholder: 'Digite seu prompt aqui...',
  banner: `Seu projeto de teste será criado aqui no navegador. 😊
Ele não terá controle de versão, backup ou compartilhamento, mas você pode explorar e testar tudo localmente à vontade.
Quando estiver pronto, poderá salvar o projeto no GitHub, GitLab ou em outro repositório, de acordo com o seu plano.
⚠️ Atenção: use apenas para testes. Não utilize em produção antes de salvar e fazer backup.`,
  btnCancel: 'Cancelar',
  btnCreate: 'Criar projeto',
  errorPrjNameBlank: 'O nome do projeto deve ser preenchido',
  errorPrjNameInvalid: 'O nome do projeto só pode conter letras, números e _ , e deve começar com uma letra',
  errorPrjPrompt: 'O prompt deve ser preenchido',
  alreadyHasProjectLocal: 'Um projeto de teste já existe, não é possível criar outro.',
  projectOk1: 'Projeto local criado com sucesso',
  projectOk2: 'Agora você pode começar a alterar seu novo projeto',
  btnContinue: 'Continuar',

};

const message_en = {
  createProjectTitle: 'Create project',
  createProjectHelper: 'Please choose your project type below and press continue.',
  labelName: 'Project name',
  labelType: 'Project type',
  optionBlank: 'Blank project',
  optionPrompt: 'Start with prompt',
  promptPlaceholder: 'Type your prompt here...',
  banner: `Your test project will be created right here in the browser. 😊
It won't have version control, backup, or sharing, but you can freely explore and test everything locally.
When you're ready, you can save the project to GitHub, GitLab, or another repository, depending on your plan.
⚠️ Warning: for testing only. Do not use in production before saving and creating a backup.`,
  btnCancel: 'Cancel',
  btnCreate: 'Create Project',
  errorPrjNameBlank: 'Project name must be filled in',
  errorPrjNameInvalid: 'The project name can only contain letters, numbers and _, and must start with a letter',
  errorPrjPrompt: 'Prompt must be filled in',
  alreadyHasProjectLocal: 'A test project already exists, you cannot create another one.',
  projectOk1: 'Local project created successfully',
  projectOk2: 'Now you can start editing your new project',
  btnContinue: 'Continue',

};

type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = {
  en: message_en,
  pt: message_pt
};
/// **collab_i18n_end**




const inputClasses = 'w-full text-sm font-normal px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-600';

@customElement('plugins--plugin-create-project-aura-102020')
export class PluginCreateProject extends CollabLitElement {
  private msg: MessageType = messages['pt']; // default pt

  @property({ type: String }) currentScenario: IScenaries = 'select';

  @state() projectName: string = '';
  @state() projectType: 'blank' | 'prompt' = 'prompt';
  @state() projectPrompt: string = '';
  @state() selectedProjectTypeId: string = projectTypes[0].id;
  @state() errorName: string = '';
  @state() errorPrompt: string = '';
  @state() alreadyHasProjectLocal: boolean = false;
  @state() isLoading: boolean = false;
  @state() projectCreatedSucessfully: boolean = false;

  private projectNumber = mls.stor.LOCALPROJECTNUMBER;

  private get selectedProjectType(): IProjectType {
    return projectTypes.find((item) => item.id === this.selectedProjectTypeId) || projectTypes[0];
  }

  firstUpdated(changedProperties: Map<PropertyKey, unknown>) {
    super.firstUpdated(changedProperties);
    this.alreadyHasProjectLocal = checkIfHasLocalProject()
    if (!this.selectedProjectType.agent) this.projectType = 'blank';
  }

  render() {
    this.style.display = 'block';
    const lang = this.getMessageKey(messages);
    this.msg = messages[lang];
    return html`
      <section class="plugin-create-project block p-5 text-gray-800 dark:text-gray-200">
        ${this.renderScenario()}
      </section>
    `;
  }

  private renderScenario() {
    switch (this.currentScenario) {
      case 'select':
        return this.renderSelect();
    }
  }

  private renderSelect() {

    if (this.alreadyHasProjectLocal) {
      return html`
        <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
          <span class="text-sm text-amber-600 dark:text-amber-400 leading-relaxed">${this.msg.alreadyHasProjectLocal}</span>
        </div>
      `
    }

    if (this.projectCreatedSucessfully) {
      return html`
        ${this.renderProjectCreatedOk()}
      `
    }
    return html`
      <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">${this.msg.createProjectTitle}</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${this.msg.createProjectHelper}</p>

      <label class="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
        ${this.msg.labelName}
        <input
          type="text"
          class="${inputClasses} mt-1.5"
          .value=${this.projectName}
          @input=${(e: Event) => this.projectName = (e.target as HTMLInputElement).value}
        />
      </label>
       ${this.errorName
        ? html`<div class="text-xs text-red-500 dark:text-red-400 mb-3">${this.errorName}</div>`
        : ''}

      <label class="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
        ${this.msg.labelType}
        <select
          class="${inputClasses} mt-1.5 cursor-pointer"
          @change=${this.handleProjectTypeChange}
        >
          ${projectTypes.map((item) => html`
            <option value=${item.id} ?selected=${this.selectedProjectTypeId === item.id}>${item.name}</option>
          `)}
        </select>
      </label>

      <div class="flex flex-col gap-2 mb-4">
        ${this.selectedProjectType.agent ? html`
          <label class="flex items-center gap-2 text-sm font-normal text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="radio"
              name="projectType"
              value="prompt"
              class="accent-indigo-500"
              ?checked=${this.projectType === 'prompt'}
              @change=${() => this.projectType = 'prompt'}
            />
            ${this.msg.optionPrompt}
          </label>
        ` : ''}

        <label class="flex items-center gap-2 text-sm font-normal text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="radio"
            name="projectType"
            value="blank"
            class="accent-indigo-500"
            ?checked=${this.projectType === 'blank'}
            @change=${() => this.projectType = 'blank'}
          />
          ${this.msg.optionBlank}
        </label>


      </div>

      ${this.projectType === 'prompt' && this.selectedProjectType.agent ? html`
        <textarea
          class="${inputClasses} min-h-25 resize-y mb-1"
          placeholder=${this.msg.promptPlaceholder}
          .value=${this.projectPrompt}
          @input=${(e: Event) => this.projectPrompt = (e.target as HTMLTextAreaElement).value}
        ></textarea>
        ${this.errorPrompt ? html`<div class="text-xs text-red-500 dark:text-red-400 mb-3">${this.errorPrompt}</div>` : ''}
      ` : ''}

      <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-3 my-4">
        <pre class="m-0 font-sans text-xs leading-relaxed text-gray-600 dark:text-gray-400 whitespace-break-spaces">${this.msg.banner}</pre>
      </div>

      <div class="flex gap-3">
        <button
          class="text-sm px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          @click=${this.handleCancel}
        >${this.msg.btnCancel}</button>
        <button
          class="text-sm px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          @click=${this.handleCreate}
          ?disabled=${this.isLoading}
          >
            ${this.isLoading ? html`<span class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin align-middle"></span>` : this.msg.btnCreate}
        </button>
      </div>
    `;
  }

  private renderProjectCreatedOk() {
    return html`
      <div class="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div class="w-20 h-20 rounded-full border-4 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <svg class="w-10 h-10 text-emerald-500 dark:text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h1 class="text-lg font-semibold text-gray-800 dark:text-gray-100">${this.msg.projectOk1}</h1>
            <h5 class="text-sm text-gray-400 dark:text-gray-500">${this.msg.projectOk2}</h5>
            <button
              type="button"
              class="text-sm px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors cursor-pointer"
              @click=${() => { window.location.reload() }}
            >${this.msg.btnContinue}</button>
        </div>
    `
  }

  private handleCancel() {
    console.log("Cancel clicked");
  }

  private handleProjectTypeChange(e: Event) {
    this.selectedProjectTypeId = (e.target as HTMLSelectElement).value;
    if (!this.selectedProjectType.agent) this.projectType = 'blank';
  }

  private validateForm(): boolean {
    let valid = true;
    this.errorName = '';
    this.errorPrompt = '';

    const validName: boolean = isValidProjectName(this.projectName);

    if (!validName) {
      this.errorName = this.msg.errorPrjNameInvalid;
      valid = false;
    }

    if (!this.projectName.trim()) {
      this.errorName = this.msg.errorPrjNameBlank;
      valid = false;
    }

    if (this.projectType === 'prompt' && !this.projectPrompt.trim()) {
      this.errorPrompt = this.msg.errorPrjPrompt;
      valid = false;
    }

    return valid;
  }

  private async handleCreate() {

    if (!this.validateForm()) {
      console.warn("Form invalid");
      return;
    }

    this.isLoading = true;
    try {
      await this.createFiles();
    }
    catch (err: any) {
      console.info(err.message)
    } finally {
      this.isLoading = false;
    }
  }

  private setProjectActual(project: number) {
    mls.setActualProject(project);
    setProjectDetails(project);
  }

  private async createFiles() {
    await this.createInitialProject(this.projectNumber);
    await this.createInitialDSFile(this.projectNumber);
    await this.createInitialConfigL5File(this.projectNumber);

    this.setProjectActual(this.projectNumber);
    setLocalProjectName(this.projectName);
    setLocalProjectDependencies(this.selectedProjectType.dependencies);

    if (this.projectType === 'prompt' && this.selectedProjectType.agent) {
      const threadProjectName = `_${this.projectNumber}_${this.projectName}`
      let thread = await getThreadByName(threadProjectName);
      if (!thread) {
        thread = await createThread(threadProjectName, [], 'company');
      }
      const messageForAgent = `@@${this.selectedProjectType.agent} ${this.projectPrompt}`;
      if (!thread) {
        throw new Error('No find thread, try again');
      }
      await addMessage(thread.threadId, messageForAgent);
      mls.events.fire([mls.actualLevel], 'collabMessages' as any, JSON.stringify({ threadId: thread.threadId, taskId: 'last', type: 'thread-open' }))
    }

    this.projectCreatedSucessfully = true;
  }

  private async createInitialProject(project: number) {

    const fileName = 'project';
    const content = template_l2Project.template.trim().replace(/\[project\]/g, project.toString());
    await this.createNewFileL2(fileName, content);
    const key = mls.stor.getKeyToFiles(project, 2, fileName, '', '.ts');
    const storFile = mls.stor.files[key];
    if (!storFile) throw new Error('Invalid stor file');
    createModel(storFile, true, true);
  }

  private async createInitialConfigL5File(project: number) {
    await createConfigFile(project);
  }

  private async createInitialDSFile(project: number) {
    const fileName = 'designSystem';
    // Generated format, empty themes: entries appear when a DS gets tokens (buildDesignSystemTs).
    const content = renderDesignSystemSource(project, []);
    await this.createNewFileL2(fileName, content);
    const key = mls.stor.getKeyToFiles(project, 2, fileName, '', '.ts');
    const storFile = mls.stor.files[key];
    if (!storFile) throw new Error('Invalid stor file');
    createModel(storFile, true, true);
  }

  private async createNewFileL2(shortName: string, content: string) {

    const folder: string = '';
    const enhancement: string = '_blank';
    const param = {
      shortName: shortName,
      project: this.projectNumber,
      folder,
      enhancement,
      level: 2,
      tsSource: content
    } as IReqCreateAllFiles;
    await createAllFiles(param, false, false);
  }

}

type IScenaries = 'select';
