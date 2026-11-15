import { checkConfigContract, checkLayoutContract, checkProjectListContract, rpcToolText, type ContractMessage } from './contract';

let apiBase = '';

/** Point API calls at the desktop client's daemon proxy. Empty keeps same-origin `/api` for the standalone page. */
export function configureCodebaseApi(base: string): void {
  apiBase = base.replace(/\/$/, '');
}

export function codebaseApiIsProxied(): boolean {
  return apiBase.length > 0;
}

function apiUrl(path: string): string {
  return `${apiBase}${path}`;
}

export type ListedProject = { name: string; rootPath: string; branch: string };

export type ProjectHealth = {
  status: 'healthy' | 'missing' | 'corrupt' | 'unknown';
  nodes?: number;
  edges?: number;
  indexedAt: string | null;
};

export type BrowseLevel = { path: string; dirs: string[]; parent: string; roots: string[] };

export type ServerProcess = {
  pid: number;
  cpu: number | null;
  rssMb: number | null;
  elapsed: string;
  command: string;
  isSelf: boolean;
};

export type ProcessReport = {
  selfRssMb: number | null;
  processes: ServerProcess[];
};

export type DaemonLog = { id: number; time: string; level: string; source: string; message: string };

export type LayoutPoint = {
  id: number;
  x: number;
  y: number;
  z: number;
  name: string;
  color?: string;
  size: number;
  label?: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  inCalls?: number;
  outCalls?: number;
};
export type LayoutLink = { source: number; target: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function positive(value: unknown): number | undefined {
  const number = numberOrNull(value);
  return number !== null && number > 0 ? number : undefined;
}

export function explainDaemonError(body: string, status: number): string {
  let message = body.trim();
  try {
    const parsed = JSON.parse(body) as unknown;
    if (isRecord(parsed) && typeof parsed.error === 'string') message = parsed.error;
  } catch {
    message = body.trim();
  }
  const sensitive = message.match(/^(.*?):\s*path is a home, credential, system, or application-install directory/i);
  if (sensitive) {
    return `${sensitive[1]} 是用户主目录、凭据目录或系统目录，不能直接索引。请改成具体的项目目录后再试。`;
  }
  return message || `官方接口 ${status}`;
}

export function absolutePath(value: string): string {
  const text = value.trim().replace(/^"(.*)"$/, '$1');
  if (/^[A-Za-z]:[\\/]/.test(text) || text.startsWith('\\\\') || text.startsWith('/')) return text;
  return '';
}

async function readJson(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!response.ok) throw new Error(explainDaemonError(body, response.status));
  return body ? (JSON.parse(body) as unknown) : {};
}

export async function fetchConfig(): Promise<{ revision: string; messages: ContractMessage[] }> {
  const payload = await readJson(await fetch(apiUrl('/api/config')));
  const revision = isRecord(payload) && typeof payload.revision === 'string' ? payload.revision : '';
  return { revision, messages: checkConfigContract(payload) };
}

export async function fetchProjects(): Promise<{ projects: ListedProject[]; messages: ContractMessage[] }> {
  const payload = await readJson(
    await fetch(apiUrl('/rpc'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'list_projects', arguments: { format: 'json', limit: 500, offset: 0 } },
      }),
    }),
  );
  const rawText = rpcToolText(payload);
  if (!rawText) throw new Error('官方项目列表没有文本');
  let parsed: unknown = rawText;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch {
    parsed = rawText;
  }
  const projects = isRecord(parsed) && Array.isArray(parsed.projects)
    ? parsed.projects.flatMap((item) => {
        if (!isRecord(item) || typeof item.name !== 'string') return [];
        return [{ name: item.name, rootPath: text(item.root_path), branch: text(item.branch) }];
      })
    : [];
  return { projects, messages: checkProjectListContract(parsed) };
}

export async function fetchHealth(name: string): Promise<ProjectHealth> {
  const payload = await readJson(await fetch(apiUrl(`/api/project-health?${new URLSearchParams({ name })}`)));
  const record = isRecord(payload) ? payload : {};
  const status = record.status;
  return {
    status: status === 'healthy' || status === 'missing' || status === 'corrupt' ? status : 'unknown',
    nodes: numberOrNull(record.nodes) ?? undefined,
    edges: numberOrNull(record.edges) ?? undefined,
    indexedAt: typeof record.indexed_at === 'string' ? record.indexed_at : null,
  };
}

export async function fetchBrowse(path = ''): Promise<BrowseLevel> {
  const suffix = path ? `?${new URLSearchParams({ path })}` : '';
  const payload = await readJson(await fetch(apiUrl(`/api/browse${suffix}`)));
  const record = isRecord(payload) ? payload : {};
  return {
    path: text(record.path),
    dirs: Array.isArray(record.dirs) ? record.dirs.filter((item): item is string => typeof item === 'string') : [],
    parent: text(record.parent),
    roots: Array.isArray(record.roots) ? record.roots.filter((item): item is string => typeof item === 'string') : [],
  };
}

