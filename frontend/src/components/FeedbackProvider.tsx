import { Alert, Snackbar } from '@mui/material'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type FeedbackLevel = 'success' | 'error' | 'info'

interface FeedbackContextValue {
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showInfo: (message: string) => void
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [level, setLevel] = useState<FeedbackLevel>('info')

  const show = useCallback((nextLevel: FeedbackLevel, nextMessage: string) => {
    setLevel(nextLevel)
    setMessage(nextMessage)
    setOpen(true)
  }, [])

  const value = useMemo(
    () => ({
      showSuccess: (nextMessage: string) => show('success', nextMessage),
      showError: (nextMessage: string) => show('error', nextMessage),
      showInfo: (nextMessage: string) => show('info', nextMessage),
    }),
    [show],
  )

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={3500}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          severity={level}
          variant="filled"
          onClose={() => setOpen(false)}
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  const context = useContext(FeedbackContext)
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider')
  }
  return context
}
