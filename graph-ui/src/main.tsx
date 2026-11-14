import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installUiLog } from './app/ui-log-install';
// 畿智：官方数据约定对不上时提示。只加这一处，其余页面保持上游原样。见 src/jizhi。
import { installContractNotice } from './jizhi/install';
// Erst die Tokens, dann das Chrome, das sie benutzt. Die Reihenfolge ist keine
// Kosmetik: eine Regel, die eine noch nicht definierte Variable liest, faellt
// still auf ihren Initialwert zurueck.
import './styles/tokens.css';
import './styles/terminal.css';
import './styles/workspace.css';

// Before anything else can fail: the console keeps printing, and from here
// on a copy of every line, every uncaught error and every failed request
// reaches the server's file (app/ui-log.ts, GET /api/ui-log).
installUiLog();
installContractNotice();

const container = document.getElementById('root');
if (container === null) {
  throw new Error('#root fehlt in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
