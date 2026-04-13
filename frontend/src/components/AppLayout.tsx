import {
  AppBar,
  Avatar,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import { memo, useCallback, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ConfirmDialog } from './ConfirmDialog'
import { useFeedback } from './FeedbackProvider'
import type { ThemeMode } from '../types/models'
import { layoutShellSx } from '../lib/layoutShell'

interface AppLayoutProps {
  mode: ThemeMode
  onToggleMode: () => void
}

function AppLayoutBase({ mode, onToggleMode }: AppLayoutProps) {
  const { user, logout } = useAuth()
  const { showSuccess } = useFeedback()
  const navigate = useNavigate()
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)

  const handleLogout = useCallback(() => {
    setMenuAnchor(null)
    setLogoutConfirmOpen(true)
  }, [])

  const handleCancelLogout = useCallback(() => setLogoutConfirmOpen(false), [])

  const handleConfirmLogout = useCallback(() => {
    setLogoutConfirmOpen(false)
    logout()
    showSuccess('Logged out successfully')
    navigate('/login', { replace: true })
  }, [logout, navigate, showSuccess])

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Box sx={{ minHeight: '100dvh', backgroundColor: 'background.default' }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{ backdropFilter: 'blur(14px)', borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar disableGutters sx={{ minHeight: { xs: 56, sm: 64 }, px: 0 }}>
          <Box
            sx={{
              ...layoutShellSx,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: { xs: 56, sm: 64 },
            }}
          >
          <Typography
            component={Link}
            to="/projects"
            sx={{
              textDecoration: 'none',
              color: 'text.primary',
              fontWeight: 800,
              fontSize: { xs: '1rem', sm: '1.15rem' },
              letterSpacing: 0.4,
              mr: 'auto',
            }}
          >
            Taskflow
          </Typography>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Tooltip title={mode === 'dark' ? 'Switch to Light' : 'Switch to Dark'}>
              <IconButton onClick={onToggleMode} size="small">
                {mode === 'dark'
                  ? <LightModeRoundedIcon fontSize="small" />
                  : <DarkModeRoundedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1 }} />

            {/* Avatar — clicking opens account menu */}
            <Tooltip title="Account">
              <IconButton
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                size="small"
                sx={{ p: 0 }}
              >
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    fontSize: 13,
                    fontWeight: 700,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.15s',
                    '&:hover': { boxShadow: '0 0 0 3px rgba(99,102,241,0.25)' },
                  }}
                >
                  {initials}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Stack>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Account popover menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: { sx: { mt: 1, minWidth: 220, borderRadius: 2 } },
        }}
      >
        {/* Identity header inside menu */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Avatar
              sx={{
                width: 38,
                height: 38,
                fontSize: 14,
                fontWeight: 700,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
                {user?.name ?? 'User'}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user?.email ?? ''}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Divider />

        <MenuItem
          onClick={() => { setMenuAnchor(null); navigate('/account') }}
          sx={{ py: 1.25 }}
        >
          <ListItemIcon>
            <PersonOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">View Account</Typography>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleLogout} sx={{ py: 1.25, color: 'error.main' }}>
          <ListItemIcon>
            <LogoutRoundedIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography variant="body2" color="error">Logout</Typography>
        </MenuItem>
      </Menu>

      <Box sx={{ ...layoutShellSx, py: { xs: 2, md: 3 } }}>
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, backgroundColor: 'background.paper', width: '100%' }}>
          <Outlet />
        </Paper>
      </Box>

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Confirm logout"
        description="Are you sure you want to logout?"
        confirmLabel="Logout"
        confirmColor="error"
        onCancel={handleCancelLogout}
        onConfirm={handleConfirmLogout}
      />
    </Box>
  )
}

export const AppLayout = memo(AppLayoutBase)
