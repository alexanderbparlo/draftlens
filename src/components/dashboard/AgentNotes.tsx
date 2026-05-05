'use client'

import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentNote } from '@/types'

interface Props {
  notes: AgentNote[]
}

const CATEGORY_STYLES: Record<AgentNote['category'], string> = {
  Variance: 'border-data-negative/30 text-data-negative',
  Language: 'border-draft/30 text-draft',
  Clerical: 'border-accent/30 text-accent',
  General:  'border-white/10 text-text-secondary',
}

export function AgentNotes({ notes }: Props) {
  if (notes.length === 0) {
    return (
      <p className="text-text-muted text-sm py-8 text-center">
        No additional agent notes.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {notes.map((n) => (
        <div key={n.id} className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-3.5 h-3.5 text-text-muted" />
            <span className={cn('badge', CATEGORY_STYLES[n.category])}>
              {n.category}
            </span>
            {n.related_flag_ids.length > 0 && (
              <span className="text-text-muted text-[10px] font-mono">
                {n.related_flag_ids.join(', ')}
              </span>
            )}
          </div>
          <p className="text-sm text-text-primary leading-relaxed">{n.note}</p>
        </div>
      ))}
    </div>
  )
}
