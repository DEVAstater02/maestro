"use client";

import { motion } from "framer-motion";

interface SpatialMapNode {
  id: string;
  label: string;
  type?: string;
  shape?: string;
}

interface SpatialMapLink {
  source: string;
  target: string;
  label?: string;
}

interface FullSystemMapProps {
  data: {
    title: string;
    nodes: SpatialMapNode[];
    links: SpatialMapLink[];
    focus_node_id?: string;
  };
}

interface LayoutNode {
  x: number;
  y: number;
  depth: number;
  scale: number;
  blur: number;
  opacity: number;
}

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 680;
const CENTER_X = VIEWBOX_WIDTH / 2;
const CENTER_Y = VIEWBOX_HEIGHT / 2 - 8;

function resolveFocusNodeId(nodes: SpatialMapNode[], focusNodeId?: string) {
  if (!nodes.length) return "";
  if (focusNodeId && nodes.some((node) => node.id === focusNodeId)) return focusNodeId;
  return nodes[0]?.id ?? "";
}

function buildLayout(nodes: SpatialMapNode[], focusNodeId: string) {
  const positions: Record<string, LayoutNode> = {};
  const others = nodes.filter((node) => node.id !== focusNodeId);

  if (focusNodeId) {
    positions[focusNodeId] = {
      x: CENTER_X,
      y: CENTER_Y,
      depth: 0,
      scale: 1.14,
      blur: 0,
      opacity: 1,
    };
  }

  others.forEach((node, index) => {
    const progress = others.length === 1 ? 0.5 : index / Math.max(1, others.length - 1);
    const angle = -Math.PI * 0.92 + progress * Math.PI * 1.84;
    const orbitX = 300 + (index % 2) * 24;
    const orbitY = 182 + (index % 3) * 12;
    const depth = (1 - Math.sin(angle)) / 2;

    positions[node.id] = {
      x: CENTER_X + Math.cos(angle) * orbitX,
      y: CENTER_Y + Math.sin(angle) * orbitY - depth * 44,
      depth,
      scale: 0.62 + (1 - depth) * 0.3,
      blur: 1.5 + depth * 6.5,
      opacity: 0.26 + (1 - depth) * 0.42,
    };
  });

  return positions;
}

function buildPath(from: LayoutNode, to: LayoutNode) {
  const distanceX = Math.abs(to.x - from.x);
  const distanceY = Math.abs(to.y - from.y);
  const lift = 70 + distanceX * 0.16 + distanceY * 0.14;
  const controlOneX = from.x + (CENTER_X - from.x) * 0.42;
  const controlTwoX = to.x + (CENTER_X - to.x) * 0.42;

  return [
    `M ${from.x.toFixed(1)} ${from.y.toFixed(1)}`,
    `C ${controlOneX.toFixed(1)} ${(from.y - lift).toFixed(1)},`,
    `${controlTwoX.toFixed(1)} ${(to.y - lift).toFixed(1)},`,
    `${to.x.toFixed(1)} ${to.y.toFixed(1)}`,
  ].join(" ");
}

function resolveShape(node: SpatialMapNode) {
  if (node.shape === "hex") return "hex";
  const nodeType = node.type?.toLowerCase() ?? "";
  if (["database", "queue", "cache", "storage", "gateway"].includes(nodeType)) return "hex";
  return "orb";
}

function getNodeColor(node: SpatialMapNode, isFocus: boolean) {
  if (isFocus) return "#9DFFCC";

  switch (node.type?.toLowerCase()) {
    case "database":
    case "storage":
      return "#7CFFC2";
    case "queue":
    case "cache":
      return "#5EF4A4";
    case "gateway":
      return "#C2FF93";
    default:
      return "#00E676";
  }
}

function getHexagonPoints(x: number, y: number, radius: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 3) * index - Math.PI / 6;
    return `${(x + Math.cos(angle) * radius).toFixed(1)},${(y + Math.sin(angle) * radius).toFixed(1)}`;
  }).join(" ");
}

