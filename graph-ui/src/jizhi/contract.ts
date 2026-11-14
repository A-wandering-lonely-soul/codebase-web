/**
 * Data contract for the graph-ui snapshot taken from
 * DeusData/codebase-memory-mcp tag v0.12.1, checked against a running
 * codebase-memory-mcp 0.12.1. Extra fields are allowed. A revision change or
 * a missing field the official page reads is a mismatch.
 */
export const FRONTEND_CONTRACT = {
    upstreamTag: 'v0.12.1',
    configRevision: '3',
    layoutKeys: ['nodes', 'edges', 'total_nodes'] as const,
    nodeKeys: ['id', 'name', 'x', 'y', 'z'] as const,
    edgeKeys: ['source', 'target', 'type'] as const,
    projectColumns: 'cols: name root_path branch',
};

export type ContractMessage = {
    code: 'config-revision' | 'config-shape' | 'project-list' | 'layout-shape';
    text: string;
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
            text: `官方配置修订是 ${actual}，当前前端约定 ${FRONTEND_CONTRACT.configRevision}（对应上游 ${FRONTEND_CONTRACT.upstreamTag}）。`,
        });
    }
    return messages;
}

export function checkProjectListContract(payload: unknown): ContractMessage[] {
    if (typeof payload === 'string') {
        if (payload.includes(FRONTEND_CONTRACT.projectColumns)) return [];
        return [{ code: 'project-list', text: `项目列表不再包含「${FRONTEND_CONTRACT.projectColumns}」。` }];
    }
    if (!isRecord(payload) || !Array.isArray(payload.projects)) {
        return [{ code: 'project-list', text: '项目列表不是官方页面读取的 projects 数组。' }];
    }
    const broken = payload.projects.some((item) => !isRecord(item) || typeof item.name !== 'string');
    if (broken) {
        return [{ code: 'project-list', text: '项目列表里的条目缺少 name。' }];
    }
    return [];
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

/** Pull the tool text out of a UI /rpc tools/call response. */
export function rpcToolText(body: unknown): string | undefined {
    if (!isRecord(body) || !isRecord(body.result)) return undefined;
    const content = body.result.content;
    if (!Array.isArray(content)) return undefined;
    const block = content.find((item) => isRecord(item) && typeof item.text === 'string');
    return isRecord(block) && typeof block.text === 'string' ? block.text : undefined;
}
