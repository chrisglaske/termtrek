import './pill.css'

export function CommandPill({ cmd, onRun }: { cmd: string; onRun?: (cmd: string) => void }): React.JSX.Element {
  if (!onRun) return <code className="cmd">{cmd}</code>
  return (
    <button type="button" className="cmd" title="Run in terminal" onClick={() => onRun(cmd)}>
      {cmd}
    </button>
  )
}
