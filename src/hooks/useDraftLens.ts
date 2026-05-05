'use client'

import { useState, useCallback } from 'react'
import { fileToBase64, validateDocumentFile } from '@/lib/utils'
import { SUPPORTED_BASES } from '@/types'
import type {
  Analysis,
  UIState,
  ChatMessage,
  UploadedDocument,
  BasisOfAccounting,
  VarianceThresholds,
} from '@/types'

const initialState: UIState = {
  appState: 'idle',
  analysis: null,
  conversationHistory: [],
  isChatOpen: false,
  isExpansionOpen: false,
  error: null,
}

const ANALYZE_TIMEOUT_MS = 240_000  // 4 min — two large docs + extended thinking
const CHAT_TIMEOUT_MS = 60_000

export interface AnalyzeArgs {
  priorYearFile: File
  currentYearFile: File
  basis: BasisOfAccounting
  userNotes: string
  thresholds: VarianceThresholds
}

export function useDraftLens() {
  const [state, setState] = useState<UIState>(initialState)

  const analyzeDocuments = useCallback(async (args: AnalyzeArgs) => {
    const { priorYearFile, currentYearFile, basis, userNotes, thresholds } = args

    if (!SUPPORTED_BASES.includes(basis)) {
      setState((prev) => ({
        ...prev,
        appState: 'error',
        error: 'DraftLens currently supports U.S. GAAP only.',
      }))
      return
    }

    for (const f of [priorYearFile, currentYearFile]) {
      const v = validateDocumentFile(f)
      if (!v.valid) {
        setState((prev) => ({ ...prev, appState: 'error', error: v.error ?? 'Invalid file.' }))
        return
      }
    }

    setState((prev) => ({ ...prev, appState: 'uploading', error: null }))

    let prior: UploadedDocument
    let current: UploadedDocument
    try {
      prior = {
        name: priorYearFile.name,
        type: priorYearFile.type,
        data: await fileToBase64(priorYearFile),
      }
      current = {
        name: currentYearFile.name,
        type: currentYearFile.type,
        data: await fileToBase64(currentYearFile),
      }
    } catch {
      setState((prev) => ({
        ...prev,
        appState: 'error',
        error: 'Failed to read file(s). Please try again.',
      }))
      return
    }

    setState((prev) => ({ ...prev, appState: 'analyzing' }))

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prior_year_document: prior,
          current_year_document: current,
          basis_of_accounting: basis,
          user_notes: userNotes,
          thresholds,
        }),
        signal: controller.signal,
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? `HTTP ${response.status}`)
      }

      const analysis: Analysis = result.data

      const initialMessages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Compare the prior year and current year financial statements.',
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: analysis.chat_response,
          timestamp: new Date().toISOString(),
        },
      ]

      setState((prev) => ({
        ...prev,
        appState: 'ready',
        analysis,
        conversationHistory: initialMessages,
        isChatOpen: false,
        isExpansionOpen: false,
        error: null,
      }))
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      const message = isAbort
        ? 'Analysis timed out after 4 minutes. Please try again with smaller documents.'
        : err instanceof Error
          ? err.message
          : 'Analysis failed.'
      setState((prev) => ({ ...prev, appState: 'error', error: message }))
    } finally {
      clearTimeout(timeoutId)
    }
  }, [])

  const sendChatMessage = useCallback(
    async (message: string) => {
      if (!state.analysis || !message.trim()) return

      const userMessage: ChatMessage = {
        role: 'user',
        content: message.trim(),
        timestamp: new Date().toISOString(),
      }

      setState((prev) => ({
        ...prev,
        conversationHistory: [...prev.conversationHistory, userMessage],
      }))

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS)

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            current_analysis: state.analysis,
            conversation_history: state.conversationHistory,
          }),
          signal: controller.signal,
        })

        const result = await response.json()
        if (!response.ok || !result.success) {
          throw new Error(result.error ?? `HTTP ${response.status}`)
        }

        const updated: Analysis = result.data
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: updated.chat_response,
          timestamp: new Date().toISOString(),
        }

        setState((prev) => ({
          ...prev,
          analysis: updated,
          conversationHistory: [...prev.conversationHistory, assistantMessage],
        }))
      } catch (err) {
        const isAbort = err instanceof DOMException && err.name === 'AbortError'
        const errorMessage = isAbort
          ? 'Request timed out after 60 seconds. Please try again.'
          : err instanceof Error
            ? err.message
            : 'Chat failed.'
        const errorChatMessage: ChatMessage = {
          role: 'assistant',
          content: `Error: ${errorMessage}`,
          timestamp: new Date().toISOString(),
        }
        setState((prev) => ({
          ...prev,
          conversationHistory: [...prev.conversationHistory, errorChatMessage],
        }))
      } finally {
        clearTimeout(timeoutId)
      }
    },
    [state.analysis, state.conversationHistory]
  )

  const toggleChat = useCallback(() => {
    setState((prev) => ({ ...prev, isChatOpen: !prev.isChatOpen }))
  }, [])

  const toggleExpansion = useCallback(() => {
    setState((prev) => ({ ...prev, isExpansionOpen: !prev.isExpansionOpen }))
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, appState: 'idle' }))
  }, [])

  return {
    appState: state.appState,
    analysis: state.analysis,
    conversationHistory: state.conversationHistory,
    isChatOpen: state.isChatOpen,
    isExpansionOpen: state.isExpansionOpen,
    error: state.error,
    analyzeDocuments,
    sendChatMessage,
    toggleChat,
    toggleExpansion,
    reset,
    clearError,
  }
}
