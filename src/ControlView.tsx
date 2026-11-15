/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { useEffect, useState, type ReactNode } from 'react';
import { fetchLogs, fetchProcesses, formatClock, type DaemonLog, type ProcessReport } from './api';
import { ChevronIcon, CpuIcon, MemoryIcon, PulseIcon, RefreshIcon } from './icons';

type ControlViewProps = { active: boolean; connected: boolean; connecting: boolean };

export function ControlView({ active, connected, connecting }: ControlViewProps) {
  const [report, setReport] = useState<ProcessReport | null>(null);
  const [logs, setLogs] = useState<DaemonLog[]>([]);
  const [live, setLive] = useState(true);
  const [logsOpen, setLogsOpen] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const load = () => {
      void Promise.all([fetchProcesses(), fetchLogs()])
        .then(([nextReport, nextLogs]) => {
          if (cancelled) return;
          setReport(nextReport);
          setLogs(nextLogs);
          setError('');
        })
        .catch((cause: unknown) => {
          if (!cancelled) setError(cause instanceof Error ? cause.message : '控制数据读取失败');
        });
    };
    load();
    if (!live) return () => { cancelled = true; };
    const timer = window.setInterval(load, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active, live]);

  const self = report?.processes.find((item) => item.isSelf);
  const memoryTotal = report?.processes.reduce((sum, item) => sum + (item.rssMb ?? 0), 0) ?? 0;
  const selfMemory = report?.selfRssMb ?? 0;
  const cpu = self?.cpu ?? 0;

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h2>控制面板</h2>
          <p className="muted">查看代码图谱服务的资源占用、活动进程与运行日志。</p>
        </div>
        <span className={connected ? 'status ok' : connecting ? 'status pending' : 'status bad'}>
          <i />
          {connected ? '服务运行正常' : connecting ? '正在连接' : '服务未连接'}
        </span>
      </header>
      {error ? <p className="error">{error}</p> : null}
      <div className="metric-grid">
        <Metric icon={<CpuIcon />} label="CPU" value={self?.cpu == null ? '—' : `${self.cpu} %`} width={Math.min(100, cpu)} />
        <Metric icon={<MemoryIcon />} label="总内存" value={`${memoryTotal.toFixed(1)} MB`} width={Math.min(100, memoryTotal)} />
        <Metric icon={<PulseIcon />} label="进程" value={String(report?.processes.length ?? 0)} width={Math.min(100, (report?.processes.length ?? 0) * 18)} />
        <Metric icon={<MemoryIcon />} label="自身内存" value={report?.selfRssMb == null ? '—' : `${report.selfRssMb} MB`} width={Math.min(100, selfMemory * 2)} />
      </div>
      <div className="section-head">
        <div>
          <h3>活动进程</h3>
          <p className="muted">{report?.processes.length ?? 0} 个进程在运行</p>
        </div>
        <button type="button" className="ghost" onClick={() => setLive((value) => !value)}>
          <RefreshIcon />
          {live ? '暂停' : '刷新'}
        </button>
      </div>
      <div className="process-grid">
        {report?.processes.map((item) => (
          <article key={item.pid} className="process-card">
            <header className="row">
              <strong className="pid"><i />PID {item.pid}</strong>
              {item.isSelf ? <span className="tag">本进程</span> : <span />}
            </header>
            <dl className="process-stats">
              <div><dt>CPU</dt><dd>{item.cpu == null ? '—' : `${item.cpu} %`}</dd></div>
              <div><dt>RAM</dt><dd>{item.rssMb == null ? '—' : `${item.rssMb} MB`}</dd></div>
              <div><dt>运行时间</dt><dd>{item.elapsed || '—'}</dd></div>
            </dl>
            <p className="command" title={item.command || ''}>{item.command || '—'}</p>
          </article>
        ))}
      </div>
      <section className="log-panel">
        <header className="row">
          <button type="button" className="text-button" onClick={() => setLogsOpen((value) => !value)}>
            <ChevronIcon className={logsOpen ? 'chevron open' : 'chevron'} />
            进程日志
            <span className="count-badge">{logs.length} 行</span>
          </button>
          <label className="live">
            <input type="checkbox" checked={live} onChange={(event) => setLive(event.target.checked)} />
            实时更新
          </label>
        </header>
        {logsOpen ? (
          <div className="log-scroll">
            <table className="log-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>级别</th>
                  <th>来源</th>
                  <th>内容</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item) => (
                  <tr key={`${item.id}-${item.time}-${item.message.slice(0, 24)}`}>
                    <td className="time">{formatClock(item.time)}</td>
                    <td className={`level ${item.level.toLowerCase()}`}>{item.level || '—'}</td>
                    <td className="source" title={item.source}>{item.source || '—'}</td>
                    <td className="message" title={item.message}>{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function Metric({ icon, label, value, width }: { icon: ReactNode; label: string; value: string; width: number }) {
  return (
    <article className="metric">
      <header><span className="icon-tile">{icon}</span><span>{label}</span></header>
      <strong>{value}</strong>
      <span className="bar" aria-hidden="true"><i style={{ width: `${width}%` }} /></span>
    </article>
  );
}
