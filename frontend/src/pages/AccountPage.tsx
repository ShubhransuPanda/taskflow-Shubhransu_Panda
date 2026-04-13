import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getUsers } from '../services/userService'
import { LoadState } from '../components/LoadState'

export function AccountPage() {
  const { user } = useAuth()

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers })

  const stats = useMemo(
    () => usersQuery.data?.find((u) => u.id === user?.id),
    [usersQuery.data, user?.id],
  )

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (usersQuery.isLoading) return <LoadState message="Loading account..." />

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Account</Typography>
        <Typography color="text.secondary">Your profile and workspace activity.</Typography>
      </Box>

      {/* Profile hero */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3 }}>
            <Avatar
              sx={{
                width: 72,
                height: 72,
                fontSize: 26,
                fontWeight: 700,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                flexShrink: 0,
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.25 }}>
                {user?.name ?? '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">{user?.email ?? '—'}</Typography>
              <Box sx={{ mt: 1 }}>
                <Chip label="Member" size="small" color="primary" variant="outlined" />
              </Box>
            </Box>
          </Stack>

          <Divider sx={{ mb: 3 }} />

          {/* Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 4 }}>
              <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <FolderOutlinedIcon color="primary" />
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>
                        {stats?.project_count ?? 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Projects</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <TaskAltOutlinedIcon color="success" />
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>
                        {stats?.task_count ?? 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Tasks Assigned</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 2.5 }} />

          {/* Profile fields */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                <PersonOutlineRoundedIcon fontSize="small" color="action" sx={{ mt: 0.25 }} />
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Full Name
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {user?.name ?? '—'}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                <EmailOutlinedIcon fontSize="small" color="action" sx={{ mt: 0.25 }} />
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Email
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {user?.email ?? '—'}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  )
}
