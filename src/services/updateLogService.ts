import { updateLogs } from '../data/updateLogs'
import type { UpdateLog } from '../types/updateLog'

export const updateLogService = {
  async getRecentUpdateLogs(limit = 3): Promise<UpdateLog[]> {
    return [...updateLogs]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit)
  },
}

