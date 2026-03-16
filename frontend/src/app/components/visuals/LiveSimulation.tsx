"use client";

import { motion } from "framer-motion";

interface SimulationParameter {
  name: string;
  value: number;
}

interface LiveSimulationProps {
  data: {
    equation: string;
    variables_to_watch: string[];
    target_change: string;
    parameters?: SimulationParameter[];
  };
}

interface Point {
  x: number;
  y: number;
}

const WIDTH = 980;
const HEIGHT = 560;
const PAD_X = 56;
const PAD_Y = 46;
const SAMPLE_COUNT = 72;

const FUNCTION_MAP: Record<string, string> = {
  sin: "Math.sin",
  cos: "Math.cos",
  tan: "Math.tan",
  abs: "Math.abs",
  sqrt: "Math.sqrt",
  log: "Math.log",
  exp: "Math.exp",
  min: "Math.min",
  max: "Math.max",
  pow: "Math.pow",
  floor: "Math.floor",
  ceil: "Math.ceil",
  round: "Math.round",
};

function normalizeEquation(input: string) {
  let expression = input.trim();
  const equalsIndex = expression.indexOf("=");

  if (equalsIndex >= 0) {
    expression = expression.slice(equalsIndex + 1);
  }

  return expression
    .replaceAll("π", "pi")
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("−", "-")
    .replaceAll("^", "**")
    .trim();
}

function buildEvaluator(equation: string, parameters?: SimulationParameter[]) {
  const expression = normalizeEquation(equation);

  if (!expression || !/^[0-9+\-*/().,\s_a-z*]*$/i.test(expression)) {
    return (x: number) => Math.sin(x);
  }

  const parameterMap = new Map(
    (parameters ?? []).map((parameter) => [parameter.name.toLowerCase(), parameter.value.toString()])
  );
  const identifierPattern = /[A-Za-z_][A-Za-z0-9_]*/g;
  let isInvalid = false;
  const sanitizedExpression = expression.replace(identifierPattern, (identifier) => {
    const lowerIdentifier = identifier.toLowerCase();

    if (identifier === "x" || identifier === "t") {
      return identifier;
    }

    if (lowerIdentifier === "pi") return "Math.PI";
    if (lowerIdentifier === "e") return "Math.E";
    if (FUNCTION_MAP[lowerIdentifier]) return FUNCTION_MAP[lowerIdentifier];
    if (parameterMap.has(lowerIdentifier)) return `(${parameterMap.get(lowerIdentifier)})`;

    isInvalid = true;
    return identifier;
  });

  if (isInvalid) {
    return (x: number) => Math.sin(x);
  }

  try {
    const fn = new Function("x", "t", `"use strict"; return (${sanitizedExpression});`) as (
      x: number,
      t: number
    ) => number;

    return (x: number) => {
      const result = Number(fn(x, x));
      return Number.isFinite(result) ? result : Number.NaN;
    };
  } catch {
    return (x: number) => Math.sin(x);
  }
}

function inferDomain(equation: string): [number, number] {
  const normalized = normalizeEquation(equation).toLowerCase();

  if (/(sin|cos|tan)/.test(normalized)) return [-Math.PI * 2, Math.PI * 2];
  if (/\*\*2|x\s*\*\s*x/.test(normalized)) return [-6, 6];
  return [-10, 10];
}

function buildTargetEvaluator(
  evaluator: (x: number) => number,
  targetChange: string
) {
  const change = targetChange.toLowerCase();

  if (change.includes("shift left")) return (x: number) => evaluator(x + 0.9);
  if (change.includes("shift right")) return (x: number) => evaluator(x - 0.9);
  if (change.includes("increase amplitude") || change.includes("amplify")) {
    return (x: number) => evaluator(x) * 1.28;
  }
  if (change.includes("decrease amplitude") || change.includes("dampen")) {
    return (x: number) => evaluator(x) * 0.72;
  }
  if (change.includes("steeper") || change.includes("increase slope")) {
    return (x: number) => evaluator(x) * 1.22;
  }
  if (change.includes("flatten") || change.includes("decrease slope")) {
    return (x: number) => evaluator(x) * 0.68;
  }
  if (change.includes("frequency") || change.includes("faster")) {
    return (x: number) => evaluator(x * 1.28);
  }
  if (change.includes("slower") || change.includes("longer period")) {
    return (x: number) => evaluator(x * 0.76);
  }

  return (x: number) => evaluator(x) + Math.sin(x * 1.4) * 0.18;
}

function createXValues(domain: [number, number]) {
  return Array.from({ length: SAMPLE_COUNT }, (_, index) => {
    const progress = index / Math.max(1, SAMPLE_COUNT - 1);
    return domain[0] + progress * (domain[1] - domain[0]);
  });
}

