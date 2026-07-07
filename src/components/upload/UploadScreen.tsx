'use client'

import { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  X,
  Zap,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { cn, validateDocumentFile } from '@/lib/utils'
import {
  BASIS_OPTIONS,
  SUPPORTED_BASES,
  UNSUPPORTED_BASIS_MESSAGE,
  type BasisOfAccounting,
  type VarianceThresholds,
} from '@/types'
import type { AnalyzeArgs } from '@/hooks/useDraftLens'

interface UploadScreenProps {
  onAnalyze: (args: AnalyzeArgs) => void | Promise<void>
  appState: string
  error: string | null
  onClearError: () => void
}

interface DropZoneProps {
  variant: 'prior' | 'current'
  label: string
  badge: string
  file: File | null
  onSelect: (file: File) => void
  onClear: () => void
  fileError: string | null
}

function DropZone({ variant, label, badge, file, onSelect, onClear, fileError }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    onSelect(files[0])
  }

  const variantClass = variant === 'prior' ? 'drop-zone-prior' : 'drop-zone-current'
  const badgeClass =
    variant === 'prior'
      ? 'text-data-positive border-data-positive/30 bg-data-positive/5'
      : 'text-draft border-draft/30 bg-draft/5'

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-label uppercase tracking-widest text-text-label">{label}</span>
        <span className={cn('badge', badgeClass)}>{badge}</span>
      </div>

      <div
        className={cn(
          'drop-zone',
          variantClass,
          'p-6 text-center cursor-pointer flex-1 flex flex-col items-center justify-center min-h-[180px]',
          dragOver && 'drag-over'
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />

        {file ? (
          <div className="w-full flex items-center gap-2.5">
            <CheckCircle2
              className={cn(
                'w-4 h-4 shrink-0',
                variant === 'prior' ? 'text-data-positive' : 'text-draft'
              )}
            />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-mono text-text-primary truncate">{file.name}</p>
              <p className="text-xs text-text-muted font-mono">
                {(file.size / 1024 / 1024).toFixed(2)}MB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
              className="text-text-muted hover:text-data-negative transition-colors shrink-0"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload
              className={cn(
                'w-7 h-7',
                variant === 'prior' ? 'text-data-positive/60' : 'text-draft/60'
              )}
            />
            <div>
              <p className="text-text-primary font-500 text-sm">Drop file here</p>
              <p className="text-text-muted text-xs mt-0.5">PDF or Word · up to 10MB</p>
            </div>
          </div>
        )}
      </div>

      {fileError && (
        <p className="mt-1.5 text-data-negative text-xs flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {fileError}
        </p>
      )}
    </div>
  )
}

export function UploadScreen({
  onAnalyze,
  appState,
  error,
  onClearError,
}: UploadScreenProps) {
  const [priorFile, setPriorFile] = useState<File | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [priorError, setPriorError] = useState<string | null>(null)
  const [currentError, setCurrentError] = useState<string | null>(null)

  const [basis, setBasis] = useState<BasisOfAccounting | null>(null)
  const [percentInput, setPercentInput] = useState('50')
  const [dollarOverride, setDollarOverride] = useState('')
  const [userNotes, setUserNotes] = useState('')

  const isAnalyzing = appState === 'analyzing' || appState === 'uploading'

  const basisIsSupported = basis !== null && SUPPORTED_BASES.includes(basis)
  const basisIsUnsupported = basis !== null && !basisIsSupported

  const handleSelect = (variant: 'prior' | 'current') => (file: File) => {
    const result = validateDocumentFile(file)
    if (variant === 'prior') {
      setPriorError(result.valid ? null : result.error ?? 'Invalid file.')
      if (result.valid) setPriorFile(file)
    } else {
      setCurrentError(result.valid ? null : result.error ?? 'Invalid file.')
      if (result.valid) setCurrentFile(file)
    }
  }

  const thresholds = useMemo<VarianceThresholds>(() => {
    const pct = Number.parseFloat(percentInput)
    const dollar = dollarOverride.trim() === '' ? null : Number.parseFloat(dollarOverride)
    return {
      percent: Number.isFinite(pct) && pct > 0 ? pct / 100 : 0.5,
      pc_nav_percent: 0.05,
      dollar_override: dollar !== null && Number.isFinite(dollar) && dollar > 0 ? dollar : null,
      computed_dollar: null,
      fallback_active: false,
    }
  }, [percentInput, dollarOverride])

  const canAnalyze =
    !!priorFile &&
    !!currentFile &&
    basisIsSupported &&
    !isAnalyzing

  const handleAnalyze = () => {
    if (!canAnalyze || !priorFile || !currentFile) return
    if (basis === null || !SUPPORTED_BASES.includes(basis)) return
    onAnalyze({
      priorYearFile: priorFile,
      currentYearFile: currentFile,
      basis,
      userNotes,
      thresholds,
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center mb-10"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="relative">
            <div className="w-10 h-10 border border-accent/40 rounded-sm flex items-center justify-center">
              <div className="w-5 h-5 border border-accent rounded-sm" />
            </div>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-draft rounded-full animate-pulse-slow" />
          </div>
          <span className="font-display text-2xl font-700 tracking-tight text-text-primary">
            Draft<span className="text-accent">Lens</span>
          </span>
        </div>

        <h1 className="font-display text-4xl font-800 text-text-primary mb-3 tracking-tight">
          Financial Statement Comparison
        </h1>
        <p className="text-text-secondary text-base max-w-xl mx-auto leading-relaxed">
          Compare prior year and current year fund financial statements. Identify material variances,
          language and formatting changes, and clerical errors. Powered by Claude Opus 4.7.
        </p>
      </motion.div>

      {/* Main panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
        className="w-full max-w-3xl"
      >
        <div className="panel p-6 space-y-6">
          {/* 1. Drop zones */}
          <div className="flex flex-col sm:flex-row gap-4">
            <DropZone
              variant="prior"
              label="Prior Year Financial Statements"
              badge="ISSUED / AUDITED"
              file={priorFile}
              onSelect={handleSelect('prior')}
              onClear={() => {
                setPriorFile(null)
                setPriorError(null)
              }}
              fileError={priorError}
            />
            <DropZone
              variant="current"
              label="Current Year Financial Statements"
              badge="CURRENT DRAFT"
              file={currentFile}
              onSelect={handleSelect('current')}
              onClear={() => {
                setCurrentFile(null)
                setCurrentError(null)
              }}
              fileError={currentError}
            />
          </div>

          {/* 2. Basis of accounting */}
          <div>
            <label className="block text-label uppercase tracking-widest text-text-label mb-2">
              Basis of Accounting <span className="text-data-negative normal-case tracking-normal">*</span>
            </label>
            <select
              value={basis ?? ''}
              onChange={(e) => setBasis(e.target.value === '' ? null : (e.target.value as BasisOfAccounting))}
              className={cn(
                'input-dark w-full px-3 py-2.5 text-sm',
                basis === null && 'text-text-muted'
              )}
            >
              <option value="">Select basis of accounting</option>
              {BASIS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                  {SUPPORTED_BASES.includes(opt) ? '' : ' (not yet supported)'}
                </option>
              ))}
            </select>
            <AnimatePresence>
              {basisIsUnsupported && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-2 text-draft text-xs flex items-start gap-1.5"
                >
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{UNSUPPORTED_BASIS_MESSAGE}</span>
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* 3. Materiality thresholds */}
          <div>
            <div className="mb-1">
              <span className="text-label uppercase tracking-widest text-text-label">
                Materiality Thresholds
              </span>
            </div>
            <p className="text-xs text-text-muted mb-3 leading-relaxed">
              By default, variances are flagged when they exceed both 50% of the prior year value
              AND 5% of current year Partner&apos;s Capital / NAV. You may override the
              Partner&apos;s Capital / NAV threshold with a specific dollar amount.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  Flag variances exceeding X% change from prior year
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    step="1"
                    value={percentInput}
                    onChange={(e) => setPercentInput(e.target.value)}
                    className="input-dark w-full px-3 py-2 pr-7 text-sm font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  Override PC/NAV threshold with a fixed dollar amount (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="e.g. 50000"
                    value={dollarOverride}
                    onChange={(e) => setDollarOverride(e.target.value)}
                    className="input-dark w-full pl-7 pr-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {dollarOverride.trim() !== '' && Number.parseFloat(dollarOverride) > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-2 text-draft text-xs"
                >
                  Dollar override active — the 5% of PC/NAV default threshold will not apply.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* 4. Notes */}
          <div>
            <label className="block text-label uppercase tracking-widest text-text-label mb-2">
              Analysis Notes <span className="text-text-muted normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Describe any known changes, missing sections, or context that will help refine the analysis..."
              rows={3}
              className="input-dark w-full px-3 py-2.5 text-sm resize-none placeholder:text-text-muted"
            />
            <ul className="mt-2 space-y-0.5 text-[11px] text-text-muted leading-relaxed">
              <li>· Known formatting or language changes from prior year (e.g. restructured footnotes, reclassified line items)</li>
              <li>· Sections intentionally missing from the current draft</li>
              <li>· Changes in accounting policy or newly adopted ASUs</li>
              <li>· Fund-level events that may explain large variances (e.g. new share classes, restructuring, strategy changes)</li>
            </ul>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 text-data-negative text-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
                <button
                  onClick={onClearError}
                  className="text-text-muted hover:text-text-secondary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 5. Analyze button */}
          <div>
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className={cn(
                'btn-primary w-full py-3 flex items-center justify-center gap-2.5',
                'font-display font-600 text-sm tracking-wide'
              )}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-surface-950/30 border-t-surface-950 rounded-full animate-spin" />
                  <span>
                    {appState === 'uploading'
                      ? 'Encoding documents...'
                      : 'Analyzing with Opus 4.7...'}
                  </span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Compare &amp; Analyze</span>
                </>
              )}
            </button>

            {isAnalyzing && (
              <div className="mt-3 overflow-hidden">
                <div className="analyzing-bar" />
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-text-muted mt-4 leading-relaxed">
          DraftLens is an analytical aid. All findings should be reviewed by a qualified accountant.
        </p>
      </motion.div>
    </div>
  )
}

