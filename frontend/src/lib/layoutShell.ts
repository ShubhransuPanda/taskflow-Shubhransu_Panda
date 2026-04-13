import type { SxProps, Theme } from '@mui/material/styles'

export const layoutShellSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: { xs: '100%', md: 'min(100%, 1680px)', lg: 'min(100%, 1920px)' },
  mx: 'auto',
  px: { xs: 2, sm: 2.5, md: 3 },
  boxSizing: 'border-box',
}
