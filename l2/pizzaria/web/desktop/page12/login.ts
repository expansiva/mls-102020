/// <mls fileReference="_102020_/l2/pizzaria/web/desktop/page12/login.ts" enhancement="_102020_/l2/enhancementAura"/>

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';

import '/_102033_/l2/molecules/groupentertext/ml-floating-text-input.js';

import {
	LoginShared,
	messages
} from '/_102020_/l2/pizzaria/web/desktop/shared/login.js';

@customElement('pizzaria--web--desktop--page12--login-102020')
export class LoginPage extends LoginShared {

	render() {

		const lang = this.getMessageKey(messages);

		this.msg = messages[lang];

		return html`
			<main class="
				flex
				min-h-screen
				items-center
				justify-center
				p-6
			">

				<section class="
					login-card

					flex
					flex-col
					gap-6

					w-full
					max-w-md

					p-6
				">

					<header class="
						flex
						flex-col
						gap-2
					">

						<h1 class="login-title">
							${this.msg.login}
						</h1>

						<p class="login-description">
							Acesse sua conta para continuar..
						</p>

					</header>

					<form class="
						flex
						flex-col
						gap-4
					">

						<groupentertext--ml-floating-text-input
							class="field-input"
							required
							type="email"
							is-editing="true">

							<Label>
								${this.msg.email}
							</Label>

						</groupentertext--ml-floating-text-input>

						<groupentertext--ml-floating-text-input
							class="field-input"
							required
							type="password"
							is-editing="true">

							<Label>
								${this.msg.password}
							</Label>

						</groupentertext--ml-floating-text-input>

						<label class="
							login-checkbox

							flex
							items-center
							gap-2
						">

							<input
								type="checkbox"

								class="login-checkbox__input"
							/>

							<span>
								Remember
							</span>

						</label>

						<div class="
							flex
							flex-col
							gap-4
							mt-2
						">

							<button
								type="submit"

								class="btn-primary"
							>

								${this.msg.login}

							</button>

						</div>

						<footer class="
							flex
							items-center
							justify-between

							mt-2
						">

							<button
								type="button"

								class="btn-link"
							>

								${this.msg.forgotPassword}

							</button>

							<button
								type="button"

								class="btn-link"
							>

								${this.msg.register}

							</button>

						</footer>

					</form>

				</section>

			</main>
		`;
	}
}