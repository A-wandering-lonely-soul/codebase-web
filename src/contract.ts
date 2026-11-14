/**
 * Contract this frontend was written against, read from a running
 * codebase-memory-mcp 0.12.1 on 2026-11-14.
 *
 * Extra fields from the official server are allowed. A revision change or a
 * missing required field means the payload no longer matches this page.
 */
export const FRONTEND_CONTRACT = {
  configRevision: '3',
  listProjectsColumns: 'cols: name root_path branch',
  layoutKeys: ['nodes', 'edges', 'total_nodes'] as const,
  nodeKeys: ['id', 'name', 'label', 'x', 'y', 'z'] as const,
  edgeKeys: ['source', 'target', 'type'] as const,
};

export type ContractMessage = {
  code: 'config-revision' | 'config-shape' | 'project-columns' | 'layout-shape';
  text: string;
};

export type OfficialConfig = {
  revision?: unknown;
  settings?: unknown;
};

export type OfficialLayout = {
  nodes?: unknown;
  edges?: unknown;
  total_nodes?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function missingKeys(record: Record<string, unknown>, keys: readonly string[]): string[] {
  return keys.filter((key) => !(key in record));
}

export function checkConfigContract(config: unknown): ContractMessage[] {
  if (!isRecord(config)) {
    return [{ code: 'config-shape', text: '官方配置接口没有返回对象。' }];
  }
  const messages: ContractMessage[] = [];
  if (!Array.isArray(config.settings)) {
    messages.push({ code: 'config-shape', text: '官方配置里缺少 settings 列表。' });
  }
  if (config.revision !== FRONTEND_CONTRACT.configRevision) {
    const actual = config.revision == null ? '空' : String(config.revision);
    messages.push({
      code: 'config-revision',
      text: `官方配置修订是 ${actual}，当前前端只约定 ${FRONTEND_CONTRACT.configRevision}。`,
    });
  }
  return messages;
}

export function checkProjectListContract(text: string): ContractMessage[] {
  if (text.includes(FRONTEND_CONTRACT.listProjectsColumns)) return [];
  return [
    {
      code: 'project-columns',
      text: `项目列表不再包含「${FRONTEND_CONTRACT.listProjectsColumns}」。`,
    },
  ];
}

export function checkLayoutContract(layout: unknown): ContractMessage[] {
  if (!isRecord(layout)) {
    return [{ code: 'layout-shape', text: '官方图数据没有返回对象。' }];
  }
  const messages: ContractMessage[] = [];
  const missing = missingKeys(layout, FRONTEND_CONTRACT.layoutKeys);
  if (missing.length > 0) {
    messages.push({ code: 'layout-shape', text: `图数据缺少字段：${missing.join('、')}。` });
  }
  const nodes = Array.isArray(layout.nodes) ? layout.nodes : [];
  const firstNode = nodes.find(isRecord);
  if (nodes.length > 0 && firstNode) {
    const missingNode = missingKeys(firstNode, FRONTEND_CONTRACT.nodeKeys);
    if (missingNode.length > 0) {
      messages.push({ code: 'layout-shape', text: `图节点缺少字段：${missingNode.join('、')}。` });
    }
  }
  const edges = Array.isArray(layout.edges) ? layout.edges : [];
  const firstEdge = edges.find(isRecord);
  if (edges.length > 0 && firstEdge) {
    const missingEdge = missingKeys(firstEdge, FRONTEND_CONTRACT.edgeKeys);
    if (missingEdge.length > 0) {
      messages.push({ code: 'layout-shape', text: `图连线缺少字段：${missingEdge.join('、')}。` });
    }
  }
  return messages;
}
