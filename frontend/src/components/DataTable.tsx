import {
  Box,
  Checkbox,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  type SelectChangeEvent,
  type SxProps,
  type TableCellProps,
  type Theme,
} from '@mui/material'
import ViewColumnRoundedIcon from '@mui/icons-material/ViewColumnRounded'
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded'
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { type ReactElement, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface DataTableFilterOption {
  value: string
  label: string
}

export interface DataTableFilter {
  key: string
  label: string
  value: string
  options: DataTableFilterOption[]
  onChange: (value: string) => void
}

export interface DataTableColumn<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  sortable?: boolean
  sortValue?: (row: T) => string | number | null | undefined
  align?: TableCellProps['align']
  sx?: SxProps<Theme>
  hideable?: boolean
  defaultVisible?: boolean
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  filters?: DataTableFilter[]
  minWidth?: number
  pageSize?: number
  emptySlot?: ReactNode
  containerSx?: SxProps<Theme>
}

type SortDir = 'asc' | 'desc'

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  filters,
  minWidth = 640,
  pageSize = 10,
  emptySlot,
  containerSx,
}: DataTableProps<T>): ReactElement {
  const [colOrder, setColOrder] = useState<string[]>(() => columns.map((c) => c.key))
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    const hidden = new Set<string>()
    columns.forEach((c) => {
      if (c.defaultVisible === false) hidden.add(c.key)
    })
    return hidden
  })
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null)
  const [page, setPage] = useState(0)

  // Separate refs for header drag vs settings panel drag
  const headerDragFrom = useRef<string | null>(null)
  const settingsDragFrom = useRef<string | null>(null)

  const colMap = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns])

  const visibleCols = useMemo(
    () => colOrder.filter((k) => !hiddenCols.has(k)).map((k) => colMap.get(k)!).filter(Boolean),
    [colOrder, hiddenCols, colMap],
  )

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows
    const col = colMap.get(sortKey)
    if (!col?.sortValue) return rows
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a) ?? ''
      const bv = col.sortValue!(b) ?? ''
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, sortKey, sortDir, colMap])

  // Reset to page 0 whenever the source rows or sort changes
  useEffect(() => { setPage(0) }, [rows, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const pagedRows = useMemo(
    () => sortedRows.slice(page * pageSize, (page + 1) * pageSize),
    [sortedRows, page, pageSize],
  )

  const handleSortClick = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return key
      }
      setSortDir('asc')
      return key
    })
  }, [])

  const reorderCols = useCallback((fromKey: string, toKey: string) => {
    if (fromKey === toKey) return
    setColOrder((prev) => {
      const next = [...prev]
      const fi = next.indexOf(fromKey)
      const ti = next.indexOf(toKey)
      if (fi === -1 || ti === -1) return prev
      next.splice(fi, 1)
      next.splice(ti, 0, fromKey)
      return next
    })
  }, [])

  const toggleColVisibility = useCallback((key: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  return (
    <Box>
      {/* Toolbar: filters + column settings */}
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 1.5,
          py: 0.75,
          borderWidth: '1px 1px 0 1px',
          borderStyle: 'solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          gap: 1,
          flexWrap: 'wrap',
          minHeight: 44,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', flex: 1, gap: 1 }}>
          {filters?.map((f) => (
            <FormControl key={f.key} size="small" sx={{ minWidth: 130 }}>
              <InputLabel>{f.label}</InputLabel>
              <Select
                label={f.label}
                value={f.value}
                onChange={(e: SelectChangeEvent) => f.onChange(e.target.value)}
              >
                {f.options.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
        </Stack>

        <Tooltip title="Column settings">
          <IconButton size="small" onClick={(e) => setSettingsAnchor(e.currentTarget)}>
            <ViewColumnRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <TableContainer
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 0,
          overflowX: 'auto',
          ...containerSx,
        }}
      >
        <Table size="small" sx={{ minWidth }}>
          <TableHead>
            <TableRow>
              {visibleCols.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align}
                  draggable
                  onDragStart={(e) => {
                    headerDragFrom.current = col.key
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (headerDragFrom.current) reorderCols(headerDragFrom.current, col.key)
                  }}
                  onDragEnd={() => { headerDragFrom.current = null }}
                  onClick={col.sortable ? () => handleSortClick(col.key) : undefined}
                  sx={{
                    fontWeight: 700,
                    cursor: col.sortable ? 'pointer' : 'grab',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    '&:hover': { backgroundColor: 'action.hover' },
                    ...col.sx,
                  }}
                >
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, display: 'inline-flex' }}>
                    {col.label}
                    {col.sortable && (
                      sortKey === col.key
                        ? sortDir === 'asc'
                          ? <ArrowUpwardRoundedIcon sx={{ fontSize: 13 }} />
                          : <ArrowDownwardRoundedIcon sx={{ fontSize: 13 }} />
                        : <UnfoldMoreRoundedIcon sx={{ fontSize: 13, opacity: 0.35 }} />
                    )}
                  </Stack>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRows.length === 0
              ? emptySlot && (
                  <TableRow>
                    <TableCell colSpan={visibleCols.length} sx={{ py: 4, textAlign: 'center' }}>
                      {emptySlot}
                    </TableCell>
                  </TableRow>
                )
              : pagedRows.map((row) => (
                  <TableRow key={rowKey(row)} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    {visibleCols.map((col) => (
                      <TableCell key={col.key} align={col.align}>
                        {col.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination footer */}
      {sortedRows.length > 0 && (
        <>
          <Divider />
          <Stack
            direction="row"
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 2,
              py: 0.75,
              borderWidth: '0 1px 1px 1px',
              borderStyle: 'solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {sortedRows.length === 0
                ? '0 records'
                : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, sortedRows.length)} of ${sortedRows.length} records`}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <Tooltip title="Previous page">
                <span>
                  <IconButton size="small" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                    <ChevronLeftRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 52, textAlign: 'center' }}>
                {page + 1} / {totalPages}
              </Typography>
              <Tooltip title="Next page">
                <span>
                  <IconButton size="small" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
                    <ChevronRightRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        </>
      )}

      {/* Column settings popover */}
      <Popover
        open={Boolean(settingsAnchor)}
        anchorEl={settingsAnchor}
        onClose={() => setSettingsAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 0.5, minWidth: 210, p: 1.5, borderRadius: 2 } } }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ px: 0.5, mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}
        >
          Columns
        </Typography>
        <Stack spacing={0.25}>
          {colOrder.map((key) => {
            const col = colMap.get(key)
            if (!col) return null
            const canHide = col.hideable !== false
            return (
              <Stack
                key={key}
                direction="row"
                spacing={0.5}
                draggable
                onDragStart={(e) => {
                  settingsDragFrom.current = key
                  e.dataTransfer.effectAllowed = 'move'
                  e.stopPropagation()
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (settingsDragFrom.current) reorderCols(settingsDragFrom.current, key)
                }}
                onDragEnd={() => { settingsDragFrom.current = null }}
                sx={{
                  alignItems: 'center',
                  cursor: 'grab',
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 1,
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              >
                <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
                <Checkbox
                  size="small"
                  checked={!hiddenCols.has(key)}
                  disabled={!canHide}
                  onChange={() => toggleColVisibility(key)}
                  sx={{ py: 0.25, px: 0.5 }}
                />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {col.label}
                </Typography>
              </Stack>
            )
          })}
        </Stack>
      </Popover>
    </Box>
  )
}
