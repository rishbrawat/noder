import { Node, Edge } from 'reactflow';
import { NodeData, UEGraphType } from '../types/BlueprintTypes';

export interface ValidationIssue {
  id: string;
  nodeId?: string;
  nodeTitle?: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  tip?: string;
}

export interface ValidationReport {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: ValidationIssue[];
}

const LATENT_KEYWORDS = [
  'delay',
  'retriggerable delay',
  'timeline',
  'play anim montage',
  'play montage',
  'async',
  'latent',
];

/**
 * Validates a React Flow Blueprint graph against Unreal Engine 5 execution and connection rules.
 * Supports context-aware checks for EventGraph vs ConstructionScript.
 */
export function validateBlueprintGraph(
  nodes: Node<NodeData>[],
  edges: Edge[],
  graphType: UEGraphType = 'EventGraph'
): ValidationReport {
  const issues: ValidationIssue[] = [];

  if (nodes.length === 0) {
    return {
      isValid: true,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      issues: [],
    };
  }

  // Pre-build connection index
  const incomingEdges = new Map<string, Edge[]>();
  const outgoingEdges = new Map<string, Edge[]>();

  nodes.forEach(n => {
    incomingEdges.set(n.id, []);
    outgoingEdges.set(n.id, []);
  });

  edges.forEach(e => {
    if (incomingEdges.has(e.target)) {
      incomingEdges.get(e.target)!.push(e);
    }
    if (outgoingEdges.has(e.source)) {
      outgoingEdges.get(e.source)!.push(e);
    }
  });

  // Check 1: Entry points
  const eventNodes = nodes.filter(
    n => n.data?.nodeType === 'event' || /^(event|inputaction|construction)/i.test(n.data?.title || '')
  );

  if (eventNodes.length === 0 && graphType === 'EventGraph') {
    issues.push({
      id: 'no-entry-event',
      severity: 'warning',
      message: 'No event or input action found in graph',
      tip: 'Add an Event BeginPlay, Event Tick, or InputAction to start the execution flow.',
    });
  }

  // Check 2: Inspect each node for execution and pin integrity
  nodes.forEach(node => {
    const title = node.data?.title || 'Untitled Node';
    const lowerTitle = title.toLowerCase();
    const nodeType = node.data?.nodeType || 'function';
    const inputs = node.data?.inputs || [];
    const outputs = node.data?.outputs || [];

    const nodeIncoming = incomingEdges.get(node.id) || [];
    const nodeOutgoing = outgoingEdges.get(node.id) || [];

    // UE5 Rule: Construction Script prohibits latent actions (Delay, Timelines, etc.)
    if (graphType === 'ConstructionScript') {
      const isLatent = LATENT_KEYWORDS.some(kw => lowerTitle.includes(kw));
      if (isLatent) {
        issues.push({
          id: `latent-in-construction-${node.id}`,
          nodeId: node.id,
          nodeTitle: title,
          severity: 'error',
          message: `Latent action "${title}" is not allowed in Construction Script`,
          tip: 'Construction Scripts must run synchronously in a single frame. Move latent nodes to the Event Graph.',
        });
      }
    }

    // In ShadersUE mode, material expression graphs are pure mathematical dataflow without exec pins.
    // Pure mathematical dataflow nodes must not be flagged for missing execution flow.
    if (graphType === 'ShadersUE') {
      return;
    }

    // Check impure functions (have input exec pin) for unconnected execution
    const execInput = inputs.find(p => p.type === 'exec');
    if (execInput && nodeType !== 'event' && !lowerTitle.includes('construction')) {
      const isExecConnected = nodeIncoming.some(e => {
        const pinType = (e.data as any)?.pinType || e.targetHandle?.split('-')[0];
        return pinType === 'exec';
      });

      if (!isExecConnected) {
        issues.push({
          id: `unconnected-exec-in-${node.id}`,
          nodeId: node.id,
          nodeTitle: title,
          severity: 'warning',
          message: 'Input execution pin is not connected',
          tip: 'Wire an execution line from an Event or preceding node.',
        });
      }
    }

    // Check Events with no output execution connections
    if (nodeType === 'event' || /^(event|inputaction)/i.test(title)) {
      const hasExecOutput = outputs.some(p => p.type === 'exec');
      const isExecOutConnected = nodeOutgoing.some(e => {
        const pinType = (e.data as any)?.pinType || e.sourceHandle?.split('-')[0];
        return pinType === 'exec';
      });

      if (hasExecOutput && !isExecOutConnected) {
        issues.push({
          id: `unconnected-event-out-${node.id}`,
          nodeId: node.id,
          nodeTitle: title,
          severity: 'info',
          message: 'Event has no outgoing execution flow',
          tip: 'Connect the "Then" or action pin to execute logic.',
        });
      }
    }

    // Check Branch nodes with neither True nor False wired
    if (lowerTitle === 'branch') {
      const trueConnected = nodeOutgoing.some(e => e.sourceHandle?.includes('true'));
      const falseConnected = nodeOutgoing.some(e => e.sourceHandle?.includes('false'));

      if (!trueConnected && !falseConnected) {
        issues.push({
          id: `branch-dead-end-${node.id}`,
          nodeId: node.id,
          nodeTitle: title,
          severity: 'warning',
          message: 'Branch node has neither True nor False connected',
          tip: 'Connect at least one branch path to handle conditional flow.',
        });
      }
    }
  });

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  return {
    isValid: errorCount === 0,
    errorCount,
    warningCount,
    infoCount,
    issues,
  };
}

export const validateGraph = validateBlueprintGraph;
