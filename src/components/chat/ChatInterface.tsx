'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'

interface ChatInterfaceProps {
  isOpen: boolean
  onToggle: () => void
  onSendMessage: (message: string) => Promise<void>
  conversationHistory: ChatMessage[]
  isAnalysisReady: boolean
}

const SUGGESTIONS = [
  'Explain the largest variance on the Balance Sheet',
  'Is the change in Note 3 footnote language consistent with ASC 946?',
  'What should I check to resolve the management fee variance?',
  'Are there any items I should prioritize before sending this draft to the auditor?',
]

export function ChatInterface({
  isOpen,
  onToggle,
  onSendMessage,
  conversationHistory,
  isAnalysisReady,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationHistory])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  const handleSend = useCallback(async () => {
    const message = input.trim()
    if (!message || isSending || !isAnalysisReady) return
    setInput('')
    setIsSending(true)
    try {
      await onSendMessage(message)
    } finally {
      setIsSending(false)
    }
  }, [input, isSending, isAnalysisReady, onSendMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasUserMessages = conversationHistory.some((m) => m.role === 'user')

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'fixed z-40 panel flex flex-col overflow-hidden no-print',
              'inset-x-3 bottom-20 top-16',
              'sm:inset-auto sm:bottom-20 sm:right-6 sm:top-auto',
              'sm:w-[420px] sm:h-[600px]',
              'sm:max-h-[calc(100vh-7rem)]'
            )}
          >
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/5 shrink-0">
              <div className="w-6 h-6 bg-accent/10 border border-accent/20 rounded-sm flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-600 text-text-primary font-display">DraftLens AI</p>
                <p className="text-[10px] text-text-muted">Claude Opus 4.7</p>
              </div>
              <button
                onClick={onToggle}
                className="text-text-muted hover:text-text-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {!hasUserMessages && isAnalysisReady && (
                <div className="space-y-3">
                  <p className="text-text-muted text-xs text-center">
                    Ask anything about the comparison
                  </p>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className={cn(
                        'w-full text-left text-xs px-3 py-2 rounded-sm',
                        'border border-white/5 text-text-secondary',
                        'hover:border-accent/20 hover:text-text-primary hover:bg-accent/5',
                        'transition-all duration-150'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {!isAnalysisReady && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-text-muted text-sm text-center px-4">
                    Run a comparison to begin the conversation
                  </p>
                </div>
              )}

              {conversationHistory.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'flex gap-2',
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-sm flex items-center justify-center shrink-0 mt-0.5',
                      msg.role === 'user'
                        ? 'bg-accent/10 border border-accent/20'
                        : 'bg-white/4 border border-white/8'
                    )}
                  >
                    {msg.role === 'user' ? (
                      <User className="w-3 h-3 text-accent" />
                    ) : (
                      <Bot className="w-3 h-3 text-text-secondary" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'flex-1 px-3 py-2 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'chat-bubble-user text-text-primary'
                        : 'chat-bubble-assistant text-text-secondary'
                    )}
                  >
                    {msg.content.startsWith('Error:') ? (
                      <span className="text-data-negative">{msg.content}</span>
                    ) : (
                      msg.content
                    )}
                  </div>
                </motion.div>
              ))}

              {isSending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-5 h-5 bg-white/4 border border-white/8 rounded-sm flex items-center justify-center">
                    <Bot className="w-3 h-3 text-text-secondary" />
                  </div>
                  <div className="chat-bubble-assistant px-3 py-2 flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse-slow"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="px-3 py-3 border-t border-white/5 shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isAnalysisReady ? 'Ask about the comparison...' : 'Run a comparison first'
                  }
                  disabled={!isAnalysisReady || isSending}
                  rows={1}
                  className={cn(
                    'input-dark flex-1 px-3 py-2 text-sm resize-none',
                    'placeholder:text-text-muted',
                    'max-h-32 overflow-y-auto',
                    (!isAnalysisReady || isSending) && 'opacity-50 cursor-not-allowed'
                  )}
                  style={{ minHeight: '38px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || !isAnalysisReady || isSending}
                  className={cn(
                    'btn-primary p-2.5 shrink-0',
                    'flex items-center justify-center',
                    (!input.trim() || !isAnalysisReady || isSending) &&
                      'opacity-40 cursor-not-allowed'
                  )}
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-text-muted mt-2 text-center">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3, type: 'spring' }}
        onClick={onToggle}
        className={cn(
          'fixed bottom-6 right-6 z-50 no-print',
          'w-12 h-12 rounded-sm',
          'flex items-center justify-center',
          'transition-all duration-200',
          isOpen
            ? 'bg-surface-900 border border-accent/30 text-accent'
            : 'bg-accent text-surface-950 hover:bg-accent-dim',
          'shadow-panel'
        )}
        title={isOpen ? 'Close chat' : 'Open AI assistant'}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageSquare className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>

        {!isOpen && isAnalysisReady && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-draft rounded-full border-2 border-surface-950" />
        )}
      </motion.button>
    </>
  )
}
