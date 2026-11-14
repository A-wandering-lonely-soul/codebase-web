import { describe, expect, test } from 'bun:test';
import { checkConfigContract, checkLayoutContract, checkProjectListContract } from './contract';
import { parseProjectList } from './parseProjects';

describe('official contract', () => {
  test('accepts the revision read from codebase-memory-mcp 0.12.1', () => {
    expect(checkConfigContract({ revision: '3', settings: [] })).toEqual([]);
  });

  test('reports a newer config revision', () => {
    const messages = checkConfigContract({ revision: '4', settings: [] });
    expect(messages.map((item) => item.code)).toEqual(['config-revision']);
  });

  test('reports a project list whose columns changed', () => {
    expect(checkProjectListContract('projects: 0')).toHaveLength(1);
    expect(checkProjectListContract('projects: 1  (cols: name root_path branch)')).toEqual([]);
  });

  test('reports a layout node that lost coordinates', () => {
    const messages = checkLayoutContract({
      nodes: [{ id: 1, name: 'main' }],
      edges: [],
      total_nodes: 1,
    });
    expect(messages.some((item) => item.text.includes('x'))).toBe(true);
  });

  test('keeps a root path that contains spaces', () => {
    const text = ['projects: 1  (cols: name root_path branch)', '  app D:/work/my app main', 'total: 1'].join('\n');
    expect(parseProjectList(text)).toEqual([{ name: 'app', rootPath: 'D:/work/my app', branch: 'main' }]);
  });
});
