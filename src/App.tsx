import { useEffect, useState } from 'react';
import { fetchLayout, fetchOfficialConfig, fetchProjectListText, readEdges, readNodes, type LayoutEdge, type LayoutNode } from './backend';
import { checkConfigContract, checkLayoutContract, checkProjectListContract, type ContractMessage } from './contract';
import { GraphCanvas } from './GraphCanvas';
import { parseProjectList, type GraphProject } from './parseProjects';
import { VersionNotice } from './VersionNotice';

export function App() {
  const [projects, setProjects] = useState<GraphProject[]>([]);
  const [selected, setSelected] = useState('');
  const [nodes, setNodes] = useState<LayoutNode[]>([]);
  const [edges, setEdges] = useState<LayoutEdge[]>([]);
  const [totalNodes, setTotalNodes] = useState(0);
  const [messages, setMessages] = useState<ContractMessage[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [config, projectText] = await Promise.all([fetchOfficialConfig(), fetchProjectListText()]);
        if (cancelled) return;
        const found = parseProjectList(projectText);
        setProjects(found);
        setSelected(found[0]?.name ?? '');
        setMessages([...checkConfigContract(config), ...checkProjectListContract(projectText)]);
        setError('');
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : '无法连接官方代码图谱服务');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    async function loadLayout() {
      try {
        const layout = await fetchLayout(selected);
        if (cancelled) return;
        setNodes(readNodes(layout));
        setEdges(readEdges(layout));
        setTotalNodes(typeof layout.total_nodes === 'number' ? layout.total_nodes : 0);
        setMessages((current) => [...current.filter((item) => item.code !== 'layout-shape'), ...checkLayoutContract(layout)]);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : '图数据读取失败');
      }
    }
    void loadLayout();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">畿智代码图谱</p>
          <h1>项目结构</h1>
        </div>
        <p className="source">数据来自本机官方服务 127.0.0.1:9749</p>
      </header>
      <VersionNotice messages={messages} />
      {error ? <p className="error">{error}。请确认 codebase-memory-mcp 已启动。</p> : null}
      <section className="workspace">
        <aside>
          <h2>已索引项目</h2>
          {loading ? <p className="muted">正在读取官方项目列表…</p> : null}
          {!loading && projects.length === 0 ? <p className="muted">还没有可显示的项目。</p> : null}
          <ul className="project-list">
            {projects.map((project) => (
              <li key={project.name}>
                <button type="button" className={project.name === selected ? 'active' : ''} onClick={() => setSelected(project.name)}>
                  <strong>{project.name}</strong>
                  <span>{project.rootPath}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="graph-panel">
          <div className="graph-meta">
            <span>{selected || '未选择项目'}</span>
            <span>
              节点 {totalNodes} · 本次绘制 {Math.min(nodes.length, 800)} · 连线 {edges.length}
            </span>
          </div>
          <GraphCanvas nodes={nodes} edges={edges} />
        </section>
      </section>
    </main>
  );
}