export default function FullSystemMap({ data }: FullSystemMapProps) {
  const focusNodeId = resolveFocusNodeId(data.nodes, data.focus_node_id);
  const layout = buildLayout(data.nodes, focusNodeId);
  const focusLabel = data.nodes.find((node) => node.id === focusNodeId)?.label;
  const orderedNodes = [...data.nodes].sort(
    (left, right) => (layout[right.id]?.depth ?? 0) - (layout[left.id]?.depth ?? 0)
  );

  return (
    <div className="w-full h-full flex items-center justify-center p-6 sm:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-6xl"
      >
        <div className="maestro-stage min-h-[620px] px-6 py-8 sm:px-8 sm:py-10">
          <div
            className="absolute inset-x-[12%] top-[8%] h-48 rounded-full blur-[90px] maestro-aura-breathe"
            style={{ background: "radial-gradient(circle, rgba(0,230,118,0.22) 0%, transparent 72%)" }}
          />
          <div
            className="absolute inset-x-[18%] bottom-[4%] h-36 rounded-full blur-[100px]"
            style={{ background: "radial-gradient(circle, rgba(0,90,46,0.20) 0%, transparent 72%)" }}
          />

          <div className="relative z-10 flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.45 }}
              className="flex items-center justify-between gap-4"
            >
              <p className="maestro-breadcrumb">SPATIAL MAP / {data.title.toUpperCase()}</p>
              {focusLabel && (
                <p className="maestro-breadcrumb">FOCUS / {focusLabel.toUpperCase()}</p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.16, duration: 0.55 }}
              className="maestro-projection-panel relative overflow-hidden rounded-[26px] px-4 py-4 sm:px-6 sm:py-5"
            >
              <div className="maestro-scanlines absolute inset-0 pointer-events-none" />
              <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="relative z-10 w-full h-auto">
                <defs>
                  <filter id="trail-glow">
                    <feGaussianBlur stdDeviation="5.5" result="blurred" />
                    <feMerge>
                      <feMergeNode in="blurred" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {data.links.map((link, index) => {
                  const from = layout[link.source];
                  const to = layout[link.target];

                  if (!from || !to) return null;

                  const path = buildPath(from, to);
                  const labelX = (from.x + to.x) / 2;
                  const labelY = Math.min(from.y, to.y) - 34;

                  return (
                    <motion.g
                      key={`${link.source}-${link.target}-${index}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.18 + index * 0.06, duration: 0.45 }}
                    >
                      <motion.path
                        d={path}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                          pathLength: 1,
                          opacity: [0.18, 0.42, 0.18],
                        }}
                        transition={{
                          pathLength: { delay: 0.22 + index * 0.07, duration: 0.7, ease: "easeOut" },
                          opacity: { duration: 3.1 + index * 0.15, repeat: Infinity, ease: "easeInOut" },
                        }}
                        stroke="rgba(0,230,118,0.22)"
                        strokeWidth="8"
                        fill="none"
                        filter="url(#trail-glow)"
                        strokeLinecap="round"
                      />
                      <motion.path
                        d={path}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                          pathLength: 1,
                          opacity: [0.4, 0.88, 0.4],
                        }}
                        transition={{
                          pathLength: { delay: 0.18 + index * 0.07, duration: 0.75, ease: "easeOut" },
                          opacity: { duration: 2.8 + index * 0.18, repeat: Infinity, ease: "easeInOut" },
                        }}
                        stroke="rgba(124,255,194,0.75)"
                        strokeWidth="1.8"
                        strokeDasharray="8 14"
                        fill="none"
                        strokeLinecap="round"
                      />
                      {link.label && (
                        <text
                          x={labelX}
                          y={labelY}
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.34)"
                          fontSize="10"
                          fontFamily="'JetBrains Mono', monospace"
                          letterSpacing="0.2em"
                        >
                          {link.label.toUpperCase()}
                        </text>
                      )}
                    </motion.g>
                  );
                })}

                {orderedNodes.map((node, index) => {
                  const position = layout[node.id];
                  if (!position) return null;

                  const isFocus = node.id === focusNodeId;
                  const shape = resolveShape(node);
                  const color = getNodeColor(node, isFocus);
                  const radius = isFocus ? 34 : 28;
                  const nodeStyle = isFocus
                    ? undefined
                    : {
                        filter: `blur(${position.blur}px)`,
                        opacity: position.opacity,
                      };

                  return (
                    <motion.g
                      key={node.id}
                      initial={{ opacity: 0, scale: 0.76 }}
                      animate={{ opacity: 1, scale: position.scale }}
                      transition={{ delay: 0.12 + index * 0.08, duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
                      style={nodeStyle}
                    >
                      {isFocus && (
                        <motion.circle
                          cx={position.x}
                          cy={position.y}
                          r="74"
                          fill="none"
                          stroke="rgba(0,230,118,0.18)"
                          strokeWidth="1.4"
                          animate={{ scale: [1, 1.05, 1], opacity: [0.28, 0.46, 0.28] }}
                          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                        />
                      )}

                      <circle
                        cx={position.x}
                        cy={position.y}
                        r={radius + 16}
                        fill={isFocus ? "rgba(0,230,118,0.10)" : "rgba(0,230,118,0.05)"}
                      />

                      {shape === "hex" ? (
                        <>
                          <polygon
                            points={getHexagonPoints(position.x, position.y, radius)}
                            fill="rgba(0,0,0,0.52)"
                            stroke={color}
                            strokeWidth={isFocus ? 2.2 : 1.6}
                          />
                          <polygon
                            points={getHexagonPoints(position.x, position.y, Math.max(radius - 9, 10))}
                            fill="none"
                            stroke="rgba(255,255,255,0.16)"
                            strokeWidth="0.8"
                          />
                        </>
                      ) : (
                        <>
                          <circle
                            cx={position.x}
                            cy={position.y}
                            r={radius}
                            fill="rgba(0,0,0,0.56)"
                            stroke={color}
                            strokeWidth={isFocus ? 2.2 : 1.5}
                          />
                          <circle
                            cx={position.x}
                            cy={position.y}
                            r={Math.max(radius - 12, 8)}
                            fill={isFocus ? "rgba(157,255,204,0.34)" : "rgba(0,230,118,0.16)"}
                          />
                        </>
                      )}

                      <text
                        x={position.x}
                        y={position.y + radius + 22}
                        textAnchor="middle"
                        fill={isFocus ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.68)"}
                        fontSize={isFocus ? "13" : "11"}
                        fontFamily="'JetBrains Mono', monospace"
                        letterSpacing="0.08em"
                      >
                        {node.label.toUpperCase()}
                      </text>

                      {node.type && (
                        <text
                          x={position.x}
                          y={position.y + 4}
                          textAnchor="middle"
                          fill={color}
                          fontSize={isFocus ? "10" : "9"}
                          fontFamily="'JetBrains Mono', monospace"
                          letterSpacing="0.18em"
                        >
                          {node.type.toUpperCase()}
                        </text>
                      )}
                    </motion.g>
                  );
                })}
              </svg>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
