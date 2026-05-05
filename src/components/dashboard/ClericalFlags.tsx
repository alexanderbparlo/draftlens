'use client'

import type { ClericalFlag } from '@/types'

interface Props {
  flags: ClericalFlag[]
}

export function ClericalFlags({ flags }: Props) {
  if (flags.length === 0) {
    return (
      <p className="text-text-muted text-sm py-8 text-center">
        No clerical issues identified in the current draft.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-dark">
        <thead>
          <tr>
            <th>Statement</th>
            <th>Location</th>
            <th>Flag Type</th>
            <th>Description</th>
            <th>Current Year Text</th>
            <th>Suggested Correction</th>
          </tr>
        </thead>
        <tbody>
          {flags.map((f) => (
            <tr key={f.id}>
              <td className="text-text-secondary">{f.statement}</td>
              <td className="text-text-primary">{f.location}</td>
              <td className="text-text-secondary">{f.flag_type}</td>
              <td className="text-text-secondary text-xs leading-relaxed max-w-sm">
                {f.description}
              </td>
              <td className="text-text-muted text-xs font-mono max-w-xs">
                {f.current_year_text || '—'}
              </td>
              <td className="text-data-positive text-xs leading-relaxed max-w-sm">
                {f.suggested_correction || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
