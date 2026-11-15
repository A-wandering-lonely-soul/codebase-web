/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { useMemo, useState, type ReactNode } from 'react';
import { formatClock, formatIndexed, type ProjectHealth } from './api';
import { CodeIcon, FolderIcon, LayersIcon, LinkIcon, PlusIcon, PulseIcon, RefreshIcon, SearchIcon, TrashIcon } from './icons';

export type ProjectRow = {
  name: string;
  rootPath: string;
  branch: string;
  health?: ProjectHealth;
};

type ProjectViewProps = {
  projects: ProjectRow[];
  loading: boolean;
  notice: string;
  connected: boolean;
  connecting: boolean;
  onRefresh: () => void;
  onCreate: () => void;
  onOpenGraph: (name: string) => void;
  onDelete: (project: ProjectRow) => void;
};

export function ProjectView({ projects, loading, notice, connected, connecting, onRefresh, onCreate, onOpenGraph, onDelete }: ProjectViewProps) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((item) => item.name.toLowerCase().includes(needle) || item.rootPath.toLowerCase().includes(needle));
  }, [projects, query]);
  const nodes = projects.reduce((sum, item) => sum + (item.health?.nodes ?? 0), 0);
  const edges = projects.reduce((sum, item) => sum + (item.health?.edges ?? 0), 0);
  const latest = projects.map((item) => item.health?.indexedAt).filter((item): item is string => !!item).sort().at(-1) ?? null;
  const unhealthy = projects.some((item) => item.health && item.health.status !== 'healthy');
  const statusLabel = projects.length === 0 ? '还没有索引' : unhealthy ? '图谱需要检查' : '图谱状态良好';

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h2>代码图谱</h2>
          <p className="muted">将本地代码仓库建立为可检索的知识图谱，快速理解项目结构与依赖关系。</p>
        </div>
        <div className="head-actions">
          <span className={connected ? 'status ok' : connecting ? 'status pending' : 'status bad'}>
            <i />
            {connected ? '索引服务运行正常' : connecting ? '正在连接' : '索引服务未连接'}
          </span>
          <button type="button" className="primary" onClick={onCreate}><PlusIcon />新建索引</button>
        </div>
      </header>

      <div className="summary">
        <Summary icon={<LayersIcon />} value={String(projects.length)} label="已索引项目" />
        <Summary icon={<CodeIcon />} value={String(nodes)} label="代码节点" />
        <Summary icon={<LinkIcon />} value={String(edges)} label="依赖关系" />
        <div className="summary-status">
          <span className="icon-tile"><PulseIcon /></span>
          <div>
            <strong>{statusLabel}</strong>
            <span className="muted">{formatIndexed(latest)}</span>
          </div>
        </div>
        <button type="button" className="ghost" onClick={onRefresh}><RefreshIcon />刷新</button>
      </div>

      <div className="section-head">
        <div>
          <h3>已索引项目</h3>
          <p className="muted">管理代码仓库索引与图谱状态</p>
        </div>
        <label className="search">
          <SearchIcon />
          <input value={query} placeholder="搜索项目名称或本地路径" onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>
      {notice ? <p className="muted">{notice}</p> : null}
      {loading ? <p className="muted">正在读取项目…</p> : null}
      {!loading && visible.length === 0 ? <p className="empty">没有可显示的项目。</p> : null}
      <ul className="project-rows">
        {visible.map((project) => (
          <li key={project.name} className="project-card">
            <div className="project-main">
              <span className="icon-tile"><FolderIcon /></span>
              <div className="project-copy">
                <strong>{project.name}</strong>
                <span className="path">{project.rootPath || '—'}</span>
                {project.branch ? <span className="tag">{project.branch}</span> : null}
              </div>
            </div>
            <div className="stat-pills">
              <span><b>{project.health?.nodes ?? '—'}</b>节点</span>
              <span><b>{project.health?.edges ?? '—'}</b>关系</span>
              <span><b>{formatClock(project.health?.indexedAt).slice(0, 5)}</b>最近更新</span>
            </div>
            <div className="actions">
              <button type="button" className="ghost" onClick={onCreate}>添加目录</button>
              <button type="button" className="primary" onClick={() => onOpenGraph(project.name)}>查看图谱</button>
              <button type="button" className="icon-danger" aria-label={`删除 ${project.name}`} onClick={() => onDelete(project)}><TrashIcon /></button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Summary({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="summary-cell">
      <span className="icon-tile">{icon}</span>
      <div>
        <strong>{value}</strong>
        <span className="muted">{label}</span>
      </div>
    </div>
  );
}
