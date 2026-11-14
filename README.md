# codebase-web

这个仓库的页面是官方 [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) `v0.12.1` 的 `graph-ui`，放在同名目录里，方便直接合并上游前端改动。MIT 许可证在仓库根目录的 `LICENSE`，第三方说明在 `graph-ui/THIRD_PARTY.md`。

相对上游只动了两处：

- `graph-ui/src/main.tsx` 多了一行，挂上版本提示
- `graph-ui/src/jizhi/` 是这边加的。官方配置修订不是 `"3"`，或图数据、项目列表缺了这版页面要读的字段时，页面顶部会提示

数据仍来自本机官方服务 `127.0.0.1:9749`。官方开发代理只接受 `localhost:5173` 和 `127.0.0.1:5173`。

```powershell
bun install
bun run dev
```

## 合并上游前端

```powershell
git remote add upstream https://github.com/DeusData/codebase-memory-mcp.git
git fetch upstream tag v0.12.2
git checkout -b upstream-graph-ui
git checkout upstream/v0.12.2 -- graph-ui
git add graph-ui
git commit -m "同步官方 graph-ui v0.12.2"
git checkout main
git merge upstream-graph-ui
```

合并后看 `graph-ui/src/main.tsx` 是否还留着 `installContractNotice`。`src/jizhi/` 不在上游，合并不会删掉它。官方数据约定变了的话，改 `graph-ui/src/jizhi/contract.ts` 里的修订号。
