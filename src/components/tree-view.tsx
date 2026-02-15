import type { Node } from '../lib/openfga/types.ts'

interface TreeViewProps {
  node: Node
  prefix?: string
  isLast?: boolean
}

export function TreeView({ node, prefix = '', isLast = true }: TreeViewProps) {
  const connector = prefix ? (isLast ? '└── ' : '├── ') : ''
  const childPrefix = prefix + (prefix ? (isLast ? '    ' : '│   ') : '')

  const label = getNodeLabel(node)
  const color = getNodeColor(node)

  const children = getNodeChildren(node)

  return (
    <box flexDirection="column">
      <text fg={color}>{prefix}{connector}{label}</text>
      {children.map((child, idx) => (
        <TreeView
          key={idx}
          node={child}
          prefix={childPrefix}
          isLast={idx === children.length - 1}
        />
      ))}
    </box>
  )
}

function getNodeLabel(node: Node): string {
  if (node.name) return node.name
  if (node.leaf?.users) return `Users: ${node.leaf.users.users.join(', ')}`
  if (node.leaf?.computed) return `Computed: ${node.leaf.computed.userset}`
  if (node.leaf?.tupleToUserset) return `TupleToUserset: ${node.leaf.tupleToUserset.tupleset}`
  if (node.union) return 'union'
  if (node.intersection) return 'intersection'
  if (node.difference) return 'difference'
  return '(unknown)'
}

function getNodeColor(node: Node): string {
  if (node.union) return '#3b82f6'
  if (node.intersection) return '#22c55e'
  if (node.difference) return '#f97316'
  if (node.leaf?.users) return '#e5e7eb'
  if (node.leaf?.computed) return '#06b6d4'
  return '#e5e7eb'
}

function getNodeChildren(node: Node): Node[] {
  if (node.union) return node.union.nodes
  if (node.intersection) return node.intersection.nodes
  if (node.difference) return node.difference.nodes
  return []
}

export { getNodeLabel, getNodeColor, getNodeChildren }
