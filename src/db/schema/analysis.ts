import type {ValueOf} from "@gramstax/lmdb"
import {LmdbSchema, t} from "@gramstax/lmdb"

export type IVAnalysis = ValueOf<typeof AnalysisSchema>

/**
 * Recent analyses: one row per user holding the last 5 analyses
 * (url + roast + recommendations) as JSON. The original flow has no
 * memory node — this is only a convenience history so /forget has
 * something real to erase and users can re-read a past roast.
 */
export class AnalysisSchema extends LmdbSchema {
  static db = `analyses`
  static key = t.number()
  static value = {
    analysesJson: t.string(),
    updatedAt: t.date().$defaultFn(() => new Date()),
  }
}
