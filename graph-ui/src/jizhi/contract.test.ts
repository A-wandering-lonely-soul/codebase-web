import { describe, expect, it } from 'vitest';
import { checkConfigContract, checkLayoutContract, checkProjectListContract, rpcToolText } from './contract';

describe('jizhi official contract', () => {
    it('accepts the revision read from codebase-memory-mcp 0.12.1', () => {
        expect(checkConfigContract({ revision: '3', settings: [] })).toEqual([]);
    });

    it('reports a newer config revision', () => {
        expect(checkConfigContract({ revision: '4', settings: [] }).map((item) => item.code)).toEqual(['config-revision']);
    });

    it('accepts the JSON project list the official page requests', () => {
        expect(checkProjectListContract({ projects: [{ name: 'code', root_path: 'D:/code' }] })).toEqual([]);
    });

    it('reports a text project list whose columns changed', () => {
        expect(checkProjectListContract('projects: 0')).toHaveLength(1);
    });

    it('reports a layout node that lost coordinates', () => {
        const messages = checkLayoutContract({ nodes: [{ id: 1, name: 'main' }], edges: [], total_nodes: 1 });
        expect(messages.some((item) => item.text.includes('x'))).toBe(true);
    });

    it('reads tool text from an rpc envelope', () => {
        expect(rpcToolText({ result: { content: [{ type: 'text', text: '{"projects":[]}' }] } })).toBe('{"projects":[]}');
    });
});
