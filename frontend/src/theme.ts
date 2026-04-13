import { createTheme } from '@mui/material'
import type { ThemeMode } from './types/models'

export const getAppTheme = (mode: ThemeMode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#5b5fe8',
      },
      background: {
        default: mode === 'dark' ? '#12141a' : '#f5f7fb',
        paper: mode === 'dark' ? '#1b1e27' : '#ffffff',
      },
    },
    shape: {
      borderRadius: 14,
    },
    typography: {
      h4: {
        fontWeight: 700,
      },
      h6: {
        fontWeight: 600,
      },
    },
    components: {
      MuiContainer: {
        styleOverrides: {
          root: {
            paddingLeft: 16,
            paddingRight: 16,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 14,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(25,25,25,0.08)',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 10,
            fontWeight: 600,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
    },
  })
