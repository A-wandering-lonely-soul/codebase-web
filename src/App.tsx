/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { useCallback, useEffect, useState } from 'react';
import { codebaseApiIsProxied, configureCodebaseApi, deleteProject, fetchConfig, fetchHealth, fetchProjects, type ProjectHealth } from './api';
import type { ContractMessage } from './contract';
import { ControlView } from './ControlView';
import { GraphView } from './GraphView';
import { CloseIcon } from './icons';
import { IndexDialog } from './IndexDialog';
import { ProjectView, type ProjectRow } from './ProjectView';

type Tab = 'graph' | 'project' | 'control';

type AppProps = {
  initialTab?: Tab;
  initialProject?: string;
  apiBase?: string;
};

export function App({ initialTab = 'project', initialProject = '', apiBase = '' }: AppProps) {
  if (apiBase) configureCodebaseApi(apiBase);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [connected, setConnected] = useState(false);
  const [revision, setRevision] = useState('');
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ContractMessage[]>([]);
  const [indexOpen, setIndexOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ProjectRow | null>(null);

  const rememberLayout = useCallback((incoming: ContractMessage[]) => {
    setMessages((current) => [...current.filter((item) => item.code !== 'layout-shape'), ...incoming]);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [config, listed] = await Promise.all([fetchConfig(), fetchProjects()]);
      const rows = await Promise.all(listed.projects.map(async (project) => {
        let health: ProjectHealth | undefined;
        try {
          health = await fetchHealth(project.name);
        } catch {
          health = undefined;
        }
        return { ...project, health };
      }));
      setConnected(true);
      setRevision(config.revision);
      setProjects(rows);
      setSelected((current) => {
        if (current) return current;
        if (initialProject && rows.some((row) => row.name === initialProject)) return initialProject;
        return rows[0]?.name || '';
      });
      setMessages([...config.messages, ...listed.messages]);
    } catch (cause) {
      setConnected(false);
      setError(cause instanceof Error ? cause.message : '无法连接代码图谱服务');
    } finally {
      setLoading(false);
    }
  }, [initialProject]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialProject) setSelected(initialProject);
  }, [initialProject]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    const name = pendingDelete.name;
    setPendingDelete(null);
    try {
      await deleteProject(name);
      setProjects((current) => current.filter((item) => item.name !== name));
      setSelected((current) => (current === name ? '' : current));
      setNotice(`${name} 的索引已删除，本地代码还在。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除失败');
    }
  }

  return (
    <main className="cbm-shell page">
      <header className="topbar">
        <div className="brand">
          <strong>Codebase Memory</strong>
          <span>{connected ? `修订 ${revision || '—'}` : loading ? '正在连接' : '未连接'}</span>
        </div>
        <nav>
          {(['graph', 'project', 'control'] as const).map((item) => (
            <button key={item} type="button" className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
              {item === 'graph' ? '图谱' : item === 'project' ? '项目' : '控制'}
            </button>
          ))}
        </nav>
        <span className={connected ? 'status ok' : loading ? 'status pending' : 'status bad'}><i />{connected ? '服务已连接' : loading ? '正在连接' : '服务未连接'}</span>
      </header>
      {messages.length > 0 ? (
        <section className="notice" role="alert">
          <strong>官方数据和当前前端不匹配</strong>
          <ul>{messages.map((item) => <li key={`${item.code}:${item.text}`}>{item.text}</li>)}</ul>
        </section>
      ) : null}
      {error ? (
        <p className="error">
          {error}。
          {codebaseApiIsProxied()
            ? '请回到这一页重试，客户端会重新拉起代码图谱服务。'
            : '请确认 codebase-memory-mcp 已在 127.0.0.1:9749 运行。'}
        </p>
      ) : null}
      {tab === 'project' ? (
        <ProjectView
          projects={projects}
          loading={loading}
          notice={notice}
          connected={connected}
          connecting={loading && !connected}
          onRefresh={() => void load()}
          onCreate={() => setIndexOpen(true)}
          onOpenGraph={(name) => { setSelected(name); setTab('graph'); }}
          onDelete={setPendingDelete}
        />
      ) : null}
      <GraphView project={selected} active={tab === 'graph'} onMessages={rememberLayout} />
      {tab === 'control' ? <ControlView active connected={connected} connecting={loading && !connected} /> : null}
      <IndexDialog open={indexOpen} onClose={() => setIndexOpen(false)} onStarted={() => { setNotice('索引已在后台开始。'); void load(); }} />
      {pendingDelete ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setPendingDelete(null)}>
          <section className="modal confirm-modal" role="dialog" aria-labelledby="delete-title" onClick={(event) => event.stopPropagation()}>
            <header className="dialog-head">
              <div>
                <h2 id="delete-title">删除索引项目</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setPendingDelete(null)} aria-label="关闭"><CloseIcon /></button>
            </header>
            <p>删除后将移除 {pendingDelete.name} 的图谱索引和关联数据，但不会删除本地代码文件。</p>
            <p className="warn">如需再次使用，需要重新创建并扫描索引。</p>
            <footer className="dialog-foot">
              <span />
              <span className="actions">
                <button type="button" className="ghost" onClick={() => setPendingDelete(null)}>取消</button>
                <button type="button" className="danger-solid" onClick={() => void confirmDelete()}>确认删除</button>
              </span>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}
