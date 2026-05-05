'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useDraftLens } from '@/hooks/useDraftLens'
import { UploadScreen } from '@/components/upload/UploadScreen'
import { SummaryDashboard } from '@/components/dashboard/SummaryDashboard'
import { ExpansionView } from '@/components/expansion/ExpansionView'
import { ChatInterface } from '@/components/chat/ChatInterface'

export default function Home() {
  const {
    appState,
    analysis,
    conversationHistory,
    isChatOpen,
    isExpansionOpen,
    error,
    analyzeDocuments,
    sendChatMessage,
    toggleChat,
    toggleExpansion,
    reset,
    clearError,
  } = useDraftLens()

  const isReady = appState === 'ready' && analysis !== null

  return (
    <main className="relative min-h-screen">
      <AnimatePresence mode="wait">
        {!isReady && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <UploadScreen
              onAnalyze={analyzeDocuments}
              appState={appState}
              error={error}
              onClearError={clearError}
            />
          </motion.div>
        )}

        {isReady && analysis && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SummaryDashboard
              analysis={analysis}
              onReset={reset}
              onOpenExpansion={toggleExpansion}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isReady && analysis && (
        <ExpansionView
          isOpen={isExpansionOpen}
          onClose={toggleExpansion}
          analysis={analysis}
        />
      )}

      <ChatInterface
        isOpen={isChatOpen}
        onToggle={toggleChat}
        onSendMessage={sendChatMessage}
        conversationHistory={conversationHistory}
        isAnalysisReady={isReady}
      />
    </main>
  )
}
