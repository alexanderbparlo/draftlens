'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatCurrency, formatPercent, severityClass, severityRank } from '@/lib/utils'
import type { VarianceFlag } from '@/types'

type SortKey = 'severity' | 'pc_nav_percent' | 'percent_change' | 'dollar_change'
type SortDir = 'asc' | 'desc'

interface Props {
  flags: VarianceFlag[]
}

export function VarianceTable({ flags }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('severity')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const sorted = useMemo(() => {
    const copy = [...flags]
    copy.sort((a, b) => {
      let av: number, bv: number
      switch (sortKey) {
        case 'severity':
          av = severityRank(a.severity); bv = severityRank(b.severity)
          break
        case 'pc_nav_percent':
          av = a.pc_nav_percent ?? -Infinity; bv = b.pc_nav_percent ?? -Infinity
          break
        case 'percent_change':
          av = a.percent_change ?? -Infinity; bv = b.percent_change ?? -Infinity
          break
        case 'dollar_change':
          av = a.dollar_change ?? -Infinity; bv = b.dollar_change ?? -Infinity
          break
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [flags, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir(key === 'severity' ? 'asc' : 'desc') }
  }

  if (flags.length === 0) {
    return (
      <p className="text-text-muted text-sm py-8 text-center">
        No material variances flagged.
      </p>
    )
  }

  const sortIcon = (active: boolean) =>
    active ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null

  return (
    <div className="overflow-x-auto">
      <table className="table-dark">
        <thead>
          <tr>
            <th>Statement</th>
            <th>Line Item</th>
            <th className="text-right">Prior Year</th>
            <th className="text-right">Current Year</th>
            <th className="text-right">
              <button
                onClick={() => toggleSort('dollar_change')}
                className="inline-flex items-center gap-1 hover:text-text-primary"
              >
                $ Change {sortIcon(sortKey === 'dollar_change')}
              </button>
            </th>
            <th className="text-right">
              <button
                onClick={() => toggleSort('percent_change')}
                className="inline-flex items-center gap-1 hover:text-text-primary"
              >
                % Change {sortIcon(sortKey === 'percent_change')}
              </button>
            </th>
            <th className="text-right">
              <button
                onClick={() => toggleSort('pc_nav_percent')}
                className="inline-flex items-center gap-1 hover:text-text-primary"
              >
                % of PC/NAV {sortIcon(sortKey === 'pc_nav_percent')}
              </button>
            </th>
            <th>
              <button
                onClick={() => toggleSort('severity')}
                className="inline-flex items-center gap-1 hover:text-text-primary"
              >
                Severity {sortIcon(sortKey === 'severity')}
              </button>
            </th>
            <th>Drill-Down Guidance</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((f) => (
            <tr key={f.id}>
              <td className="text-text-secondary">{f.statement}</td>
              <td className="text-text-primary">{f.line_item}</td>
              <td className="text-right data-value">{formatCurrency(f.prior_year_value)}</td>
              <td className="text-right data-value">{formatCurrency(f.current_year_value)}</td>
              <td
                className={cn(
                  'text-right data-value',
                  f.dollar_change !== null && f.dollar_change < 0 && 'text-data-negative',
                  f.dollar_change !== null && f.dollar_change > 0 && 'text-data-positive'
                )}
              >
                {formatCurrency(f.dollar_change)}
              </td>
              <td className="text-right data-value">{formatPercent(f.percent_change)}</td>
              <td className="text-right data-value">{formatPercent(f.pc_nav_percent)}</td>
              <td>
                <span className={cn('badge', severityClass(f.severity))}>{f.severity}</span>
              </td>
              <td className="text-text-secondary text-xs leading-relaxed max-w-xs">
                {f.drill_down_guidance}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
