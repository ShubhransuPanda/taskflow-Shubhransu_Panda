import {
  Table,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  type SxProps,
  type TableCellProps,
  type Theme,
} from '@mui/material'
import type { ReactNode } from 'react'

export interface AppTableColumn {
  key: string
  label: string
  align?: TableCellProps['align']
  sx?: SxProps<Theme>
}

interface AppTableProps {
  columns: AppTableColumn[]
  children: ReactNode
  minWidth?: number
  containerSx?: SxProps<Theme>
}

export function AppTable({ columns, children, minWidth = 640, containerSx }: AppTableProps) {
  return (
    <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 0, overflowX: 'auto', ...containerSx }}>
      <Table size="small" sx={{ minWidth }}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.key} align={column.align} sx={{ fontWeight: 700, ...column.sx }}>
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        {children}
      </Table>
    </TableContainer>
  )
}
