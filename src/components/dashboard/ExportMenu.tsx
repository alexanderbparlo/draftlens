'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, FileDown, Printer, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  combinedCSV,
  varianceCSV,
  languageCSV,
  clericalCSV,
  downloadCSV,
  exportFilename,
} from '@/lib/export'
import type { Analysis } from '@/types'

interface Props {
  analysis: Analysis
}

export function ExportMenu({ analysis }: Props) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const items: { label: string; onClick: () => void; icon: React.ReactNode; hint?: string }[] = [
    {
      label: 'All flags (combined CSV)',
      onClick: () => downloadCSV(exportFilename(analysis, 'all-flags'), combinedCSV(analysis)),
      icon: <FileDown className="w-3.5 h-3.5" />,
    },
    {
      label: 'Variance flags (CSV)',
      onClick: () => downloadCSV(exportFilename(analysis, 'variance'), varianceCSV(analysis)),
      icon: <FileDown className="w-3.5 h-3.5" />,
      hint: `${analysis.variance_flags.length}`,
    },
    {
      label: 'Language flags (CSV)',
      onClick: () => downloadCSV(exportFilename(analysis, 'language'), languageCSV(analysis)),
      icon: <FileDown className="w-3.5 h-3.5" />,
      hint: `${analysis.language_flags.length}`,
    },
    {
      label: 'Clerical flags (CSV)',
      onClick: () => downloadCSV(exportFilename(analysis, 'clerical'), clericalCSV(analysis)),
      icon: <FileDown className="w-3.5 h-3.5" />,
      hint: `${analysis.clerical_flags.length}`,
    },
    {
      label: 'Print / Save as PDF',
      onClick: () => window.print(),
      icon: <Printer className="w-3.5 h-3.5" />,
    },
  ]

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="w-3.5 h-3.5" /> Export
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 panel min-w-[240px] py-1"
        >
          {items.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-xs text-left',
                'text-text-secondary hover:bg-accent/5 hover:text-text-primary transition-colors'
              )}
            >
              <span className="text-text-muted">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.hint !== undefined && (
                <span className="text-text-muted font-mono">{item.hint}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
