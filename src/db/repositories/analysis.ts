import type {LmdbEnvSub} from "@gramstax/lmdb"
import type {IAnalysis} from "~/types/analyze"
import type {IVAnalysis, AnalysisSchema} from "../schema/analysis"

/** Recent analyses: the last 5 per user, newest first. */
export const ANALYSES_MAX = 5

export class AnalysisRepository {
  constructor(private readonly _sub: LmdbEnvSub<typeof AnalysisSchema>) {}

  list(userId: number): IAnalysis[] {
    const row = this._sub.get(userId)
    if (!row) return []
    try {
      const parsed = JSON.parse(row.analysesJson) as IAnalysis[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  /** Add one analysis, keep only the newest 5. Read-then-write in a transaction. */
  async add(userId: number, analysis: IAnalysis): Promise<IAnalysis[]> {
    return this._sub.owner.transaction(() => {
      const kept = [analysis, ...this.list(userId)].slice(0, ANALYSES_MAX)
      this.saveSync(userId, kept)
      return kept
    })
  }

  async clear(userId: number): Promise<void> {
    await this._sub.owner.transaction(() => {
      this.saveSync(userId, [])
    })
  }

  private saveSync(userId: number, analyses: IAnalysis[]): void {
    const row = {analysesJson: JSON.stringify(analyses), updatedAt: new Date()} as IVAnalysis
    this._sub.putSync(userId, row)
  }
}
