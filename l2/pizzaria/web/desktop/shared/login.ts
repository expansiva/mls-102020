/// <mls fileReference="_102020_/l2/pizzaria/web/desktop/shared/login.ts" enhancement="_102020_/l2/enhancementAura"/>

import { CollabLitElement } from '/_102029_/l2/collabLitElement.js';
import { state } from 'lit/decorators.js';

/// **collab_i18n_start**
const message_en = {
  email: 'Email',
  password: 'Password',
  showPassword: 'Show Password',
  rememberMe: 'Remember me',
  login: 'Login',
  forgotPassword: 'Forgot Password?',
  register: 'Register',
  loading: 'Loading...',
  error: 'An error occurred.',
  retry: 'Retry'
};
const message_pt = {
  email: 'E-mail',
  password: 'Senha',
  showPassword: 'Mostrar senha',
  rememberMe: 'Lembrar-me',
  login: 'Entrar',
  forgotPassword: 'Esqueceu a senha?',
  register: 'Cadastrar',
  loading: 'Carregando...',
  error: 'Ocorreu um erro.',
  retry: 'Tentar novamente'
};
type MessageType = typeof message_en;
export const messages: { [key: string]: MessageType } = {
  'en': message_en,
  'pt': message_pt,
}
/// **collab_i18n_end**

export class LoginShared extends CollabLitElement {
  // Control states
  @state() action = null;
  @state() loading: boolean = false;
  @state() error: string | null = null;

  // Data states
  @state() user_email: string = '';
  @state() user_password: string = '';

  // Temp states
  @state() showPassword: boolean = false;
  @state() rememberMe: boolean = false;
  @state() errorMessage: string = '';

  // Computed states
  @state() isSubmitEnabled: boolean = false;

  public msg: MessageType = messages['en'];

  connectedCallback() {
    super.connectedCallback();
    // No navigation with dispatchOnMount, so no interactionRuntime needed
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('action')) {

    }
  }

  // ────────────── EmitsAction handlers ─────────────────────
  private async _submitLogin() {
    this.action = null;
    this.loading = true;
    this.error = null;

  }

  // ────────────── TempStateAction handlers ─────────────────
  private _toggleShowPassword() {
    this.action = null;
    this.showPassword = !this.showPassword;
  }

  private _toggleRememberMe() {
    this.action = null;
    this.rememberMe = !this.rememberMe;
  }

  private _clearErrorMessage() {
    this.action = null;
    this.errorMessage = '';
  }

  // ────────────── NavigationFieldsAction handlers ──────────
  public navigateToForgotPassword() {
    this.action = null;
    // Implement navigation logic here (e.g., update router state)
  }

  public navigateToRegister() {
    this.action = null;
    // Implement navigation logic here (e.g., update router state)
  }

  // ────────────── EmitsAction public surface ───────────────
  public emitSubmitLogin() {

  }

  // ────────────── Computed field methods ───────────────────
  private _computeIsSubmitEnabled() {
    // Email must be valid format, password at least 8 chars
    this.isSubmitEnabled =
      this.user_email.includes('@') &&
      this.user_email.includes('.') &&
      this.user_password.length >= 8;
  }
}