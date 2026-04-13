import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded'
import dayjs from 'dayjs'
import { useCallback, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorState, LoadState } from '../components/LoadState'
import { useFeedback } from '../components/FeedbackProvider'
import { DataTable, type DataTableColumn, type DataTableFilter } from '../components/DataTable'
import type { Project, ProjectPriority, ProjectStatus } from '../types/models'
import { getApiErrorMessage } from '../lib/errors'
import {
  createProject,
  deleteProject,
  getProjects,
  type ProjectPayload,
  updateProject,
} from '../services/projectService'
import { getUsers } from '../services/userService'

const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name is required').max(80, 'Max 80 characters'),
  description: z.string().max(500, 'Max 500 characters').optional(),
  status: z.enum(['planned', 'active', 'completed']),
  priority: z.enum(['low', 'medium', 'high']),
  due_date: z
    .string()
    .min(1, 'Due date is required')
    .refine((value) => dayjs(value).isValid(), 'Invalid date'),
  tags: z.string().optional(),
})

type ProjectFormValues = z.infer<typeof createProjectSchema>

const statusColor: Record<ProjectStatus, 'default' | 'warning' | 'success'> = {
  planned: 'default',
  active: 'warning',
  completed: 'success',
}

const priorityColor: Record<ProjectPriority, 'default' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'warning',
  high: 'error',
}

const truncateSx = {
  maxWidth: 180,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
  display: 'block',
}