function stabilizeValues(values: number[]) {
  const finiteValues = values.filter((value) => Number.isFinite(value) && Math.abs(value) < 1_000);
  if (finiteValues.length < 4) {
    return values.map((_, index) => Math.sin((index / Math.max(1, values.length - 1)) * Math.PI * 2));
  }

  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  const spread = Math.max(max - min, 1);
  const paddedMin = min - spread * 0.18 - 0.2;
  const paddedMax = max + spread * 0.18 + 0.2;

  let lastValid = finiteValues[0] ?? 0;

  return values.map((value) => {
    if (!Number.isFinite(value) || Math.abs(value) >= 1_000) {
      return lastValid;
    }

    const clamped = Math.min(paddedMax, Math.max(paddedMin, value));
    lastValid = clamped;
    return clamped;
  });
}

function createSeries(
  evaluator: (x: number) => number,
  xValues: number[]
) {
  return xValues.map((x) => evaluator(x));
}

function getYRange(baseValues: number[], targetValues: number[]) {
  const combined = [...baseValues, ...targetValues];
  const min = Math.min(...combined);
  const max = Math.max(...combined);
  const spread = Math.max(max - min, 1);
  const center = (max + min) / 2;

  return {
    min: center - spread * 0.62,
    max: center + spread * 0.62,
  };
}

function toPoints(xValues: number[], yValues: number[], domain: [number, number], yRange: { min: number; max: number }) {
  return xValues.map((x, index) => {
    const px = PAD_X + ((x - domain[0]) / (domain[1] - domain[0])) * (WIDTH - PAD_X * 2);
    const py =
      HEIGHT -
      PAD_Y -
      ((yValues[index] - yRange.min) / Math.max(yRange.max - yRange.min, 1)) * (HEIGHT - PAD_Y * 2);

    return { x: px, y: py };
  });
}