export async function startIndex(rootPath: string, projectName: string): Promise<void> {
  await readJson(
    await fetch(apiUrl('/api/index'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root_path: rootPath, project_name: projectName }),
    }),
  );
}

export async function deleteProject(name: string): Promise<void> {
  await readJson(await fetch(apiUrl(`/api/project?${new URLSearchParams({ name })}`), { method: 'DELETE' }));
}

export async function fetchProcesses(): Promise<ProcessReport> {
  const payload = await readJson(await fetch(apiUrl('/api/processes')));
  const record = isRecord(payload) ? payload : {};
  const processes = Array.isArray(record.processes) ? record.processes.filter(isRecord) : [];
  return {
    selfRssMb: numberOrNull(record.self_rss_mb),
    processes: processes.map((entry) => ({
      pid: numberOrNull(entry.pid) ?? -1,
      cpu: entry.cpu_available === false ? null : numberOrNull(entry.cpu),
      rssMb: entry.memory_available === false ? null : numberOrNull(entry.rss_mb),
      elapsed: text(entry.elapsed),
      command: text(entry.command),
      isSelf: entry.is_self === true,
    })),
  };
}

export async function fetchLogs(lines = 200): Promise<DaemonLog[]> {
  const payload = await readJson(await fetch(apiUrl(`/api/logs?${new URLSearchParams({ lines: String(lines) })}`)));
  const record = isRecord(payload) ? payload : {};
  if (Array.isArray(record.records)) {
    return record.records.flatMap((entry) => {
      if (!isRecord(entry) || typeof entry.message !== 'string') return [];
      return [{
        id: numberOrNull(entry.id) ?? 0,
        time: text(entry.ts),
        level: text(entry.level),
        source: text(entry.source),
        message: entry.message,
      }];
    });
  }
  const plain = Array.isArray(record.lines) ? record.lines.filter((item): item is string => typeof item === 'string') : [];
  return plain.map((line, index) => ({ id: index, time: '', level: '', source: '', message: line }));
}

export async function fetchLayout(project: string): Promise<{
  totalNodes: number;
  points: LayoutPoint[];
  links: LayoutLink[];
  messages: ContractMessage[];
}> {
  const payload = await readJson(await fetch(apiUrl(`/api/layout?${new URLSearchParams({ project })}`)));
  const record = isRecord(payload) ? payload : {};
  const points = Array.isArray(record.nodes)
    ? record.nodes.flatMap((item) => {
        if (!isRecord(item) || typeof item.id !== 'number' || typeof item.x !== 'number' || typeof item.z !== 'number') return [];
        return [{
          id: item.id,
          x: item.x,
          y: typeof item.y === 'number' ? item.y : 0,
          z: item.z,
          name: text(item.name),
          color: typeof item.color === 'string' ? item.color : undefined,
          size: typeof item.size === 'number' && item.size > 0 ? item.size : 1,
          label: text(item.label) || undefined,
          filePath: text(item.file_path) || undefined,
          startLine: positive(item.start_line),
          endLine: positive(item.end_line),
          inCalls: numberOrNull(item.in_calls) ?? undefined,
          outCalls: numberOrNull(item.out_calls) ?? undefined,
        }];
      })
    : [];
  const links = Array.isArray(record.edges)
    ? record.edges.flatMap((item) => {
        if (!isRecord(item) || typeof item.source !== 'number' || typeof item.target !== 'number') return [];
        return [{ source: item.source, target: item.target }];
      })
    : [];
  return {
    totalNodes: numberOrNull(record.total_nodes) ?? points.length,
    points,
    links,
    messages: checkLayoutContract(payload),
  };
}

export function projectNameFor(path: string): string {
  const segment = path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? '';
  const cleaned = segment.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  return cleaned || 'project';
}

export function joinPath(base: string, dir: string): string {
  if (!base) return dir;
  const slash = base.includes('\\') ? '\\' : '/';
  return base.endsWith('/') || base.endsWith('\\') ? `${base}${dir}` : `${base}${slash}${dir}`;
}

function clockParts(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function padTime(part: number): string {
  return String(part).padStart(2, '0');
}

export function formatWhen(value: string | null | undefined): string {
  const date = clockParts(value);
  if (!date) return value || '—';
  return `${padTime(date.getMonth() + 1)}-${padTime(date.getDate())} ${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
}

export function formatClock(value: string | null | undefined): string {
  const date = clockParts(value);
  if (!date) return value || '—';
  return `${padTime(date.getHours())}:${padTime(date.getMinutes())}:${padTime(date.getSeconds())}`;
}

export function formatIndexed(value: string | null | undefined): string {
  const date = clockParts(value);
  if (!date) return '还没有完成索引';
  const now = new Date();
  const sameDay = now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth() && now.getDate() === date.getDate();
  const clock = `${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
  return sameDay
    ? `最近一次索引于今天 ${clock} 完成`
    : `最近一次索引于 ${padTime(date.getMonth() + 1)}-${padTime(date.getDate())} ${clock} 完成`;
}
