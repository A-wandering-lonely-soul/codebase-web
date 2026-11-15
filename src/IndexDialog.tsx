/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { useEffect, useState } from 'react';
import { absolutePath, fetchBrowse, joinPath, projectNameFor, startIndex, type BrowseLevel } from './api';
import { CheckIcon, CloseIcon, FolderIcon, SearchIcon } from './icons';

type IndexDialogProps = {
  open: boolean;
  onClose: () => void;
  onStarted: () => void;
};

export function IndexDialog({ open, onClose, onStarted }: IndexDialogProps) {
  const [level, setLevel] = useState<BrowseLevel | null>(null);
  const [selected, setSelected] = useState('');
  const [pathDraft, setPathDraft] = useState('');
  const [name, setName] = useState('');
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setFilter('');
    setSelected('');
    setPathDraft('');
    setError('');
    void load('');
  }, [open]);

  async function load(path: string) {
    setBusy(true);
    setError('');
    try {
      const next = await fetchBrowse(path);
      setLevel(next);
      setSelected(next.path);
      setPathDraft(next.path);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '目录读取失败');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  const pastedPath = absolutePath(filter);
  const typedPath = pathDraft.trim();
  const loadedPath = level?.path ?? '';
  const entries = level ? (level.path ? level.dirs : [...level.roots, ...level.dirs]) : [];
  const visible = pastedPath ? entries : entries.filter((dir) => dir.toLowerCase().includes(filter.trim().toLowerCase()));
  const target = pastedPath || (typedPath && typedPath !== loadedPath ? typedPath : '') || selected || loadedPath;
  const crumbs = (level?.path || '').split(/[\\/]+/).filter(Boolean);

  async function submit() {
    if (!target) {
      setError('先选择一个目录');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await startIndex(target, name.trim() || projectNameFor(target));
      onStarted();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '索引没有开始');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal index-modal" role="dialog" aria-labelledby="index-title" onClick={(event) => event.stopPropagation()}>
        <header className="dialog-head">
          <span className="icon-tile"><FolderIcon /></span>
          <div>
            <h2 id="index-title">选择仓库目录</h2>
            <p className="muted">导航到项目根目录，然后点击「索引此目录」。</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><CloseIcon /></button>
        </header>
        <div className="field-row">
          <label>
            仓库路径
            <input
              value={pathDraft}
              placeholder="项目根目录，例如 D:\code\wangsi\codebase-web"
              onChange={(event) => setPathDraft(event.target.value)}
              onBlur={() => { if (pathDraft.trim() !== loadedPath) void load(pathDraft.trim()); }}
              onKeyDown={(event) => { if (event.key === 'Enter') void load(pathDraft.trim()); }}
            />
          </label>
          <label>
            项目 ID 选填
            <input value={name} placeholder="留空则从路径派生" onChange={(event) => setName(event.target.value)} />
          </label>
        </div>
        <label className="search">
          <SearchIcon />
          <input
            value={filter}
            placeholder="筛选子目录，或直接粘贴完整路径"
            onChange={(event) => setFilter(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && absolutePath(filter)) void submit(); }}
          />
        </label>
        <div className="crumbs">
          <button type="button" className="text-button" disabled={!level?.parent && !level?.path} onClick={() => void load(level?.parent ?? '')}>上一级</button>
          <span>{crumbs.length > 0 ? crumbs.join(' / ') : '此电脑'}</span>
          {busy ? <span className="muted">正在读取…</span> : null}
        </div>
        <ul className="dir-list">
          {visible.map((dir) => {
            const path = level?.path ? joinPath(level.path, dir) : dir;
            const active = selected === path;
            return (
              <li key={path}>
                <button type="button" className={active ? 'active' : ''} onClick={() => setSelected(path)} onDoubleClick={() => void load(path)}>
                  <FolderIcon />
                  <span>{dir}</span>
                  {active ? <CheckIcon /> : null}
                </button>
              </li>
            );
          })}
        </ul>
        {error ? <p className="error">{error}</p> : null}
        <footer className="dialog-foot">
          <span className="path">{target || '未选择目录'}</span>
          <span className="actions">
            <button type="button" className="ghost" onClick={onClose}>取消</button>
            <button type="button" className="primary" disabled={busy} onClick={() => void submit()}>索引此目录</button>
          </span>
        </footer>
      </section>
    </div>
  );
}
