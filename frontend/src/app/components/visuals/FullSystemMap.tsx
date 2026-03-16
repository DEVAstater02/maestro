"use client";

import { motion } from "framer-motion";

interface SystemMapNode {
  id: string;
  label: string;
  type?: string;
}

interface SystemMapLink {
  source: string;
  target: string;
  label?: string;
}

interface FullSystemMapProps {
  data: {
    title: string;
    nodes: SystemMapNode[];
    links: SystemMapLink[];
  };
}

/**
 * FullSystemMap — renders an interactive node-link diagram for
 * architectural overviews. Uses SVG for positioning.
 */
export default function FullSystemMap({ data }: FullSystemMapProps) {
  const { nodes, links, title } = data;

  // Simple force-free layout: arrange nodes in a circle
  const cx = 300;
  const cy = 250;
  const radius = Math.min(180, 50 + nodes.length * 20);

  const nodePositions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((node, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    nodePositions[node.id] = {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });

  const getNodeColor = (type?: string) => {
    switch (type) {
      case "database":
        return "#00BCD4";
      case "queue":
        return "#FF9800";
      case "gateway":
      case "load_balancer":
        return "#AB47BC";
      default:
        return "#00E676"; // Maestro Green
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6">
      {/* Title */}
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="maestro-breadcrumb mb-6"
      >
        SYSTEM MAP / {title.toUpperCase()}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="maestro-card rounded-2xl p-4 max-w-2xl w-full"
      >
        <svg viewBox="0 0 600 500" className="w-full h-auto">
          {/* Links */}
          {links.map((link, i) => {
            const from = nodePositions[link.source];
            const to = nodePositions[link.target];
            if (!from || !to) return null;

            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;

            return (
              <motion.g
                key={`link-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1.5"
                />
                {link.label && (
                  <text
                    x={midX}
                    y={midY - 6}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.3)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {link.label}
                  </text>
                )}
              </motion.g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const pos = nodePositions[node.id];
            if (!pos) return null;
            const color = getNodeColor(node.type);

            return (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
              >
                {/* Glow */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="28"
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  opacity="0.2"
                />
                {/* Node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="20"
                  fill="rgba(0,0,0,0.6)"
                  stroke={color}
                  strokeWidth="1.5"
                />
                {/* Label */}
                <text
                  x={pos.x}
                  y={pos.y + 32}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.7)"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {node.label}
                </text>
                {/* Type badge */}
                {node.type && (
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fill={color}
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {node.type.slice(0, 3).toUpperCase()}
                  </text>
                )}
              </motion.g>
            );
          })}
        </svg>
      </motion.div>
    </div>
  );
}
