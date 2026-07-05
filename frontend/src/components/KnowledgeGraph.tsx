import { useRef, useEffect, useCallback, useMemo } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import type { MemoryGraph, MemoryNode } from '../types';

interface Props {
  graph: MemoryGraph;
  onNodeClick: (node: MemoryNode) => void;
  typeColors: Record<string, string>;
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, unknown>;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  relationship: string;
}

export default function KnowledgeGraph({ graph, onNodeClick, typeColors }: Props) {
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = graph.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      properties: n.properties,
    }));

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links: GraphLink[] = graph.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({
        source: e.source,
        target: e.target,
        relationship: e.relationship,
      }));

    return { nodes, links };
  }, [graph]);

  useEffect(() => {
    const fg = fgRef.current;
    if (fg && graphData.nodes.length > 0) {
      setTimeout(() => fg.zoomToFit(400, 60), 300);
    }
  }, [graphData]);

  const nodeColor = useCallback(
    (node: GraphNode) => typeColors[node.type] ?? '#6b7280',
    [typeColors],
  );

  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const radius = 6;
      const color = nodeColor(node);
      const label = node.label.length > 30
        ? node.label.slice(0, 30) + '…'
        : node.label;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (globalScale > 0.8) {
        const fontSize = Math.max(10 / globalScale, 3);
        ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#374151';
        ctx.fillText(label, x, y + radius + 3);
      }
    },
    [nodeColor],
  );

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      onNodeClick({
        id: node.id,
        label: node.label,
        type: node.type,
        properties: node.properties,
      });
    },
    [onNodeClick],
  );

  return (
    <div className="w-full h-full">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={(node: GraphNode, color, ctx) => {
          ctx.beginPath();
          ctx.arc(node.x ?? 0, node.y ?? 0, 8, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        linkColor={() => '#d1d5db'}
        linkWidth={1.5}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={0.9}
        linkLabel={(link: GraphLink) => link.relationship}
        onNodeClick={handleNodeClick}
        backgroundColor="#f9fafb"
        warmupTicks={50}
        cooldownTicks={100}
      />
    </div>
  );
}
