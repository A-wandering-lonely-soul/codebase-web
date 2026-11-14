import type { OfficialConfig, OfficialLayout } from './contract';

type RpcResult = {
  result?: {
    isError?: boolean;
    content?: Array<{ type?: string; text?: string }>;
  };
  error?: { message?: string };
};

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`官方接口 ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchOfficialConfig(): Promise<OfficialConfig> {
  const response = await fetch('/api/config');
  return readJson<OfficialConfig>(response);
}

export async function fetchProjectListText(): Promise<string> {
  const response = await fetch('/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'list_projects', arguments: {} },
    }),
  });
  const body = await readJson<RpcResult>(response);
  if (body.error?.message) throw new Error(body.error.message);
  if (body.result?.isError) throw new Error('官方项目列表返回错误');
  const text = body.result?.content?.find((item) => item.type === 'text')?.text;
  if (!text) throw new Error('官方项目列表没有文本');
  return text;
}

export async function fetchLayout(project: string): Promise<OfficialLayout> {
  const response = await fetch(`/api/layout?project=${encodeURIComponent(project)}`);
  return readJson<OfficialLayout>(response);
}

export type LayoutNode = {
  id: number;
  x: number;
  y: number;
  z: number;
  name: string;
  label: string;
  color?: string;
};

export type LayoutEdge = {
  source: number;
  target: number;
  type: string;
};

export function readNodes(layout: OfficialLayout): LayoutNode[] {
  if (!Array.isArray(layout.nodes)) return [];
  return layout.nodes.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const node = item as Record<string, unknown>;
    if (typeof node.id !== 'number' || typeof node.x !== 'number' || typeof node.z !== 'number') return [];
    return [
      {
        id: node.id,
        x: node.x,
        y: typeof node.y === 'number' ? node.y : 0,
        z: node.z,
        name: typeof node.name === 'string' ? node.name : '',
        label: typeof node.label === 'string' ? node.label : '',
        color: typeof node.color === 'string' ? node.color : undefined,
      },
    ];
  });
}

export function readEdges(layout: OfficialLayout): LayoutEdge[] {
  if (!Array.isArray(layout.edges)) return [];
  return layout.edges.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const edge = item as Record<string, unknown>;
    if (typeof edge.source !== 'number' || typeof edge.target !== 'number') return [];
    return [
      {
        source: edge.source,
        target: edge.target,
        type: typeof edge.type === 'string' ? edge.type : '',
      },
    ];
  });
}
