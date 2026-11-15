/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchLayout, type LayoutLink, type LayoutPoint } from './api';
import type { ContractMessage } from './contract';

const DRAW_CAP = 50000;
const HALO_COUNT = 12;
const LABEL_COUNT = 48;

type GraphViewProps = {
  project: string;
  active: boolean;
  onMessages: (messages: ContractMessage[]) => void;
};

type Placed = LayoutPoint & { nx: number; ny: number; nz: number };

export function GraphView({ project, active, onMessages }: GraphViewProps) {
  const [points, setPoints] = useState<LayoutPoint[]>([]);
  const [links, setLinks] = useState<LayoutLink[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || !project) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    void fetchLayout(project)
      .then((layout) => {
        if (cancelled) return;
        setPoints(layout.points);
        setLinks(layout.links);
        setTotal(layout.totalNodes);
        onMessages(layout.messages);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : '图数据读取失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, project, onMessages]);

  const drawn = useMemo(() => samplePoints(points, DRAW_CAP), [points]);
  if (!active) return null;

  if (!project) {
    return <p className="empty">先在「项目」里选择一个索引，再查看图谱。</p>;
  }

  return (
    <section className="stack graph-panel">
      <header className="page-head">
        <div>
          <h2>{project}</h2>
          <p className="muted">拖拽旋转，滚轮缩放，指针停在节点上可查看信息。</p>
        </div>
        <span className="muted">节点 {total} · 绘制 {drawn.length}{drawn.length < points.length ? '（抽样）' : ''} · 连线 {links.length}</span>
      </header>
      {loading ? <p className="muted">正在读取图数据…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <GraphCanvas points={drawn} links={links} />
    </section>
  );
}

function GraphCanvas({ points, links }: { points: LayoutPoint[]; links: LayoutLink[] }) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [tip, setTip] = useState<HoverTip | null>(null);
  const camera = useRef({ yaw: 0.6, pitch: 0.35, dist: 1.85 });
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const hits = useRef<CloudHit[]>([]);
  const hoveredId = useRef<number | null>(null);
  const cloud = useMemo(() => placePoints(points), [points]);

  const draw = useCallback(() => {
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    hits.current = paintCloud(context, rect.width, rect.height, cloud.placed, cloud.span, links, camera.current, hoveredId.current);
  }, [canvas, cloud, links]);

  useEffect(() => {
    draw();
    if (!canvas) return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    const theme = new MutationObserver(draw);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-color-scheme'] });
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.current.dist = clamp(camera.current.dist * (event.deltaY > 0 ? 1.08 : 0.92), 0.32, 6.5);
      hoveredId.current = null;
      setTip(null);
      draw();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      theme.disconnect();
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [canvas, draw]);

  function showHit(hit: CloudHit | null) {
    const next = hit?.point.id ?? null;
    if (hoveredId.current === next) return;
    hoveredId.current = next;
    draw();
    setTip(hit ? { point: hit.point, x: hit.x, y: hit.y } : null);
  }

  return (
    <div className="graph-frame">
      <canvas
        ref={setCanvas}
        className={tip ? 'graph-canvas pointing' : 'graph-canvas'}
        aria-label="代码图谱点云"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, y: event.clientY, yaw: camera.current.yaw, pitch: camera.current.pitch };
          showHit(null);
        }}
        onPointerMove={(event) => {
          if (drag.current) {
            camera.current.yaw = drag.current.yaw + (event.clientX - drag.current.x) * 0.007;
            camera.current.pitch = clamp(drag.current.pitch + (event.clientY - drag.current.y) * 0.005, -1.15, 1.15);
            draw();
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          showHit(pickHit(hits.current, event.clientX - rect.left, event.clientY - rect.top));
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerLeave={() => showHit(null)}
      />
      <span className="graph-hint">拖拽旋转 · 滚轮缩放 · 悬停查看</span>
      {tip ? <NodeTip tip={tip} /> : null}
    </div>
  );
}

type CloudHit = { point: Placed; x: number; y: number; radius: number; depth: number };
type HoverTip = { point: Placed; x: number; y: number };

function NodeTip({ tip }: { tip: HoverTip }) {
  const { point } = tip;
  const lines = point.startLine
    ? point.endLine && point.endLine !== point.startLine
      ? `L${point.startLine}-${point.endLine}`
      : `L${point.startLine}`
    : '';
  const left = tip.x > 460 ? tip.x - 248 : tip.x + 14;
  const top = Math.max(12, tip.y - 12);
  return (
    <div className="node-tip" style={{ left, top }} role="tooltip">
      <header>
        <i style={{ background: point.color || '#5b8def' }} />
        <strong>{point.name || '未命名'}</strong>
        {point.label ? <span>{point.label}</span> : null}
      </header>
      {point.filePath ? <p>{point.filePath}{lines ? ` ${lines}` : ''}</p> : null}
      {point.inCalls !== undefined || point.outCalls !== undefined ? (
        <p className="tip-rows">
          {point.inCalls !== undefined ? <span>入向 {point.inCalls}</span> : null}
          {point.outCalls !== undefined ? <span>出向 {point.outCalls}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

function pickHit(hits: CloudHit[], x: number, y: number): CloudHit | null {
  let best: CloudHit | null = null;
  for (const hit of hits) {
    const distance = Math.hypot(hit.x - x, hit.y - y);
    if (distance > Math.max(10, hit.radius * 1.8)) continue;
    if (!best || hit.depth < best.depth) best = hit;
  }
  return best;
}

function samplePoints(points: LayoutPoint[], cap: number): LayoutPoint[] {
  if (points.length <= cap) return points;
  const step = Math.ceil(points.length / cap);
  const sampled: LayoutPoint[] = [];
  for (let index = 0; index < points.length; index += step) sampled.push(points[index]);
  return sampled;
}

function placePoints(points: LayoutPoint[]): { placed: Placed[]; span: number } {
  if (points.length === 0) return { placed: [], span: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    minZ = Math.min(minZ, point.z);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
    maxZ = Math.max(maxZ, point.z);
  }
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  return {
    span,
    placed: points.map((point) => ({
      ...point,
      nx: (point.x - cx) / span,
      ny: (point.y - cy) / span,
      nz: (point.z - cz) / span,
    })),
  };
}

type Projected = { point: Placed; x: number; y: number; radius: number; depth: number };

function paintCloud(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: Placed[],
  span: number,
  links: LayoutLink[],
  camera: { yaw: number; pitch: number; dist: number },
  hoveredId: number | null,
): CloudHit[] {
  context.fillStyle = '#0d0f12';
  context.fillRect(0, 0, width, height);

  const projected = points.map((point) => project(point, camera, width, height, span));
  const byId = new Map(projected.map((item) => [item.point.id, item]));
  paintEdges(context, links, byId);
  paintHalos(context, projected);
  paintCores(context, projected, hoveredId);
  paintLabels(context, projected, width);

  return projected.map((item) => ({ point: item.point, x: item.x, y: item.y, radius: item.radius, depth: item.depth }));
}

function paintEdges(context: CanvasRenderingContext2D, links: LayoutLink[], byId: Map<number, Projected>) {
  const step = Math.max(1, Math.ceil(links.length / 20000));
  const near: Array<[number, number, number, number]> = [];
  const far: Array<[number, number, number, number]> = [];
  for (let index = 0; index < links.length; index += step) {
    const link = links[index];
    const source = byId.get(link.source);
    const target = byId.get(link.target);
    if (!source || !target) continue;
    if (Math.hypot(source.x - target.x, source.y - target.y) < 1.5) continue;
    const same = clusterKey(source.point.filePath) !== '' && clusterKey(source.point.filePath) === clusterKey(target.point.filePath);
    (same ? near : far).push([source.x, source.y, target.x, target.y]);
  }
  context.lineWidth = 1;
  context.strokeStyle = '#8ea4b8';
  strokeSegments(context, far, edgeAlpha(false, links.length));
  strokeSegments(context, near, edgeAlpha(true, links.length));
  context.globalAlpha = 1;
}

function strokeSegments(context: CanvasRenderingContext2D, segments: Array<[number, number, number, number]>, alpha: number) {
  if (segments.length === 0 || alpha <= 0.01) return;
  context.globalAlpha = alpha;
  context.beginPath();
  for (const [x1, y1, x2, y2] of segments) {
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
  }
  context.stroke();
}

function paintHalos(context: CanvasRenderingContext2D, projected: Projected[]) {
  const hubs = [...projected].sort((a, b) => b.point.size - a.point.size).slice(0, HALO_COUNT);
  context.globalCompositeOperation = 'lighter';
  for (const hub of hubs) {
    const radius = Math.max(16, hub.radius * 6);
    const glow = context.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, radius);
    const color = hub.point.color || '#5b8def';
    glow.addColorStop(0, withAlpha(color, 0.55));
    glow.addColorStop(0.35, withAlpha(color, 0.16));
    glow.addColorStop(1, withAlpha(color, 0));
    context.fillStyle = glow;
    context.beginPath();
    context.arc(hub.x, hub.y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalCompositeOperation = 'source-over';
}

function paintCores(context: CanvasRenderingContext2D, projected: Projected[], hoveredId: number | null) {
  const buckets = new Map<string, Projected[]>();
  let hovered: Projected | null = null;
  for (const item of projected) {
    if (item.point.id === hoveredId) {
      hovered = item;
      continue;
    }
    const color = item.point.color || '#5b8def';
    const list = buckets.get(color);
    if (list) list.push(item);
    else buckets.set(color, [item]);
  }
  for (const [color, items] of buckets) fillDisks(context, items, color);
  if (!hovered) return;
  fillDisks(context, [hovered], hovered.point.color || '#5b8def');
  context.strokeStyle = '#ffffff';
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(hovered.x, hovered.y, hovered.radius + 3.5, 0, Math.PI * 2);
  context.stroke();
}

function fillDisks(context: CanvasRenderingContext2D, items: Projected[], color: string) {
  context.fillStyle = color;
  for (let start = 0; start < items.length; start += 4000) {
    const end = Math.min(items.length, start + 4000);
    context.beginPath();
    for (let index = start; index < end; index += 1) {
      const item = items[index];
      context.moveTo(item.x + item.radius, item.y);
      context.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    }
    context.fill();
  }
}

function paintLabels(context: CanvasRenderingContext2D, projected: Projected[], width: number) {
  const ranked = [...projected].sort((a, b) => b.point.size - a.point.size).slice(0, 80);
  const occupied: Array<{ x: number; y: number; w: number; h: number }> = [];
  context.font = '11px sans-serif';
  context.textBaseline = 'middle';
  context.fillStyle = 'rgba(231, 238, 246, 0.92)';
  context.shadowColor = 'rgba(0, 0, 0, 0.7)';
  context.shadowBlur = 3;
  let drawn = 0;
  for (const item of ranked) {
    const name = item.point.name;
    if (!name || drawn >= LABEL_COUNT) continue;
    const text = name.length > 28 ? `${name.slice(0, 27)}…` : name;
    const metrics = context.measureText(text);
    const box = { x: item.x + item.radius + 5, y: item.y, w: metrics.width, h: 14 };
    if (box.x + box.w > width - 8) continue;
    if (occupied.some((other) => Math.abs(other.x - box.x) < (other.w + box.w) / 2 + 6 && Math.abs(other.y - box.y) < 16)) continue;
    context.fillText(text, box.x, box.y);
    occupied.push(box);
    drawn += 1;
  }
  context.shadowBlur = 0;
}

function project(point: Placed, camera: { yaw: number; pitch: number; dist: number }, width: number, height: number, span: number): Projected {
  const cy = Math.cos(camera.yaw);
  const sy = Math.sin(camera.yaw);
  const cp = Math.cos(camera.pitch);
  const sp = Math.sin(camera.pitch);
  const x1 = point.nx * cy - point.nz * sy;
  const z1 = point.nx * sy + point.nz * cy;
  const y1 = point.ny * cp - z1 * sp;
  const z2 = point.ny * sp + z1 * cp;
  const depth = camera.dist - z2;
  const perspective = (Math.min(width, height) * 0.92) / Math.max(0.2, depth);
  const radius = Math.min(11, Math.max(0.85, (Math.max(point.size, 0.6) * 0.5 / span) * perspective));
  return {
    point,
    x: width / 2 + x1 * perspective,
    y: height / 2 - y1 * perspective,
    radius,
    depth,
  };
}

function clusterKey(filePath?: string): string {
  if (!filePath) return '';
  const parts = filePath.split(/[\\/]+/).filter(Boolean);
  return parts.slice(0, Math.min(2, parts.length)).join('/');
}

function edgeIntensityScale(count: number): number {
  if (count <= 2500) return 1;
  return Math.max(0.05, Math.sqrt(2500 / count));
}

function edgeAlpha(sameCluster: boolean, count: number): number {
  const ported = sameCluster ? 0.25 : 0.06;
  if (count >= 30000) return ported * edgeIntensityScale(count);
  const readable = sameCluster ? 0.62 : 0.3;
  if (count <= 2000) return readable;
  const atWash = ported * edgeIntensityScale(30000);
  const share = Math.log(count / 2000) / Math.log(30000 / 2000);
  return readable * (atWash / readable) ** share;
}

function withAlpha(color: string, alpha: number): string {
  const match = /^#([\da-f]{6})$/i.exec(color.trim());
  if (!match) return color;
  const value = Number.parseInt(match[1], 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
