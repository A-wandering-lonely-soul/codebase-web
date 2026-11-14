import { useEffect, useRef } from 'react';
import type { LayoutEdge, LayoutNode } from './backend';

type GraphCanvasProps = {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
};

const DRAW_LIMIT = 800;

export function GraphCanvas({ nodes, edges }: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const { width, height } = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const drawn = nodes.slice(0, DRAW_LIMIT);
    if (drawn.length === 0) return;
    const xs = drawn.map((node) => node.x);
    const zs = drawn.map((node) => node.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const spanX = maxX - minX || 1;
    const spanZ = maxZ - minZ || 1;
    const pad = 24;
    const point = (node: LayoutNode) => ({
      x: pad + ((node.x - minX) / spanX) * (width - pad * 2),
      y: pad + ((node.z - minZ) / spanZ) * (height - pad * 2),
    });
    const byId = new Map(drawn.map((node) => [node.id, node]));

    context.strokeStyle = 'rgba(120, 144, 156, 0.35)';
    context.lineWidth = 1;
    for (const edge of edges) {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) continue;
      const from = point(source);
      const to = point(target);
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }

    for (const node of drawn) {
      const at = point(node);
      context.beginPath();
      context.fillStyle = node.color || '#2f6fed';
      context.arc(at.x, at.y, 3.5, 0, Math.PI * 2);
      context.fill();
    }
  }, [nodes, edges]);

  return <canvas ref={canvasRef} className="graph-canvas" aria-label="代码图谱" />;
}
