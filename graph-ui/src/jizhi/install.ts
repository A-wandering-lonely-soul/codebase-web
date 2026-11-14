import {
    checkConfigContract,
    checkLayoutContract,
    checkProjectListContract,
    rpcToolText,
    type ContractMessage,
} from './contract';

const BANNER_ID = 'jizhi-contract-notice';

const messages = new Map<ContractMessage['code'], ContractMessage>();

function requestUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    return input.url;
}

function bodyText(input: RequestInfo | URL, init: RequestInit | undefined): string {
    if (typeof init?.body === 'string') return init.body;
    if (typeof input !== 'string' && !(input instanceof URL) && typeof input.body === 'string') return '';
    return '';
}

function paint(): void {
    const existing = document.getElementById(BANNER_ID);
    const items = [...messages.values()];
    if (items.length === 0) {
        existing?.remove();
        return;
    }
    const section = existing ?? document.createElement('section');
    section.id = BANNER_ID;
    section.setAttribute('role', 'alert');
    section.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = '官方数据和当前前端不匹配';
    const detail = document.createElement('p');
    detail.textContent = '页面仍是上游 graph-ui。下面的差异说明官方服务返回的数据和这版前端约定的不一样。';
    const list = document.createElement('ul');
    for (const item of items) {
        const row = document.createElement('li');
        row.textContent = item.text;
        list.append(row);
    }
    section.append(title, detail, list);
    if (existing === null) document.body.prepend(section);
}

function replace(code: ContractMessage['code'], next: ContractMessage[]): void {
    messages.delete(code);
    for (const item of next) messages.set(item.code, item);
    paint();
}

function inspect(url: string, requestBody: string, payload: unknown): void {
    const path = url.split('?')[0] ?? url;
    if (path.endsWith('/api/config') && !requestBody) {
        const found = checkConfigContract(payload);
        replace('config-shape', found.filter((item) => item.code === 'config-shape'));
        replace('config-revision', found.filter((item) => item.code === 'config-revision'));
        return;
    }
    if (path.endsWith('/api/layout')) {
        replace('layout-shape', checkLayoutContract(payload));
        return;
    }
    if (path.endsWith('/rpc') && requestBody.includes('"list_projects"')) {
        const text = rpcToolText(payload);
        if (text === undefined) {
            replace('project-list', [{ code: 'project-list', text: '项目列表没有返回官方页面能读的文本。' }]);
            return;
        }
        try {
            replace('project-list', checkProjectListContract(JSON.parse(text) as unknown));
        } catch {
            replace('project-list', checkProjectListContract(text));
        }
    }
}

export function installContractNotice(): void {
    if (document.getElementById('jizhi-contract-style') === null) {
        const style = document.createElement('style');
        style.id = 'jizhi-contract-style';
        style.textContent = [
            '#jizhi-contract-notice {',
            'position: fixed; z-index: 100000; top: 12px; left: 12px; right: 12px;',
            'padding: 12px 16px; border: 1px solid #e2b340; border-radius: 12px;',
            'background: #fff8e8; color: #172033; font: 14px/1.5 "Segoe UI", "PingFang SC", sans-serif;',
            '}',
            '#jizhi-contract-notice strong { display: block; font-size: 16px; }',
            '#jizhi-contract-notice p, #jizhi-contract-notice ul { margin: 6px 0 0; }',
        ].join('');
        document.head.append(style);
    }
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
        const response = await original(input, init);
        if (response.ok) {
            const url = requestUrl(input);
            const requestBody = bodyText(input, init);
            void response.clone().json().then(
                (payload: unknown) => inspect(url, requestBody, payload),
                () => undefined,
            );
        }
        return response;
    };
}
