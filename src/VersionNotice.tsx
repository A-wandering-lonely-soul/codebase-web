import type { ContractMessage } from './contract';
import { FRONTEND_CONTRACT } from './contract';

type VersionNoticeProps = {
  messages: ContractMessage[];
};

export function VersionNotice({ messages }: VersionNoticeProps) {
  if (messages.length === 0) return null;
  return (
    <section className="version-notice" role="alert">
      <h2>官方数据和当前前端不匹配</h2>
      <p>图数据仍来自官方服务。下面列出的差异会导致节点、连线或项目列表显示不完整。</p>
      <ul>
        {messages.map((message) => (
          <li key={`${message.code}:${message.text}`}>{message.text}</li>
        ))}
      </ul>
      <p className="version-pin">当前前端约定的配置修订是 {FRONTEND_CONTRACT.configRevision}。</p>
    </section>
  );
}
