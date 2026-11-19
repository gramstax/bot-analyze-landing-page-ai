import {PageBase} from "~/base/page"
import {StartPage} from "./start"

export class HelpPage extends PageBase {
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
      await this.renderText({mode: `auto`, keyboard: this.inlineKeyboardT([StartPage])})
    },
    process: () => {},
  }

  static template = `
    <g-base>
      <g-description>Full help and command list</g-description>
      <g-description lang="id">Bantuan lengkap dan daftar perintah</g-description>
      ${this.kbk.back()}
      <g-message>
        <b>🆘 Help — Page Roast</b>

        <b>How it works</b>
        Send a landing page URL — in English or Indonesian — and I will
        fetch the page, roast it like a professional CRO expert, and give
        you 10 concrete, personalized ways to lift your conversion rate.
        I only ever read public pages; I never change anything on them.

        <b>Examples</b>
        /analyze https://yuzuu.co
        https://example.com

        <b>Commands</b>
        All commands are in English. Replies are bilingual — English by
        default, Indonesian when you pick it with /language.
        /start — introduction &amp; main menu
        /analyze &lt;url&gt; — roast a landing page
        /language — switch language (English / Indonesia)
        /forget — erase my recent analyses
        /help — this page

        <b>HTTP endpoint</b>
        The same analysis is available over HTTP — see README for the
        POST /analyze endpoint.

        <b>What to set up so every feature works</b>
        • OPENAI_API_KEY — for AI answers (default model o1).
          Without it I still run, but answers come from simple mode.
          Any OpenAI-compatible API works — set OPENAI_BASE_URL and
          OPENAI_MODEL in .env (a free provider works too, see README).
        • Only public http/https pages can be analyzed. Private,
        localhost, and internal addresses are refused on purpose.
      </g-message>
      <g-message lang="id">
        <b>🆘 Bantuan — Page Roast</b>

        <b>Cara kerja</b>
        Kirim URL landing page — pakai bahasa Inggris atau Indonesia —
        dan aku akan mengambil halamannya, me-roast seperti pakar CRO
        profesional, lalu memberi 10 cara konkret dan personal untuk
        menaikkan conversion rate kamu. Aku hanya membaca halaman publik;
        aku tidak pernah mengubah apa pun di sana.

        <b>Contoh</b>
        /analyze https://yuzuu.co
        https://example.com

        <b>Perintah</b>
        Semua perintah memakai bahasa Inggris. Balasannya bilingual —
        bahasa Inggris sebagai default, bahasa Indonesia kalau kamu pilih
        lewat /language.
        /start — perkenalan &amp; menu utama
        /analyze &lt;url&gt; — roast sebuah landing page
        /language — ganti bahasa (English / Indonesia)
        /forget — hapus analisis terakhirmu
        /help — halaman ini

        <b>Endpoint HTTP</b>
        Analisis yang sama tersedia lewat HTTP — lihat README untuk
        endpoint POST /analyze.

        <b>Yang perlu disiapkan supaya semua fitur jalan</b>
        • OPENAI_API_KEY — untuk jawaban AI (model default o1).
          Tanpa ini aku tetap jalan, tapi jawabannya dari mode sederhana.
          API apa pun yang kompatibel dengan OpenAI bisa dipakai — atur
          OPENAI_BASE_URL dan OPENAI_MODEL di .env (provider gratis pun
          bisa, lihat README).
        • Hanya halaman http/https publik yang bisa dianalisis. Alamat
          privat, localhost, dan internal sengaja ditolak.
      </g-message>
    </g-base>
  `
}
