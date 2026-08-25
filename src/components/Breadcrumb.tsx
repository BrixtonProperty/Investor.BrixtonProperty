import { Link } from 'react-router-dom'

export interface Crumb {
  label: string
  to?: string
}

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <div className="crumb">
      {items.map((item, i) => (
        <span key={i}>
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span className="cur">{item.label}</span>}
          {i < items.length - 1 && <span className="sep">›</span>}
        </span>
      ))}
    </div>
  )
}
