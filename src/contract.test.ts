import { describe, expect, test } from 'bun:test';
import { checkConfigContract, checkLayoutContract, checkProjectListContract } from './contract';

describe('official contract', () => {
  test('accepts revision 3', () => {
    expect(checkConfigContract({ revision: '3', settings: [] })).toEqual([]);
  });

  test('reports a newer revision', () => {
    expect(checkConfigContract({ revision: '4', settings: [] })[0]?.code).toBe('config-revision');
  });

  test('accepts a json project list', () => {
    expect(checkProjectListContract({ projects: [{ name: 'app' }] })).toEqual([]);
  });

  test('reports a layout node without coordinates', () => {
    const messages = checkLayoutContract({ nodes: [{ id: 1, name: 'main' }], edges: [], total_nodes: 1 });
    expect(messages.some((item) => item.text.includes('x'))).toBe(true);
  });
});
