export type GraphProject = {
  name: string;
  rootPath: string;
  branch: string;
};

/**
 * `list_projects` returns plain text, not JSON:
 * `projects: N  (cols: name root_path branch)` followed by one row per line.
 * Branch is the last token, so a root path may contain spaces.
 */
export function parseProjectList(text: string): GraphProject[] {
  const projects: GraphProject[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.includes('cols:') || trimmed.startsWith('total:')) continue;
    if (trimmed.startsWith('returned:') || trimmed.startsWith('has_more:') || trimmed.startsWith('projects:')) {
      continue;
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length < 3) continue;
    const branch = parts[parts.length - 1] ?? '';
    const name = parts[0] ?? '';
    const rootPath = parts.slice(1, -1).join(' ');
    if (!name || !rootPath) continue;
    projects.push({ name, rootPath, branch: branch === '-' ? '' : branch });
  }
  return projects;
}