export function ProjectsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { showSuccess, showError, showInfo } = useFeedback()
  const [isOpen, setIsOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: getProjects })
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers })

  const createProjectMutation = useMutation({
    mutationFn: (values: ProjectPayload) => createProject(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setIsOpen(false)
      showSuccess('Project created successfully')
      reset({
        name: '',
        description: '',
        status: 'planned',
        priority: 'medium',
        due_date: dayjs().add(14, 'day').format('YYYY-MM-DD'),
        tags: '',
      })
    },
  })

  const updateProjectMutation = useMutation({
    mutationFn: ({ projectId, values }: { projectId: string; values: ProjectPayload }) =>
      updateProject(projectId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      showSuccess('Project updated successfully')
      handleCloseDialog()
    },
  })

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      showSuccess('Project deleted successfully')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to delete project'))
    },
  })

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'planned',
      priority: 'medium',
      due_date: dayjs().add(14, 'day').format('YYYY-MM-DD'),
      tags: '',
    },
  })

  const onSubmit = useCallback(
    async (values: ProjectFormValues) => {
      setFormError(null)
      const payload: ProjectPayload = {
        ...values,
        tags: values.tags
          ? values.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
      }
      try {
        if (editingProject) {
          await updateProjectMutation.mutateAsync({ projectId: editingProject.id, values: payload })
        } else {
          await createProjectMutation.mutateAsync(payload)
        }
      } catch (error: unknown) {
        const message = getApiErrorMessage(error, 'Could not save project right now.')
        setFormError(message)
        showError(message)
      }
    },
    [createProjectMutation, editingProject, showError, updateProjectMutation],
  )

  const handleCloseDialog = useCallback(() => {
    setIsOpen(false)
    setEditingProject(null)
    setFormError(null)
    reset({
      name: '',
      description: '',
      status: 'planned',
      priority: 'medium',
      due_date: dayjs().add(14, 'day').format('YYYY-MM-DD'),
      tags: '',
    })
  }, [reset])

  const handleViewProject = useCallback((id: string) => navigate(`/projects/${id}`), [navigate])
  const handleCreateTaskForProject = useCallback(
    (id: string) => navigate(`/projects/${id}?openTask=1`),
    [navigate],
  )
  const handleOpenCreate = useCallback(() => { handleCloseDialog(); setIsOpen(true) }, [handleCloseDialog])

  const handleEditProject = useCallback(
    (project: Project) => {
      setEditingProject(project)
      setFormError(null)
      reset({
        name: project.name,
        description: project.description ?? '',
        status: project.status ?? 'planned',
        priority: project.priority ?? 'medium',
        due_date: project.due_date || dayjs().add(14, 'day').format('YYYY-MM-DD'),
        tags: project.tags?.join(', ') ?? '',
      })
      setIsOpen(true)
    },
    [reset],
  )

  const handleDeleteProject = useCallback((id: string) => setPendingDeleteProjectId(id), [])

  const handleCancelProjectDelete = useCallback(() => {
    setPendingDeleteProjectId(null)
    showInfo('Project deletion cancelled')
  }, [showInfo])

  const handleConfirmProjectDelete = useCallback(() => {
    if (!pendingDeleteProjectId) return
    deleteProjectMutation.mutate(pendingDeleteProjectId)
    setPendingDeleteProjectId(null)
  }, [deleteProjectMutation, pendingDeleteProjectId])

  // Client-side filtered rows
  const filteredProjects = useMemo(() => {
    return (projectsQuery.data ?? []).filter((p) => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false
      if (filterPriority !== 'all' && p.priority !== filterPriority) return false
      return true
    })
  }, [projectsQuery.data, filterStatus, filterPriority])

  const tableFilters = useMemo<DataTableFilter[]>(
    () => [
      {
        key: 'status',
        label: 'Status',
        value: filterStatus,
        options: [
          { value: 'all', label: 'All statuses' },
          { value: 'planned', label: 'Planned' },
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
        ],
        onChange: setFilterStatus,
      },
      {
        key: 'priority',
        label: 'Priority',
        value: filterPriority,
        options: [
          { value: 'all', label: 'All priorities' },
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ],
        onChange: setFilterPriority,
      },
    ],
    [filterStatus, filterPriority],
  )

  const columns = useMemo<DataTableColumn<Project>[]>(
    () => [
      {
        key: 'name',
        label: 'Project',
        sortable: true,
        sortValue: (r) => r.name.toLowerCase(),
        render: (r) => (
          <Tooltip title={r.name} placement="top-start">
            <Typography sx={{ fontWeight: 600, ...truncateSx }}>{r.name}</Typography>
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
        render: (r) => <Chip label={r.status} color={statusColor[r.status]} size="small" />,
      },
      {
        key: 'priority',
        label: 'Priority',
        render: (r) => <Chip label={r.priority} color={priorityColor[r.priority]} size="small" />,
      },
      {
        key: 'deadline',
        label: 'Deadline',
        sortable: true,
        sortValue: (r) => r.due_date ?? '',
        render: (r) => (r.due_date ? dayjs(r.due_date).format('MMM D, YYYY') : '-'),
      },
      {
        key: 'tags',
        label: 'Tags',
        render: (r) => (
          <Tooltip title={r.tags?.length ? r.tags.join(', ') : ''} placement="top-start">
            <Typography variant="body2" sx={truncateSx}>
              {r.tags?.length ? r.tags.join(', ') : '-'}
            </Typography>
          </Tooltip>
        ),
      },
      {
        key: 'created',
        label: 'Created',
        sortable: true,
        sortValue: (r) => r.created_at,
        render: (r) => dayjs(r.created_at).format('MMM D, YYYY'),
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right',
        hideable: false,
        render: (r) => (
          <Stack direction="row" spacing={0.25} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
            <Tooltip title="View">
              <IconButton size="small" onClick={() => handleViewProject(r.id)}>
                <VisibilityRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => handleEditProject(r)}>
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              size="small"
              variant="text"
              onClick={() => handleCreateTaskForProject(r.id)}
              startIcon={<PlaylistAddRoundedIcon fontSize="small" />}
              sx={{ ml: 0.25 }}
            >
              Add Task
            </Button>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => handleDeleteProject(r.id)}>
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [handleViewProject, handleEditProject, handleCreateTaskForProject, handleDeleteProject],
  )

  return (
    <Stack spacing={3}>
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card variant="outlined">
            <CardActionArea onClick={() => navigate('/projects')}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Projects</Typography>
                <Typography variant="h5">{projectsQuery.data?.length ?? 0}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card variant="outlined">
            <CardActionArea onClick={() => navigate('/users')}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Users</Typography>
                <Typography variant="h5">{usersQuery.data?.length ?? 0}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary" variant="body2">Active Projects</Typography>
              <Typography variant="h5">
                {(projectsQuery.data ?? []).filter((p) => p.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Projects</Typography>
          <Typography color="text.secondary">View and manage all projects you can access.</Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleOpenCreate}
          sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
        >
          <AddRoundedIcon sx={{ mr: 0.75 }} fontSize="small" />
          New Project
        </Button>
      </Stack>

      {projectsQuery.isLoading && <LoadState message="Loading projects..." />}
      {projectsQuery.isError && (
        <ErrorState message="Failed to load projects." onRetry={() => projectsQuery.refetch()} />
      )}

      {projectsQuery.isSuccess && (
        <DataTable
          columns={columns}
          rows={filteredProjects}
          rowKey={(r) => r.id}
          filters={tableFilters}
          minWidth={760}
          emptySlot={
            <Stack spacing={1} sx={{ alignItems: 'center' }}>
              <FolderOpenRoundedIcon color="disabled" />
              <Typography variant="body2" color="text.secondary">
                {(projectsQuery.data?.length ?? 0) > 0
                  ? 'No projects match the current filters.'
                  : 'No projects yet.'}
              </Typography>
              {(projectsQuery.data?.length ?? 0) === 0 && (
                <Button size="small" onClick={handleOpenCreate}>Create one</Button>
              )}
            </Stack>
          }
        />
      )}

      <Dialog open={isOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingProject ? 'Edit Project' : 'Create Project'}</DialogTitle>
        <DialogContent>
          <Stack component="form" spacing={2} sx={{ mt: 1 }} onSubmit={handleSubmit(onSubmit)}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Project name"
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                  fullWidth
                />
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <TextField {...field} label="Description" multiline minRows={2} fullWidth />
              )}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <TextField {...field} select fullWidth label="Status">
                    <MenuItem value="planned">Planned</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </TextField>
                )}
              />
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <TextField {...field} select fullWidth label="Priority">
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </TextField>
                )}
              />
            </Stack>
            <Controller
              control={control}
              name="due_date"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Deadline"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={Boolean(errors.due_date)}
                  helperText={errors.due_date?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Tags"
                  placeholder="frontend, sprint-1, urgent"
                  fullWidth
                  helperText="Comma separated"
                />
              )}
            />
            <button type="submit" style={{ display: 'none' }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={
              isSubmitting || createProjectMutation.isPending || updateProjectMutation.isPending
            }
          >
            {editingProject ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDeleteProjectId)}
        title="Delete project"
        description="Delete this project and all its tasks?"
        confirmLabel="Delete"
        confirmColor="error"
        onCancel={handleCancelProjectDelete}
        onConfirm={handleConfirmProjectDelete}
      />
    </Stack>
  )
}
