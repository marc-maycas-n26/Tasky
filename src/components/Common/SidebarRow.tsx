interface Props {
  label: string;
  children: React.ReactNode;
}

export function SidebarRow({ label, children }: Props) {
  return (
    <div className="sidebar-row">
      <span className="sidebar-row-label">{label}</span>
      <div className="sidebar-row-value">{children}</div>
    </div>
  );
}
