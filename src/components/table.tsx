interface Column {
  header: string
  width: number
}

interface TableProps {
  columns: Column[]
  rows: string[][]
  selectedIndex: number
}

export function Table({ columns, rows, selectedIndex }: TableProps) {
  const totalWidth = columns.reduce((sum, col) => sum + col.width + 3, 0) + 1

  return (
    <box flexDirection="column">
      {/* Header */}
      <box flexDirection="row">
        {columns.map((col, i) => (
          <text key={i} fg="#888888" width={col.width + 3}>
            {' ' + col.header.padEnd(col.width) + ' |'}
          </text>
        ))}
      </box>
      <text fg="#444444">{'─'.repeat(totalWidth)}</text>

      {/* Rows */}
      <scrollbox flexGrow={1}>
        <box flexDirection="column">
          {rows.map((row, rowIdx) => {
            const isSelected = rowIdx === selectedIndex
            const bg = isSelected ? '#1e40af' : undefined
            return (
              <box key={rowIdx} flexDirection="row" backgroundColor={bg}>
                {columns.map((col, colIdx) => (
                  <text
                    key={colIdx}
                    fg={isSelected ? '#ffffff' : '#cccccc'}
                    width={col.width + 3}
                  >
                    {' ' + (row[colIdx] || '').slice(0, col.width).padEnd(col.width) + ' |'}
                  </text>
                ))}
              </box>
            )
          })}
        </box>
      </scrollbox>
    </box>
  )
}

export type { Column, TableProps }
