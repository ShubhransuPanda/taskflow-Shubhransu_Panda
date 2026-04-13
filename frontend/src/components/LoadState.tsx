import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material'
import { memo } from 'react'

function LoadStateBase({ message = 'Loading...' }: { message?: string }) {
  return (
    <Stack
      spacing={2}
      sx={{ py: 8, alignItems: 'center', justifyContent: 'center' }}
    >
      <CircularProgress />
      <Typography color="text.secondary">{message}</Typography>
    </Stack>
  )
}

function ErrorStateBase({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <Box sx={{ py: 4 }}>
      <Alert
        severity="error"
        action={
          onRetry ? (
            <Typography
              component="button"
              onClick={onRetry}
              sx={{
                border: 0,
                background: 'none',
                color: 'inherit',
                textDecoration: 'underline',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              Retry
            </Typography>
          ) : null
        }
      >
        {message}
      </Alert>
    </Box>
  )
}

export const LoadState = memo(LoadStateBase)
export const ErrorState = memo(ErrorStateBase)
