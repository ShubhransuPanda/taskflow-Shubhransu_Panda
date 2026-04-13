import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Paper,
  Grid,
} from '@mui/material'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined'
import PlaylistAddCheckCircleRoundedIcon from '@mui/icons-material/PlaylistAddCheckCircleRounded'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorState, LoadState } from '../components/LoadState'
import { useFeedback } from '../components/FeedbackProvider'
import { DataTable, type DataTableColumn, type DataTableFilter } from '../components/DataTable'
import { useAuth } from '../auth/AuthContext'
import type { Task, TaskPriority, TaskStatus, ProjectStatus, ProjectPriority } from '../types/models'
import { getApiErrorMessage } from '../lib/errors'
import { getProject } from '../services/projectService'
import { getUsers } from '../services/userService'
import {
  createTask,
  deleteTask,
  getProjectTasks,
  type TaskPayload,
  updateTask,
} from '../services/taskService'

const taskSchema = z.object({
  title: z.string().min(2, 'Task title is required').max(120, 'Max 120 characters'),
  description: z.string().max(500, 'Max 500 characters').optional(),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high']),
  assignee_id: z.string().min(1, 'Assignee is required'),
  due_date: z
    .string()
    .min(1, 'Due date is required')
    .refine((value) => dayjs(value).isValid(), 'Invalid date'),
})

type TaskFormValues = z.infer<typeof taskSchema>

const statusChipColor: Record<ProjectStatus, 'default' | 'warning' | 'success'> = {
  planned: 'default',
  active: 'warning',
  completed: 'success',
}

const priorityChipColor: Record<ProjectPriority, 'default' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'warning',
  high: 'error',
}

const taskPriorityColor: Record<TaskPriority, 'default' | 'warning' | 'error' | 'success'> = {
  low: 'default',
  medium: 'warning',
  high: 'error',
}

const taskStatusColor: Record<TaskStatus, 'info' | 'warning' | 'success'> = {
  todo: 'info',
  in_progress: 'warning',
  done: 'success',
}

const truncateSx = {
  maxWidth: 200,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
  display: 'block',
}

const statusLabel: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
}

