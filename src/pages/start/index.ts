import {PageBase} from "~/base/page"
import {AnalyzePage} from "../analyze"
import {HelpPage} from "../help"
import {LanguagePage} from "../language"

export class StartPage extends PageBase {
  static data = this.buildData()

  async handleCallbackQueryData() {
    await this.gdefault.show()
  }

  async handleCommandText() {
    await this.gdefault.show()
  }

  helper = {}
  gdefault = {
    show: async () => {
      await this.clearSession()
      await this.renderText({
        mode: `auto`,
        keyboard: this.inlineKeyboardT([AnalyzePage, LanguagePage, HelpPage], `2`),
        data: {userName: this.from?.username ?? this.from?.first_name ?? `you`},
      })
    },
    process: () => {},
  }

  static template = `
    <g-base>
      <g-description>Introduction and main menu</g-description>
      <g-description lang="id">Perkenalan dan menu utama</g-description>
      ${this.kbk.mainMenu()}
      <g-message>
        <b>👋 Hello {{userName}}, I'm Page Roast!</b>

        Send me a landing page URL and I will roast it — honestly, in
        English or Indonesian — then give you 10 concrete ways to fix it
        and lift your conversion rate.

        <b>Try it:</b>
        /analyze https://yuzuu.co
        Or just paste any landing page URL here.

        <b>Commands:</b>
        /analyze &lt;url&gt; — roast a landing page
        /language — switch language (English / Indonesia)
        /forget — erase my recent analyses
        /help — full help
      </g-message>
      <g-message lang="id">
        <b>👋 Halo {{userName}}, aku Page Roast!</b>

        Kirim URL landing page dan aku akan me-roast-nya — jujur, pakai
        bahasa Inggris atau Indonesia — lalu memberi 10 cara konkret
        untuk memperbaikinya dan menaikkan conversion rate kamu.

        <b>Coba:</b>
        /analyze https://yuzuu.co
        Atau tempel saja URL landing page apa pun di sini.

        <b>Perintah:</b>
        /analyze &lt;url&gt; — roast sebuah landing page
        /language — ganti bahasa (English / Indonesia)
        /forget — hapus analisis terakhirmu
        /help — bantuan lengkap
      </g-message>
    </g-base>
  `
}
