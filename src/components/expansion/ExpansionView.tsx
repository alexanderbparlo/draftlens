'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Analysis, DiffSection, StatementType } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  analysis: Analysis
}

export function ExpansionView({ isOpen, onClose, analysis }: Props) {
  const sectionsByStatement = useMemo(() => {
    const map = new Map<StatementType, DiffSection[]>()
    for (const s of analysis.diff_sections ?? []) {
      const arr = map.get(s.statement) ?? []
      arr.push(s)
      map.set(s.statement, arr)
    }
    return map
  }, [analysis.diff_sections])

  const statements = useMemo(() => Array.from(sectionsByStatement.keys()), [sectionsByStatement])
  const [activeStatement, setActiveStatement] = useState<StatementType | null>(null)

  useEffect(() => {
    if (statements.length > 0 && (activeStatement === null || !statements.includes(activeStatement))) {
      setActiveStatement(statements[0])
    }
  }, [statements, activeStatement])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const activeSections = activeStatement ? sectionsByStatement.get(activeStatement) ?? [] : []

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-surface-950/95 backdrop-blur-sm flex flex-col"
        >
          {/* Header */}
          <div className="panel rounded-none border-x-0 border-t-0 px-6 py-3 flex items-center gap-4">
            <h2 className="font-display text-base font-600 text-text-primary">
              Side-by-Side Comparison
            </h2>
            <span className="text-text-muted text-xs">·</span>
            <span className="text-xs text-text-secondary font-mono">
              {analysis.metadata.prior_year_period} → {analysis.metadata.current_year_period}
            </span>
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>

          {statements.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-text-muted text-sm">
                No diff sections available for this analysis.
              </p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="px-6 pt-3 border-b border-white/5 flex gap-1 overflow-x-auto">
                {statements.map((s) => {
                  const sections = sectionsByStatement.get(s) ?? []
                  const changed = sections.filter((x) => x.has_changes).length
                  const isActive = s === activeStatement
                  return (
                    <button
                      key={s}
                      onClick={() => setActiveStatement(s)}
                      className={cn(
                        'px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors',
                        isActive
                          ? 'border-accent text-text-primary'
                          : 'border-transparent text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {s}
                      {changed > 0 && (
                        <span className="ml-2 text-draft text-[10px] font-mono">
                          {changed} changed
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Split view */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="grid grid-cols-2 gap-4 mb-3 sticky top-0 bg-surface-950/90 backdrop-blur py-2 z-10">
                  <div className="flex items-center gap-2">
                    <span className="badge text-data-positive border-data-positive/30 bg-data-positive/5">
                      PRIOR YEAR
                    </span>
                    <span className="text-text-muted text-xs font-mono">
                      {analysis.metadata.prior_year_period}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge text-draft border-draft/30 bg-draft/5">
                      CURRENT DRAFT
                    </span>
                    <span className="text-text-muted text-xs font-mono">
                      {analysis.metadata.current_year_period}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  {activeSections.map((section, idx) => (
                    <div key={idx}>
                      <h3 className="font-display text-sm font-600 text-text-primary mb-2">
                        {section.section_title}
                      </h3>
                      {section.has_changes && section.change_summary && (
                        <p className="text-xs text-draft mb-2 italic">
                          {section.change_summary}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div
                          className={cn(
                            'card p-3 text-xs leading-relaxed whitespace-pre-wrap text-text-secondary',
                            section.has_changes && 'diff-changed'
                          )}
                        >
                          {section.prior_year_content || '—'}
                        </div>
                        <div
                          className={cn(
                            'card p-3 text-xs leading-relaxed whitespace-pre-wrap text-text-secondary',
                            section.has_changes && 'diff-changed'
                          )}
                        >
                          {section.current_year_content || '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