export function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { showSuccess, showError, showInfo } = useFeedback()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | string>('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  })

  const tasksQuery = useQuery({
    queryKey: ['tasks', projectId, statusFilter, assigneeFilter],
    queryFn: () =>
      getProjectTasks(projectId, {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        assignee: assigneeFilter !== 'all' ? assigneeFilter : undefined,
      }),
    enabled: Boolean(projectId),
  })

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers })

  const createTaskMutation = useMutation({
    mutationFn: (values: TaskPayload) => createTask(projectId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      showSuccess('Task created successfully')
      closeDialog()
    },
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, values }: { taskId: string; values: Partial<TaskPayload> }) =>
      updateTask(taskId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      showSuccess('Task updated successfully')
      closeDialog()
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      showSuccess('Task deleted successfully')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to delete task'))
    },
  })

  const userNameById = useMemo(
    () => new Map((usersQuery.data ?? []).map((m) => [m.id, m.name])),
    [usersQuery.data],
  )

  const assigneeOptions = useMemo(() => {
    const options = new Set<string>()
    ;(usersQuery.data ?? []).forEach((m) => options.add(m.id))
    ;(tasksQuery.data ?? []).forEach((t) => options.add(t.assignee_id))
    if (projectQuery.data?.owner_id) options.add(projectQuery.data.owner_id)
    if (user?.id) options.add(user.id)
    return [...options]
  }, [usersQuery.data, tasksQuery.data, projectQuery.data?.owner_id, user?.id])

  const getAssigneeLabel = useCallback(
    (id: string) => {
      if (!id) return 'Unassigned'
      const name = userNameById.get(id)
      if (id === user?.id && name) return `You (${name})`
      if (id === user?.id) return 'You'
      return name ?? id
    },
    [user?.id, userNameById],
  )

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      assignee_id: user?.id ?? '',
      due_date: dayjs().add(3, 'day').format('YYYY-MM-DD'),
    },
  })

  const openCreateDialog = useCallback(() => {
    setEditTask(null)
    setDialogError(null)
    reset({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      assignee_id: user?.id ?? projectQuery.data?.owner_id ?? '',
      due_date: dayjs().add(3, 'day').format('YYYY-MM-DD'),
    })
    setDialogOpen(true)
  }, [projectQuery.data?.owner_id, reset, user?.id])

  useEffect(() => {
    if (projectQuery.isSuccess && searchParams.get('openTask') === '1') {
      openCreateDialog()
      const next = new URLSearchParams(searchParams)
      next.delete('openTask')
      setSearchParams(next, { replace: true })
    }
  }, [openCreateDialog, projectQuery.isSuccess, searchParams, setSearchParams])

  const openEditDialog = useCallback(
    (task: Task) => {
      setEditTask(task)
      setDialogError(null)
      reset({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee_id: task.assignee_id,
        due_date: task.due_date,
      })
      setDialogOpen(true)
    },
    [reset],
  )

  const closeDialog = useCallback(() => { setDialogOpen(false); setEditTask(null) }, [])

  const onSubmit = useCallback(
    async (values: TaskFormValues) => {
      setDialogError(null)
      try {
        if (editTask) {
          await updateTaskMutation.mutateAsync({ taskId: editTask.id, values })
        } else {
          await createTaskMutation.mutateAsync(values)
        }
      } catch (error: unknown) {
        const message = getApiErrorMessage(error, 'Could not save task.')
        setDialogError(message)
        showError(message)
      }
    },
    [createTaskMutation, editTask, showError, updateTaskMutation],
  )

  const isSaveDisabled = useMemo(
    () => isSubmitting || createTaskMutation.isPending || updateTaskMutation.isPending,
    [isSubmitting, createTaskMutation.isPending, updateTaskMutation.isPending],
  )

  const taskStats = useMemo(() => {
    const stats = { total: 0, in_progress: 0, done: 0 }
    ;(tasksQuery.data ?? []).forEach((t) => {
      stats.total += 1
      if (t.status === 'in_progress') stats.in_progress += 1
      if (t.status === 'done') stats.done += 1
    })
    return stats
  }, [tasksQuery.data])

  const handleRequestTaskDelete = useCallback((id: string) => setPendingDeleteTaskId(id), [])
  const handleCancelTaskDelete = useCallback(() => {
    setPendingDeleteTaskId(null)
    showInfo('Task deletion cancelled')
  }, [showInfo])
  const handleConfirmTaskDelete = useCallback(() => {
    if (!pendingDeleteTaskId) return
    deleteTaskMutation.mutate(pendingDeleteTaskId)
    setPendingDeleteTaskId(null)
  }, [deleteTaskMutation, pendingDeleteTaskId])

  // Client-side priority filter (status/assignee are server-side)
  const filteredTasks = useMemo(() => {
    if (priorityFilter === 'all') return tasksQuery.data ?? []
    return (tasksQuery.data ?? []).filter((t) => t.priority === priorityFilter)
  }, [tasksQuery.data, priorityFilter])

  const tableFilters = useMemo<DataTableFilter[]>(
    () => [
      {
        key: 'status',
        label: 'Status',
        value: statusFilter,
        options: [
          { value: 'all', label: 'All statuses' },
          { value: 'todo', label: 'Todo' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'done', label: 'Done' },
        ],
        onChange: (v) => setStatusFilter(v as 'all' | TaskStatus),
      },
      {
        key: 'priority',
        label: 'Priority',
        value: priorityFilter,
        options: [
          { value: 'all', label: 'All priorities' },
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ],
        onChange: setPriorityFilter,
      },
      {
        key: 'assignee',
        label: 'Assignee',
        value: assigneeFilter,
        options: [
          { value: 'all', label: 'All members' },
          ...assigneeOptions.map((id) => ({ value: id, label: getAssigneeLabel(id) })),
        ],
        onChange: (v) => setAssigneeFilter(v as 'all' | string),
      },
    ],
    [statusFilter, priorityFilter, assigneeFilter, assigneeOptions, getAssigneeLabel],
  )

  const columns = useMemo<DataTableColumn<Task>[]>(
    () => [
      {
        key: 'title',
        label: 'Title',
        sortable: true,
        sortValue: (r) => r.title.toLowerCase(),
        render: (r) => (
          <Tooltip title={r.title} placement="top-start">
            <Typography variant="body2" sx={{ fontWeight: 600, ...truncateSx }}>{r.title}</Typography>
          </Tooltip>
        ),
      },
      {
        key: 'description',
        label: 'Description',
        sortable: true,
        sortValue: (r) => (r.description ?? '').toLowerCase(),
        render: (r) => (
          <Tooltip title={r.description || ''} placement="top-start">
            <Typography variant="body2" sx={truncateSx}>{r.description || '-'}</Typography>
          </Tooltip>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (r) => (
          <Chip label={statusLabel[r.status]} color={taskStatusColor[r.status]} size="small" />
        ),
      },
      {
        key: 'priority',
        label: 'Priority',
        render: (r) => (
          <Chip label={r.priority} color={taskPriorityColor[r.priority]} size="small" />
        ),
      },
      {
        key: 'assignee',
        label: 'Assignee',
        sortable: true,
        sortValue: (r) => getAssigneeLabel(r.assignee_id).toLowerCase(),
        render: (r) => (
          <Tooltip title={getAssigneeLabel(r.assignee_id)} placement="top-start">
            <Typography variant="body2" sx={truncateSx}>{getAssigneeLabel(r.assignee_id)}</Typography>
          </Tooltip>
        ),
      },
      {
        key: 'dueDate',
        label: 'Due Date',
        sortable: true,
        sortValue: (r) => r.due_date,
        render: (r) => dayjs(r.due_date).format('MMM D, YYYY'),
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right',
        hideable: false,
        render: (r) => (
          <Stack direction="row" spacing={0.25} sx={{ justifyContent: 'flex-end' }}>
            <Tooltip title="Edit task">
              <IconButton size="small" onClick={() => openEditDialog(r)}>
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete task">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleRequestTaskDelete(r.id)}
                  disabled={deleteTaskMutation.isPending}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [openEditDialog, handleRequestTaskDelete, deleteTaskMutation.isPending, getAssigneeLabel],
  )

  if (projectQuery.isLoading) return <LoadState message="Loading project..." />
  if (projectQuery.isError || !projectQuery.data)
    return <ErrorState message="Project not found or unavailable." onRetry={() => projectQuery.refetch()} />

  return (
    <Stack spacing={2.5}>
      {/* Project header */}
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ justifyContent: 'space-between', gap: 2, mb: 2 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              {projectQuery.data.name}
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ maxWidth: 680 }}>
              {projectQuery.data.description || 'No description provided.'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openCreateDialog}
            sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, whiteSpace: 'nowrap' }}
          >
            Add Task
          </Button>
        </Stack>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Status
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={projectQuery.data.status}
                  color={statusChipColor[projectQuery.data.status as ProjectStatus]}
                  size="small"
                />
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Priority
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={projectQuery.data.priority}
                  color={priorityChipColor[projectQuery.data.priority as ProjectPriority]}
                  size="small"
                />
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Deadline
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, alignItems: 'center' }}>
                <CalendarTodayOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="body2">
                  {projectQuery.data.due_date ? dayjs(projectQuery.data.due_date).format('MMM D, YYYY') : '—'}
                </Typography>
              </Stack>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Tags
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.5, alignItems: 'center' }}>
                {projectQuery.data.tags?.length ? (
                  projectQuery.data.tags.map((tag) => (
                    <Chip key={tag} icon={<LabelOutlinedIcon />} label={tag} size="small" variant="outlined" />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">—</Typography>
                )}
              </Stack>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 1.5 }} />
        <Stack direction="row" spacing={2}>
          <Typography variant="body2" color="text.secondary">
            <strong>{taskStats.total}</strong> tasks total
          </Typography>
          <Typography variant="body2" color="warning.main">
            <strong>{taskStats.in_progress}</strong> in progress
          </Typography>
          <Typography variant="body2" color="success.main">
            <strong>{taskStats.done}</strong> done
          </Typography>
        </Stack>
      </Paper>

      {tasksQuery.isLoading && <LoadState message="Loading tasks..." />}
      {tasksQuery.isError && (
        <ErrorState message="Could not load tasks." onRetry={() => tasksQuery.refetch()} />
      )}

      {tasksQuery.isSuccess && (
        <DataTable
          columns={columns}
          rows={filteredTasks}
          rowKey={(r) => r.id}
          filters={tableFilters}
          minWidth={800}
          emptySlot={
            <Stack spacing={1} sx={{ alignItems: 'center' }}>
              <PlaylistAddCheckCircleRoundedIcon color="disabled" />
              <Typography variant="body2" color="text.secondary">
                No tasks match these filters.
              </Typography>
            </Stack>
          }
        />
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editTask ? 'Edit Task' : 'Create Task'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            <Controller
              control={control}
              name="title"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Title"
                  fullWidth
                  error={Boolean(errors.title)}
                  helperText={errors.title?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <TextField {...field} label="Description" fullWidth multiline minRows={2} />
              )}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <FormControl fullWidth error={Boolean(errors.status)}>
                    <InputLabel id="status-label">Status</InputLabel>
                    <Select {...field} labelId="status-label" label="Status">
                      <MenuItem value="todo">Todo</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="done">Done</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <FormControl fullWidth error={Boolean(errors.priority)}>
                    <InputLabel id="priority-label">Priority</InputLabel>
                    <Select {...field} labelId="priority-label" label="Priority">
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                control={control}
                name="assignee_id"
                render={({ field }) => (
                  <FormControl fullWidth error={Boolean(errors.assignee_id)}>
                    <InputLabel id="assignee-id-label">Assignee</InputLabel>
                    <Select {...field} labelId="assignee-id-label" label="Assignee">
                      {assigneeOptions.length === 0 ? (
                        <MenuItem value={user?.id ?? ''}>{getAssigneeLabel(user?.id ?? '')}</MenuItem>
                      ) : (
                        assigneeOptions.map((id) => (
                          <MenuItem key={id} value={id}>{getAssigneeLabel(id)}</MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                )}
              />
              <Controller
                control={control}
                name="due_date"
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Due Date"
                    type="date"
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    error={Boolean(errors.due_date)}
                    helperText={errors.due_date?.message}
                  />
                )}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSaveDisabled}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDeleteTaskId)}
        title="Delete task"
        description="Delete this task?"
        confirmLabel="Delete"
        confirmColor="error"
        onCancel={handleCancelTaskDelete}
        onConfirm={handleConfirmTaskDelete}
      />
    </Stack>
  )
}