function buildPath(points: Point[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function formatAxisValue(value: number) {
  if (Math.abs(value) > 9) return value.toFixed(0);
  if (Math.abs(value) > 1) return value.toFixed(1);
  return value.toFixed(2);
}

export default function LiveSimulation({ data }: LiveSimulationProps) {
  const baseEvaluator = buildEvaluator(data.equation, data.parameters);
  const targetEvaluator = buildTargetEvaluator(baseEvaluator, data.target_change);
  const domain = inferDomain(data.equation);
  const xValues = createXValues(domain);
  const baseValues = stabilizeValues(createSeries(baseEvaluator, xValues));
  const targetValues = stabilizeValues(createSeries(targetEvaluator, xValues));
  const yRange = getYRange(baseValues, targetValues);
  const basePoints = toPoints(xValues, baseValues, domain, yRange);
  const targetPoints = toPoints(xValues, targetValues, domain, yRange);
  const basePath = buildPath(basePoints);
  const targetPath = buildPath(targetPoints);
  const equationLabel = data.equation.includes("=") ? data.equation : `y = ${data.equation}`;

  return (
    <div className="w-full h-full flex items-center justify-center p-6 sm:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.68, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-6xl"
      >
        <div className="maestro-stage min-h-[620px] px-6 py-8 sm:px-8 sm:py-10">
          <div
            className="absolute inset-x-[18%] top-[10%] h-44 rounded-full blur-[92px] maestro-aura-breathe"
            style={{ background: "radial-gradient(circle, rgba(0,230,118,0.18) 0%, transparent 72%)" }}
          />

          <div className="relative z-10 flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.44 }}
              className="flex flex-wrap items-center justify-between gap-4"
            >
              <p className="maestro-breadcrumb">LIVE SIM / {equationLabel.toUpperCase()}</p>
              <p className="maestro-breadcrumb">TARGET / {data.target_change.toUpperCase()}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.16, duration: 0.56 }}
              className="maestro-projection-panel relative overflow-hidden rounded-[26px] p-4 sm:p-6"
            >
              <div className="maestro-grid-plane absolute inset-0 opacity-55" />
              <div className="maestro-scanlines absolute inset-0 pointer-events-none" />

              <div className="relative z-10 grid gap-5 lg:grid-cols-[1fr_220px]">
                <div className="relative overflow-hidden rounded-[20px] border border-white/7 bg-black/26">
                  <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto">
                    <defs>
                      <filter id="sim-glow">
                        <feGaussianBlur stdDeviation="8" result="blurred" />
                        <feMerge>
                          <feMergeNode in="blurred" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {Array.from({ length: 7 }, (_, index) => {
                      const x = PAD_X + (index / 6) * (WIDTH - PAD_X * 2);
                      return (
                        <line
                          key={`vx-${index}`}
                          x1={x}
                          y1={PAD_Y}
                          x2={x}
                          y2={HEIGHT - PAD_Y}
                          stroke="rgba(255,255,255,0.09)"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {Array.from({ length: 6 }, (_, index) => {
                      const y = PAD_Y + (index / 5) * (HEIGHT - PAD_Y * 2);
                      return (
                        <line
                          key={`hy-${index}`}
                          x1={PAD_X}
                          y1={y}
                          x2={WIDTH - PAD_X}
                          y2={y}
                          stroke="rgba(255,255,255,0.08)"
                          strokeWidth="1"
                        />
                      );
                    })}

                    <line
                      x1={PAD_X}
                      y1={HEIGHT - PAD_Y}
                      x2={WIDTH - PAD_X}
                      y2={HEIGHT - PAD_Y}
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth="1.2"
                    />
                    <line
                      x1={PAD_X}
                      y1={PAD_Y}
                      x2={PAD_X}
                      y2={HEIGHT - PAD_Y}
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth="1.2"
                    />

                    <path
                      d={basePath}
                      fill="none"
                      stroke="rgba(255,255,255,0.16)"
                      strokeWidth="1.4"
                      strokeDasharray="5 10"
                    />
                    <motion.path
                      d={basePath}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{
                        pathLength: 1,
                        opacity: [0.24, 0.46, 0.24],
                        d: targetPath,
                      }}
                      transition={{
                        pathLength: { duration: 0.95, ease: "easeOut" },
                        opacity: { duration: 2.9, repeat: Infinity, ease: "easeInOut" },
                        d: { duration: 3.8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
                      }}
                      fill="none"
                      stroke="rgba(0,230,118,0.26)"
                      strokeWidth="10"
                      filter="url(#sim-glow)"
                      strokeLinecap="round"
                    />
                    <motion.path
                      d={basePath}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{
                        pathLength: 1,
                        opacity: [0.82, 1, 0.82],
                        d: targetPath,
                      }}
                      transition={{
                        pathLength: { duration: 0.95, ease: "easeOut" },
                        opacity: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                        d: { duration: 3.8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
                      }}
                      fill="none"
                      stroke="rgba(157,255,204,0.98)"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />

                    <text
                      x={PAD_X}
                      y={PAD_Y - 12}
                      fill="rgba(255,255,255,0.38)"
                      fontSize="11"
                      fontFamily="'JetBrains Mono', monospace"
                    >
                      y {formatAxisValue(yRange.max)}
                    </text>
                    <text
                      x={PAD_X}
                      y={HEIGHT - PAD_Y + 22}
                      fill="rgba(255,255,255,0.38)"
                      fontSize="11"
                      fontFamily="'JetBrains Mono', monospace"
                    >
                      x {formatAxisValue(domain[0])}
                    </text>
                    <text
                      x={WIDTH / 2}
                      y={HEIGHT - PAD_Y + 22}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.38)"
                      fontSize="11"
                      fontFamily="'JetBrains Mono', monospace"
                    >
                      {formatAxisValue((domain[0] + domain[1]) / 2)}
                    </text>
                    <text
                      x={WIDTH - PAD_X}
                      y={HEIGHT - PAD_Y + 22}
                      textAnchor="end"
                      fill="rgba(255,255,255,0.38)"
                      fontSize="11"
                      fontFamily="'JetBrains Mono', monospace"
                    >
                      {formatAxisValue(domain[1])}
                    </text>
                    <text
                      x={PAD_X}
                      y={HEIGHT - PAD_Y + 44}
                      fill="rgba(255,255,255,0.28)"
                      fontSize="10"
                      fontFamily="'JetBrains Mono', monospace"
                      letterSpacing="0.18em"
                    >
                      EQUATION / {equationLabel.toUpperCase()}
                    </text>
                  </svg>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="rounded-[20px] border border-white/8 bg-black/34 p-4">
                    <p className="maestro-breadcrumb mb-3">WATCH</p>
                    <div className="flex flex-wrap gap-2">
                      {data.variables_to_watch.map((variable) => (
                        <span
                          key={variable}
                          className="rounded-full border border-maestro-green/60 bg-maestro-green/10 px-3 py-1.5 font-mono text-xs text-maestro-green"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-white/8 bg-black/34 p-4">
                    <p className="maestro-breadcrumb mb-3">CHANGE VECTOR</p>
                    <p className="font-mono text-sm leading-relaxed text-white/78">{data.target_change}</p>
                  </div>

                  {data.parameters && data.parameters.length > 0 && (
                    <div className="rounded-[20px] border border-white/8 bg-black/34 p-4">
                      <p className="maestro-breadcrumb mb-3">PARAMETERS</p>
                      <div className="space-y-2">
                        {data.parameters.map((parameter) => (
                          <div
                            key={parameter.name}
                            className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2"
                          >
                            <span className="font-mono text-xs text-white/58">{parameter.name}</span>
                            <span className="font-mono text-sm text-maestro-green">{parameter.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
