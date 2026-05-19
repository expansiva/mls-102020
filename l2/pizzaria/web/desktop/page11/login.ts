/// <mls fileReference="_102020_/l2/pizzaria/web/desktop/page11/login.ts" enhancement="_102020_/l2/enhancementAura"/>

import { html, } from 'lit';
import { customElement } from 'lit/decorators.js';

import '/_102033_/l2/molecules/groupentertext/ml-multiline-text.js'

import { LoginShared, messages } from '/_102020_/l2/pizzaria/web/desktop/shared/login.js';

@customElement('pizzaria--web--desktop--page11--login-102020')
export class LoginPage extends LoginShared {

  render() {
    
    const lang = this.getMessageKey(messages)
    this.msg = messages[lang];

    return html`<main class="login-form flex flex-col gap-4 w-full max-w-md mx-auto p-6">
      <section class="login-form bg-white rounded-2xl shadow-md p-6">
        <form class="login-form__form flex flex-col gap-4">

        <groupentertext--ml-multiline-text
          required
          type="email"
          is-editing="true">
          <Label>${this.msg.email}</Label>
        </groupentertext--ml-multiline-text>

        <groupentertext--ml-multiline-text
          required
          type="password"
          is-editing="true">
          <Label>${this.msg.password}</Label>
        </groupentertext--ml-multiline-text>
    
    
          <label class="field field--checkbox flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" class="field__checkbox h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
               />
            Remember
          </label>
          <div class="login-form__actions mt-6">
            <button type="submit" class="btn btn--primary w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
              ${this.msg.login}
            </button>
          </div>
          <div class="login-form__links flex justify-between mt-4 text-sm">
            <button type="button" class="btn btn--link text-blue-600 hover:underline"
             >
              ${this.msg.forgotPassword}
            </button>
            <button type="button" class="btn btn--link text-blue-600 hover:underline"
              >
              ${this.msg.register}
            </button>
          </div>
        </form>
      </section>
    </main>`;
  }

}