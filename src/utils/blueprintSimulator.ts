import { Node, Edge } from 'reactflow';
import { NodeData, PinData } from '../types/BlueprintTypes';

export interface SimLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'exec' | 'data' | 'success' | 'warn';
  message: string;
}

export interface SimStep {
  activeNodeId: string;
  activeEdgeId?: string;
  firedPinName?: string;
  logMessage: string;
  logType: 'info' | 'exec' | 'data' | 'success' | 'warn';
  isBreakpoint?: boolean;
}

/**
 * Builds an ordered execution sequence by traversing the execution graph starting from an Event or Action node.
 */
export function buildSimulationSteps(
  nodes: Node<NodeData>[],
  edges: Edge[],
  startNodeId?: string
): SimStep[] {
  const steps: SimStep[] = [];
  if (nodes.length === 0) return steps;

  // Find root entry event node
  let root: Node<NodeData> | null = startNodeId ? (nodes.find(n => n.id === startNodeId) || null) : null;
  if (!root) {
    root = nodes.find(
      n => n.data?.nodeType === 'event' || /^(event|inputaction)/i.test(n.data?.title || '')
    ) || nodes[0] || null;
  }

  if (!root) return steps;

  const visited = new Set<string>();
  let currentNode: Node<NodeData> | null = root;

  steps.push({
    activeNodeId: root.id,
    logMessage: `[Event Triggered] ${root.data?.title || 'Event'} began execution flow.`,
    logType: 'exec',
  });

  visited.add(root.id);

  // Traverse execution chain (edges with pinType === 'exec')
  while (currentNode) {
    const currentId: string = currentNode.id;
    const currentTitle: string = currentNode.data?.title || 'Node';

    // Find outgoing exec edges
    const outgoingExecEdges: Edge[] = edges.filter((e: Edge) => {
      const isSource = e.source === currentId;
      const isExec = (e.data as any)?.pinType === 'exec' || (e.sourceHandle || '').startsWith('exec-');
      return isSource && isExec;
    });

    if (outgoingExecEdges.length === 0) {
      steps.push({
        activeNodeId: currentId,
        logMessage: `[Execution Finished] End of execution path reached at "${currentTitle}".`,
        logType: 'success',
      });
      break;
    }

    // Handle branching: if Branch node, prioritize True branch if present
    let nextEdge: Edge = outgoingExecEdges[0];
    if (currentTitle.toLowerCase() === 'branch') {
      const trueEdge = outgoingExecEdges.find((e: Edge) => (e.sourceHandle || '').includes('true'));
      if (trueEdge) nextEdge = trueEdge;
    }

    const nextNode: Node<NodeData> | undefined = nodes.find((n: Node<NodeData>) => n.id === nextEdge.target);
    if (!nextNode || visited.has(nextNode.id)) {
      break;
    }

    visited.add(nextNode.id);
    const sourcePin = (nextEdge.sourceHandle || '').split('-').slice(1).join('-') || 'Then';
    const targetPin = (nextEdge.targetHandle || '').split('-').slice(1).join('-') || 'Execute';
    const isBreakpoint = Boolean(nextNode.data?.hasBreakpoint);

    steps.push({
      activeNodeId: nextNode.id,
      activeEdgeId: nextEdge.id,
      firedPinName: sourcePin,
      logMessage: isBreakpoint 
        ? `[BREAKPOINT HIT] Simulation suspended at "${nextNode.data?.title}".`
        : `[Step -> ${nextNode.data?.title}] Execution passed from pin "${sourcePin}" to "${targetPin}".`,
      logType: isBreakpoint ? 'warn' : 'exec',
      isBreakpoint,
    });

    // Check if node reads inputs
    const inputs: PinData[] = nextNode.data?.inputs || [];
    inputs.forEach((pin: PinData) => {
      if (pin.type !== 'exec' && pin.value !== undefined && pin.value !== null) {
        steps.push({
          activeNodeId: nextNode.id,
          logMessage: `  ├─ Param [${pin.name}]: ${JSON.stringify(pin.value)}`,
          logType: 'data',
        });
      }
    });

    currentNode = nextNode;
  }

  return steps;
}
