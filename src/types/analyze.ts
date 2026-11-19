/** One finished landing-page analysis (Telegram history + HTTP endpoint). */
export interface IAnalysis {
  url: string
  host: string
  title: string
  roast: string
  recommendations: string[]
  createdAt: string
}
