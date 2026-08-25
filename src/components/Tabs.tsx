export interface TabItem {
  id: string
  label: string
}

export default function Tabs({
  items,
  active,
  onChange,
  trailing,
}: {
  items: TabItem[]
  active: string
  onChange: (id: string) => void
  trailing?: React.ReactNode
}) {
  return (
    <div className="upd-tabs">
      {items.map((item) => (
        <button
          key={item.id}
          className={'upd-tab' + (active === item.id ? ' active' : '')}
          onClick={() => onChange(item.id)}
          type="button"
        >
          {item.label}
        </button>
      ))}
      {trailing}
    </div>
  )
}
