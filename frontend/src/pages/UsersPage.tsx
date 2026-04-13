import { useQuery } from '@tanstack/react-query'
import { Avatar, Box, Chip, Stack, Typography } from '@mui/material'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import PeopleOutlineRoundedIcon from '@mui/icons-material/PeopleOutlineRounded'
import { useMemo } from 'react'
import { DataTable, type DataTableColumn } from '../components/DataTable'
import { ErrorState, LoadState } from '../components/LoadState'
import { getUsers } from '../services/userService'
import type { User } from '../types/models'

export function UsersPage() {
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers })

  const columns = useMemo<DataTableColumn<User>[]>(
    () => [
      {
        key: 'name',
        label: 'Member',
        sortable: true,
        sortValue: (r) => r.name.toLowerCase(),
        render: (r) => (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
              {r.name.slice(0, 1).toUpperCase()}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {r.name}
            </Typography>
          </Stack>
        ),
      },
      {
        key: 'email',
        label: 'Email',
        sortable: true,
        sortValue: (r) => r.email.toLowerCase(),
        render: (r) => (
          <Typography variant="body2" color="text.secondary">{r.email}</Typography>
        ),
      },
      {
        key: 'projects',
        label: 'Projects',
        sortable: true,
        sortValue: (r) => r.project_count ?? 0,
        render: (r) => (
          <Chip
            icon={<FolderOutlinedIcon />}
            label={r.project_count ?? 0}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        key: 'tasks',
        label: 'Tasks Assigned',
        sortable: true,
        sortValue: (r) => r.task_count ?? 0,
        render: (r) => (
          <Chip
            icon={<TaskAltOutlinedIcon />}
            label={r.task_count ?? 0}
            size="small"
            variant="outlined"
            color={r.task_count ? 'primary' : 'default'}
          />
        ),
      },
    ],
    [],
  )

  if (usersQuery.isLoading) return <LoadState message="Loading users..." />
  if (usersQuery.isError)
    return <ErrorState message="Failed to load users." onRetry={() => usersQuery.refetch()} />

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Users</Typography>
        <Typography color="text.secondary">
          {usersQuery.data?.length ?? 0} members in this workspace.
        </Typography>
      </Box>
      <DataTable
        columns={columns}
        rows={usersQuery.data ?? []}
        rowKey={(r) => r.email}
        emptySlot={
          <Stack spacing={1} sx={{ alignItems: 'center' }}>
            <PeopleOutlineRoundedIcon color="disabled" />
            <Typography variant="body2" color="text.secondary">No members yet.</Typography>
          </Stack>
        }
      />
    </Stack>
  )
}
