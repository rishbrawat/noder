import { Node, Edge } from 'reactflow';
import { NodeData, PerformanceAuditResult, PerformanceNodeAudit, PerformanceSeverity } from '../types/BlueprintTypes';

const CRITICAL_KEYWORDS = [
  'get all actors of class',
  'getallactorsofclass',
  'tick',
  'receive tick',
  'event tick',
  'run on tick',
];

const MODERATE_KEYWORDS = [
  'linetrace',
  'trace',
  'cast to',
  'spawn actor',
  'spawnactor',
  'delay',
  'timeline',
  'play sound',
  'play montage',
  'play animation',
];

const PURE_KEYWORDS = [
  'make vector',
  'break vector',
  'vector +',
  'vector -',
  'vector *',
  'normalize',
  'get ',
  'less',
  'greater',
  'equal',
  'boolean and',
  'boolean or',
  'select',
];

/**
 * Analyzes the React Flow Blueprint graph for Unreal Engine 5 performance bottlenecks,
 * frame-budget consumption, and Technical Artist architectural best practices.
 */
export function profileBlueprintGraph(
  nodes: Node<NodeData>[],
  edges: Edge[]
): PerformanceAuditResult {
  if (nodes.length === 0) {
    return {
      overallScore: 100,
      verdict: 'Ship-Ready',
      tickNodeCount: 0,
      heavyOperationCount: 0,
      pureMathCount: 0,
      estimatedFrameCostMs: 0.01,
      nodeAudits: [],
      recommendations: ['Graph is empty. Begin synthesizing or adding nodes.'],
    };
  }

  // Map incoming and outgoing connections
  const outgoingMap = new Map<string, string[]>();
  edges.forEach(e => {
    outgoingMap.set(e.source, [...(outgoingMap.get(e.source) || []), e.target]);
  });

  const nodeAudits: PerformanceNodeAudit[] = [];
  let tickNodeCount = 0;
  let heavyOperationCount = 0;
  let pureMathCount = 0;
  let penaltyPoints = 0;

  // Find if Event Tick exists
  const tickNodes = nodes.filter(n => {
    const t = (n.data?.title || '').toLowerCase();
    return t.includes('tick');
  });

  // Track all node IDs downstream of Event Tick
  const tickDownstreamIds = new Set<string>();
  tickNodes.forEach(tn => {
    const queue = [tn.id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      (outgoingMap.get(current) || []).forEach(nextId => {
        if (!tickDownstreamIds.has(nextId)) {
          tickDownstreamIds.add(nextId);
          queue.push(nextId);
        }
      });
    }
  });

  nodes.forEach(node => {
    const title = node.data?.title || 'Unknown';
    const lowerTitle = title.toLowerCase();
    const isDownstreamOfTick = tickDownstreamIds.has(node.id);

    let severity: PerformanceSeverity = 'optimal';
    let costScore = 1;
    let reason = 'Pure or localized synchronous operation';
    let recommendation: string | undefined;

    // Check critical operations
    const isExplicitTick = CRITICAL_KEYWORDS.some(kw => lowerTitle.includes(kw));
    const isGetAllActors = lowerTitle.includes('get all actors') || lowerTitle.includes('getallactorsofclass');

    if (isExplicitTick) {
      severity = 'critical';
      costScore = 8;
      tickNodeCount++;
      penaltyPoints += 15;
      reason = 'Event Tick executes on every single frame, impacting game thread frametime.';
      recommendation = 'Prefer using Event Timers (Set Timer by Event) or Gameplay Ability System (GAS) tasks.';
    } else if (isGetAllActors) {
      severity = 'critical';
      costScore = 9;
      heavyOperationCount++;
      penaltyPoints += 25;
      reason = 'GetAllActorsOfClass performs a synchronous full-world scan of all active actors.';
      recommendation = 'Cache actor references at BeginPlay or maintain a gameplay subsystem registry.';
    } else if (isDownstreamOfTick && (lowerTitle.includes('loop') || lowerTitle.includes('while'))) {
      severity = 'critical';
      costScore = 9;
      heavyOperationCount++;
      penaltyPoints += 22;
      reason = `Loop construct (${title}) executing on every tick causes CPU spikes and framerate drops.`;
      recommendation = 'Break large loops across multiple frames using latent timers or move to C++ async tasks.';
    } else if (isDownstreamOfTick && (lowerTitle.includes('trace') || lowerTitle.includes('cast'))) {
      severity = 'critical';
      costScore = 8;
      heavyOperationCount++;
      penaltyPoints += 18;
      reason = `Heavy operation (${title}) runs per-frame downstream of Event Tick.`;
      recommendation = 'Throttle trace/cast frequency with an accumulator variable or timer.';
    } else if (MODERATE_KEYWORDS.some(kw => lowerTitle.includes(kw))) {
      severity = 'moderate';
      costScore = 4;
      penaltyPoints += 4;
      reason = 'Performs casting, collision trace, latent wait, or object allocation.';
      if (lowerTitle.includes('cast')) {
        recommendation = 'Consider Blueprint Interfaces to avoid hard class dependencies.';
      }
    } else if (PURE_KEYWORDS.some(kw => lowerTitle.includes(kw))) {
      severity = 'optimal';
      costScore = 1;
      pureMathCount++;
    } else {
      severity = 'optimal';
      costScore = 2;
    }

    nodeAudits.push({
      nodeId: node.id,
      nodeTitle: title,
      severity,
      costScore,
      reason,
      recommendation,
    });
  });

  // Calculate score & recommendations
  const overallScore = Math.max(10, Math.min(100, 100 - penaltyPoints));
  const verdict = overallScore >= 80 ? 'Ship-Ready' : overallScore >= 60 ? 'Caution' : 'Needs Optimization';

  // Microsecond estimate
  const estimatedFrameCostMs = Number((0.02 + tickNodeCount * 0.15 + heavyOperationCount * 0.45 + (nodes.length * 0.005)).toFixed(3));

  const recommendations: string[] = [];
  if (tickNodeCount > 0) {
    recommendations.push('Replace per-frame Event Tick logic with event-driven triggers or Set Timer by Event.');
  }
  if (heavyOperationCount > 0) {
    recommendations.push('Avoid GetAllActorsOfClass queries during gameplay. Store references in GameMode or Subsystems.');
  }
  const loopOnTick = nodes.some(n => tickDownstreamIds.has(n.id) && /loop/i.test(n.data?.title || ''));
  if (loopOnTick) {
    recommendations.push('Per-frame loop detected downstream of Event Tick. Move loop logic to Event Timers or asynchronous C++ tasks.');
  }
  const playerControllerCount = nodes.filter(n => /get player controller/i.test(n.data?.title || '')).length;
  if (playerControllerCount >= 2) {
    recommendations.push(`Detected ${playerControllerCount} redundant "Get Player Controller" queries. Cache into a local player variable.`);
  }
  const castCount = nodes.filter(n => (n.data?.title || '').toLowerCase().includes('cast')).length;
  if (castCount >= 3) {
    recommendations.push(`${castCount} Cast nodes detected. Replace with Blueprint Interfaces to decouple class references and shrink package memory.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('Graph adheres to Epic Games Unreal Engine 5 performance guidelines.');
  }

  return {
    overallScore,
    verdict,
    tickNodeCount,
    heavyOperationCount,
    pureMathCount,  
    estimatedFrameCostMs,
    nodeAudits,
    recommendations,
  };
}

