'use client'

import { Fragment, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LanguageFlag } from '@/types'

interface Props {
  flags: LanguageFlag[]
}

export function LanguageFlags({ flags }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (flags.length === 0) {
    return (
      <p className="text-text-muted text-sm py-8 text-center">
        No language or formatting changes flagged.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-dark">
        <thead>
          <tr>
            <th className="w-6"></th>
            <th>Statement</th>
            <th>Location</th>
            <th>Flag Type</th>
            <th>Change Description</th>
            <th>ASC Reference</th>
            <th>Requires Attention</th>
          </tr>
        </thead>
        <tbody>
          {flags.map((f) => {
            const isOpen = expanded.has(f.id)
            return (
              <Fragment key={f.id}>
                <tr
                  onClick={() => toggle(f.id)}
                  className="cursor-pointer"
                >
                  <td className="text-text-muted">
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </td>
                  <td className="text-text-secondary">{f.statement}</td>
                  <td className="text-text-primary">{f.location}</td>
                  <td className="text-text-secondary">{f.flag_type}</td>
                  <td className="text-text-secondary text-xs max-w-md">
                    {f.current_year_text.length > 80
                      ? `${f.current_year_text.slice(0, 80)}…`
                      : f.current_year_text}
                  </td>
                  <td className="text-text-muted font-mono text-xs">{f.asc_reference || '—'}</td>
                  <td>
                    {f.requires_attention ? (
                      <span className="badge text-draft border-draft/30 bg-draft/5">
                        <AlertTriangle className="w-3 h-3" /> Yes
                      </span>
                    ) : (
                      <span className="badge text-text-secondary border-white/10">No</span>
                    )}
                  </td>
                </tr>
                <AnimatePresence>
                  {isOpen && (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <td colSpan={7} className={cn('bg-surface-900')}>
                        <div className="p-4 space-y-3 text-xs leading-relaxed">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-label uppercase tracking-widest text-data-positive mb-1">Prior Year</div>
                              <div className="text-text-secondary whitespace-pre-wrap">{f.prior_year_text || '—'}</div>
                            </div>
                            <div>
                              <div className="text-label uppercase tracking-widest text-draft mb-1">Current Year</div>
                              <div className="text-text-secondary whitespace-pre-wrap">{f.current_year_text || '—'}</div>
                            </div>
                          </div>
                          <div>
                            <div className="text-label uppercase tracking-widest text-text-label mb-1">Assessment</div>
                            <div className="text-text-primary">{f.assessment}</div>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
