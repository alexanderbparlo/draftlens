'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, SplitSquareHorizontal, AlertTriangle } from 'lucide-react'
import { cn, confidenceColor, formatCurrencyExact } from '@/lib/utils'
import { VarianceTable } from './VarianceTable'
import { LanguageFlags } from './LanguageFlags'
import { ClericalFlags } from './ClericalFlags'
import { AgentNotes } from './AgentNotes'
import { ExportMenu } from './ExportMenu'
import type { Analysis } from '@/types'

interface Props {
  analysis: Analysis
  onReset: () => void
  onOpenExpansion: () => void
}

export function SummaryDashboard({ analysis, onReset, onOpenExpansion }: Props) {
  const m = analysis.metadata
  const varianceCount = analysis.variance_flags.length
  const languageCount = analysis.language_flags.length
  const clericalCount = analysis.clerical_flags.length

  return (
    <div className="px-4 py-4 pb-24 max-w-screen-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="panel p-4 mb-4"
      >
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={onReset}
            className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5 no-print"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> New comparison
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-lg font-700 text-text-primary truncate">
                {m.fund_name || 'Unnamed Fund'}
              </h1>
              <span className="text-text-muted text-xs">·</span>
              <span className="text-xs text-text-secondary font-mono">
                {m.prior_year_period || '—'} → {m.current_year_period || '—'}
              </span>
              <span className="text-text-muted text-xs">·</span>
              <span className="text-xs text-text-secondary">{m.basis_of_accounting}</span>
            </div>
            {m.fund_type && (
              <p className="text-text-muted text-xs mt-0.5">{m.fund_type}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('badge', confidenceColor(m.extraction_confidence as 'High' | 'Medium' | 'Low'))}>
              {m.extraction_confidence} confidence
            </span>
            <span className="badge text-data-negative border-data-negative/30 bg-data-negative/5">
              Variance: {varianceCount}
            </span>
            <span className="badge text-draft border-draft/30 bg-draft/5">
              Language: {languageCount}
            </span>
            <span className="badge text-accent border-accent/30 bg-accent/5">
              Clerical: {clericalCount}
            </span>

            <button
              onClick={onOpenExpansion}
              className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5 no-print"
            >
              <SplitSquareHorizontal className="w-3.5 h-3.5" /> View Side-by-Side Comparison
            </button>

            <span className="no-print">
              <ExportMenu analysis={analysis} />
            </span>
          </div>
        </div>

        {/* Threshold + PC/NAV strip */}
        <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-text-muted">
          <span>
            PC/NAV (current):{' '}
            <span className="text-text-secondary data-value">
              {formatCurrencyExact(m.total_partners_capital_current_year)}
            </span>
          </span>
          <span>
            Percent threshold:{' '}
            <span className="text-text-secondary data-value">
              {(m.thresholds_applied.percent * 100).toFixed(2)}%
            </span>
          </span>
          <span>
            Dollar threshold:{' '}
            <span className="text-text-secondary data-value">
              {formatCurrencyExact(m.thresholds_applied.computed_dollar)}
              {m.thresholds_applied.dollar_override !== null && (
                <span className="text-draft ml-1">(override)</span>
              )}
            </span>
          </span>
          {m.thresholds_applied.fallback_active && (
            <span className="text-draft flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              PC/NAV not extracted — flagging on percent threshold only
            </span>
          )}
        </div>
      </motion.div>

      {/* Initial chat summary */}
      {analysis.chat_response && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="card p-4 mb-4"
        >
          <p className="text-sm text-text-primary leading-relaxed">
            {analysis.chat_response}
          </p>
        </motion.div>
      )}

      {/* Three flag panels */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="space-y-4"
      >
        <Section title="Variance Flags" count={varianceCount}>
          <VarianceTable flags={analysis.variance_flags} />
        </Section>

        <Section title="Language & Formatting Flags" count={languageCount}>
          <LanguageFlags flags={analysis.language_flags} />
        </Section>

        <Section title="Clerical Flags" count={clericalCount}>
          <ClericalFlags flags={analysis.clerical_flags} />
        </Section>

        <Section title="Agent Notes" count={analysis.agent_notes.length}>
          <AgentNotes notes={analysis.agent_notes} />
        </Section>

        {m.user_notes_acknowledged && (
          <Section title="User Notes Acknowledged">
            <p className="text-sm text-text-secondary leading-relaxed p-2">
              {m.user_notes_acknowledged}
            </p>
          </Section>
        )}
      </motion.div>
    </div>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm font-600 text-text-primary">{title}</h2>
        {count !== undefined && (
          <span className="text-text-muted text-xs font-mono">{count}</span>
        )}
      </div>
      <div className="accent-line mb-3" />
      {children}
    </div>
  )
}
