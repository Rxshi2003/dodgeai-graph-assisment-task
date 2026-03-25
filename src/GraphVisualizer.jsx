import React, { useMemo, useState, useCallback, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

// ─── Node colours per type ───────────────────────────────────────────────────
const NODE_COLORS = {
  Customer: '#3b82f6',
  Order: '#10b981',
  Product: '#f59e0b',
  Delivery: '#8b5cf6',
  Invoice: '#ec4899',
  Payment: '#14b8a6',
  JournalEntry: '#f97316',
  Address: '#06b6d4',
};
const DEFAULT_COLOR = '#64748b';
const HIGHLIGHT_RING = '#facc15';   // yellow ring on selected/neighbour
const DIM_ALPHA = 0.15;        // opacity for non-highlighted nodes

// ─── Transform API data → ForceGraph2D format ────────────────────────────────
function transformToGraph(data) {
  if (!data) return { nodes: [], links: [] };

  if (data.nodes && data.edges) {
    const nodes = data.nodes.map(n => ({
      id: n.id,
      name: n.label || n.id,
      type: n.type,
      val: 3,
      color: NODE_COLORS[n.type] || DEFAULT_COLOR,
      properties: n.properties || {}
    }));
    const links = data.edges.map(e => ({
      source: e.source,
      target: e.target,
      name: e.relation
    }));
    return { nodes, links };
  }

  // Fallback: tabular SQL rows
  if (!Array.isArray(data) || !data.length) return { nodes: [], links: [] };
  const nodesMap = new Map();
  const links = [];

  data.forEach((row, idx) => {
    const idKey = Object.keys(row).find(k => k.toLowerCase().endsWith('_id') || k === 'id');
    const rootId = idKey ? `${idKey}_${row[idKey]}` : `row_${idx}`;
    const rootLbl = idKey ? String(row[idKey]) : `Row ${idx}`;
    if (!nodesMap.has(rootId))
      nodesMap.set(rootId, {
        id: rootId, name: rootLbl, type: idKey || 'row', val: 3,
        color: '#3b82f6', properties: row
      });

    Object.entries(row).forEach(([k, v]) => {
      if (v == null || k === idKey) return;
      if (k.toLowerCase().endsWith('_id')) {
        const tid = `${k}_${v}`;
        if (!nodesMap.has(tid))
          nodesMap.set(tid, { id: tid, name: String(v), type: k, val: 2, color: '#10b981', properties: {} });
        links.push({ source: rootId, target: tid, name: k });
      }
    });
  });
  return { nodes: Array.from(nodesMap.values()), links };
}

const LEGEND = Object.entries(NODE_COLORS);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const GraphVisualizer = ({ data }) => {
  const graphData = useMemo(() => transformToGraph(data), [data]);

  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const fgRef = useRef();

  // Build neighbour index once per graphData
  const neighborMap = useMemo(() => {
    const map = new Map();
    graphData.links.forEach(link => {
      const src = typeof link.source === 'object' ? link.source.id : link.source;
      const tgt = typeof link.target === 'object' ? link.target.id : link.target;
      if (!map.has(src)) map.set(src, new Set());
      if (!map.has(tgt)) map.set(tgt, new Set());
      map.get(src).add(tgt);
      map.get(tgt).add(src);
    });
    return map;
  }, [graphData]);

  // ── Click handler ──────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((node) => {
    if (selectedNode?.id === node.id) {
      // Deselect
      setSelectedNode(null);
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      return;
    }

    setSelectedNode(node);

    const hNodes = new Set([node.id]);
    const hLinks = new Set();

    (neighborMap.get(node.id) || new Set()).forEach(nid => hNodes.add(nid));

    graphData.links.forEach(link => {
      const src = typeof link.source === 'object' ? link.source.id : link.source;
      const tgt = typeof link.target === 'object' ? link.target.id : link.target;
      if (src === node.id || tgt === node.id) hLinks.add(link);
    });

    setHighlightNodes(hNodes);
    setHighlightLinks(hLinks);

    // Pan to selected node
    fgRef.current?.centerAt(node.x, node.y, 600);
    fgRef.current?.zoom(2.5, 600);
  }, [selectedNode, neighborMap, graphData.links]);

  // ── Node paint ─────────────────────────────────────────────────────────────
  const paintNode = useCallback((node, ctx, globalScale) => {
    const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const radius = isSelected ? 8 : 5;
    const alpha = isHighlighted ? 1 : DIM_ALPHA;
    const color = NODE_COLORS[node.type] || DEFAULT_COLOR;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Ring for selected / neighbour
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
      ctx.fillStyle = HIGHLIGHT_RING;
      ctx.fill();
    } else if (highlightNodes.has(node.id) && highlightNodes.size > 0) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(250,204,21,0.4)';
      ctx.fill();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    // Label
    const fontSize = Math.max(8 / globalScale, 2.5);
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = isHighlighted ? '#111827' : '#9ca3af';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(node.name.length > 18 ? node.name.slice(0, 16) + '…' : node.name,
      node.x, node.y + radius + 1);

    ctx.restore();
  }, [highlightNodes, selectedNode]);

  // ── Link colour based on highlight ────────────────────────────────────────
  const linkColor = useCallback((link) => {
    if (highlightLinks.size === 0) return '#cbd5e1';
    return highlightLinks.has(link) ? '#facc15' : `rgba(203,213,225,${DIM_ALPHA})`;
  }, [highlightLinks]);

  const linkWidth = useCallback((link) =>
    highlightLinks.has(link) ? 2.5 : 1,
    [highlightLinks]);

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!data || (Array.isArray(data) && !data.length)) {
    return (
      <div style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>
        <p>No data to visualize.</p>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', height: '100%', minHeight: 420,
      backgroundColor: '#f8fafc', borderRadius: 8,
      overflow: 'hidden', position: 'relative', fontFamily: 'Inter, sans-serif'
    }}>

      {/* ── Title ── */}
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 10,
        background: 'rgba(255,255,255,0.9)', padding: '5px 10px',
        borderRadius: 6, fontSize: '0.8rem', fontWeight: 700,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
      }}>
        Interactive Relationship Graph
      </div>

      {/* ── Hint ── */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 10,
        background: 'rgba(255,255,255,0.85)', padding: '4px 9px',
        borderRadius: 6, fontSize: '0.72rem', color: '#6b7280',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
      }}>
        Click a node to inspect &amp; highlight connections
      </div>

      {/* ── Legend ── */}
      <div style={{
        position: 'absolute', bottom: 14, left: 10, zIndex: 10,
        background: 'rgba(255,255,255,0.92)', padding: '8px 12px',
        borderRadius: 8, fontSize: '0.72rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column', gap: 4
      }}>
        {LEGEND.map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              backgroundColor: color, display: 'inline-block', flexShrink: 0
            }} />
            <span style={{ color: '#374151' }}>{type}</span>
          </div>
        ))}
      </div>

      {/* ── Metadata Panel ── */}
      {selectedNode && (
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 20,
          background: 'rgba(255,255,255,0.97)',
          border: `2px solid ${NODE_COLORS[selectedNode.type] || DEFAULT_COLOR}`,
          borderRadius: 10, padding: '12px 14px', minWidth: 220, maxWidth: 300,
          maxHeight: 'calc(100% - 24px)',
          overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', fontSize: '0.78rem'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{
              background: NODE_COLORS[selectedNode.type] || DEFAULT_COLOR,
              color: '#fff', borderRadius: 4, padding: '2px 8px',
              fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.05em'
            }}>
              {selectedNode.type?.toUpperCase() || 'NODE'}
            </span>
            <button onClick={() => { setSelectedNode(null); setHighlightNodes(new Set()); setHighlightLinks(new Set()); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9ca3af', fontSize: '1rem', lineHeight: 1
              }}>✕</button>
          </div>

          {/* ID & Label */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 700, color: '#111827', wordBreak: 'break-all' }}>
              {selectedNode.name}
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.7rem' }}>{selectedNode.id}</div>
          </div>

          {/* Connections count */}
          <div style={{
            color: '#374151', marginBottom: 8, padding: '4px 0',
            borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9'
          }}>
            🔗 <strong>{(neighborMap.get(selectedNode.id) || new Set()).size}</strong> connection(s)
          </div>

          {/* Properties */}
          {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
            <div>
              <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Properties</div>
              <div>
                {Object.entries(selectedNode.properties)
                  .filter(([, v]) => v !== null && v !== '' && v !== undefined)
                  .map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                      <span style={{ color: '#9ca3af', flexShrink: 0, minWidth: 80 }}>{k}:</span>
                      <span style={{ color: '#111827', wordBreak: 'break-all' }}>
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Graph ── */}
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeCanvasObject={paintNode}
        nodeCanvasObjectMode={() => 'replace'}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
          ctx.fill();
        }}
        onNodeClick={handleNodeClick}
        onBackgroundClick={() => {
          setSelectedNode(null);
          setHighlightNodes(new Set());
          setHighlightLinks(new Set());
        }}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkLabel="name"
        linkDirectionalParticles={link => highlightLinks.has(link) ? 3 : 0}
        linkDirectionalParticleWidth={2.5}
        linkDirectionalParticleColor={() => HIGHLIGHT_RING}
        cooldownTicks={120}
        enableNodeDrag={true}
      />
    </div>
  );
};

export default GraphVisualizer;
