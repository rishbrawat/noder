import { Node, Edge } from 'reactflow';
import { NodeData, PinData } from '../types/BlueprintTypes';

export interface SimLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'exec' | 'data' | 'success' | 'warn' | 'ai' | 'compiler';
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
 * Evaluates a condition pin on a node (literal or connected comparison logic).
 */
function evaluateNodeCondition(
  node: Node<NodeData>,
  nodes: Node<NodeData>[],
  edges: Edge[]
): { result: boolean; explanation: string } {
  const conditionPin = (node.data?.inputs || []).find(
    p => p.type === 'bool' || /condition/i.test(p.name)
  );

  if (!conditionPin) {
    return { result: true, explanation: 'Defaulted to TRUE (no condition pin)' };
  }

  // Check for incoming data wire to condition pin
  const incomingEdge = edges.find(e => 
    e.target === node.id && 
    ((e.targetHandle || '').includes('condition') || (e.targetHandle || '').startsWith('bool-'))
  );

  if (incomingEdge) {
    const upstreamNode = nodes.find(n => n.id === incomingEdge.source);
    if (upstreamNode) {
      const upTitle = (upstreamNode.data?.title || '').toLowerCase();
      const inA = (upstreamNode.data?.inputs || []).find(p => p.name.toLowerCase() === 'a');
      const inB = (upstreamNode.data?.inputs || []).find(p => p.name.toLowerCase() === 'b');
      const valA = inA?.value !== undefined ? Number(inA.value) : 1;
      const valB = inB?.value !== undefined ? Number(inB.value) : 0;

      if (upTitle.includes('>') || upTitle.includes('greater')) {
        const isGreater = valA > valB;
        return { result: isGreater, explanation: `${valA} > ${valB} is ${isGreater ? 'TRUE' : 'FALSE'}` };
      }
      if (upTitle.includes('<') || upTitle.includes('less')) {
        const isLess = valA < valB;
        return { result: isLess, explanation: `${valA} < ${valB} is ${isLess ? 'TRUE' : 'FALSE'}` };
      }
      if (upTitle.includes('==') || upTitle.includes('equal')) {
        const isEqual = valA === valB;
        return { result: isEqual, explanation: `${valA} == ${valB} is ${isEqual ? 'TRUE' : 'FALSE'}` };
      }
      if (upTitle.includes('not')) {
        const notVal = inA?.value === false;
        return { result: notVal, explanation: `NOT ${inA?.value} is ${notVal ? 'TRUE' : 'FALSE'}` };
      }
      if (upstreamNode.data?.nodeType === 'variable') {
        const varVal = Boolean(upstreamNode.data?.inputs?.[0]?.value ?? true);
        return { result: varVal, explanation: `Variable "${upstreamNode.data?.title}" is ${varVal ? 'TRUE' : 'FALSE'}` };
      }
    }
  }

  // Use literal pin value if unconnected
  if (conditionPin.value !== undefined && conditionPin.value !== null) {
    const boolVal = conditionPin.value === true || conditionPin.value === 'true' || conditionPin.value === 1;
    return { result: boolVal, explanation: `Literal Condition pin is set to ${boolVal ? 'TRUE' : 'FALSE'}` };
  }

  return { result: true, explanation: 'Condition evaluated to TRUE' };
}

/**
 * Resolves a displayable parameter value from a node's inputs or incoming pure wire.
 */
function resolveNodeParamValue(
  node: Node<NodeData>,
  paramNamePattern: RegExp,
  nodes: Node<NodeData>[],
  edges: Edge[],
  fallback: string = ''
): string {
  // Check for incoming wire
  const incoming = edges.find(e =>
    e.target === node.id &&
    paramNamePattern.test(e.targetHandle || '')
  );

  if (incoming) {
    const upstream = nodes.find(n => n.id === incoming.source);
    if (upstream) {
      const upTitle = upstream.data?.title || '';
      if (/^get\s+/i.test(upTitle)) {
        return `[Variable: ${upTitle.replace(/^get\s+/i, '')}]`;
      }
      return `[Result of ${upTitle}]`;
    }
  }

  // Check pin literal value
  const pin = (node.data?.inputs || []).find(p => paramNamePattern.test(p.name));
  if (pin && pin.value !== undefined && pin.value !== null && pin.value !== '') {
    return String(pin.value);
  }

  return fallback;
}

/**
 * Builds an ordered execution sequence by traversing the execution graph starting from an Event or Action node.
 * Supports Branching, Sequences (multi-output), FlipFlop toggle states, Reroute knots, and rich parameter evaluation.
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

  const visitedNodes = new Set<string>();
  const flipFlopState = new Map<string, boolean>();

  steps.push({
    activeNodeId: root.id,
    logMessage: `[Event Triggered] ${root.data?.title || 'Event'} began execution flow.`,
    logType: 'exec',
  });

  visitedNodes.add(root.id);

  interface ExecAgendaItem {
    node: Node<NodeData>;
    incomingEdge?: Edge;
  }

  const agenda: ExecAgendaItem[] = [{ node: root }];

  while (agenda.length > 0) {
    const { node: currentNode, incomingEdge } = agenda.shift()!;
    const currentId = currentNode.id;
    const currentTitle = currentNode.data?.title || 'Node';
    const lowerTitle = currentTitle.toLowerCase();

    // If not root, process entry logging
    if (incomingEdge) {
      if (visitedNodes.has(currentId)) continue;
      visitedNodes.add(currentId);

      const sourcePin = (incomingEdge.sourceHandle || '').split('-').slice(1).join('-') || 'Then';
      const targetPin = (incomingEdge.targetHandle || '').split('-').slice(1).join('-') || 'Execute';
      const isBreakpoint = Boolean(currentNode.data?.hasBreakpoint);
      const isReroute = currentNode.data?.nodeType === 'reroute' || lowerTitle === 'reroute';

      steps.push({
        activeNodeId: currentId,
        activeEdgeId: incomingEdge.id,
        firedPinName: sourcePin,
        logMessage: isBreakpoint 
          ? `[BREAKPOINT HIT] Simulation suspended at "${currentTitle}".`
          : isReroute
          ? `[Reroute Knot] Routing wire cleanly to next logic segment.`
          : `[Step -> ${currentTitle}] Execution passed from pin "${sourcePin}" to "${targetPin}".`,
        logType: isBreakpoint ? 'warn' : 'exec',
        isBreakpoint,
      });

      // Rich Node Behaviors Logging (Print String, Delay, Damage)
      if (lowerTitle.includes('print string') || lowerTitle.includes('printstring')) {
        const textToPrint = resolveNodeParamValue(currentNode, /instring|string|text/i, nodes, edges, 'Hello Unreal Engine');
        steps.push({
          activeNodeId: currentId,
          logMessage: `  > [SCREEN OUTPUT] "${textToPrint}"`,
          logType: 'success',
        });
      } else if (lowerTitle.includes('delay')) {
        const duration = resolveNodeParamValue(currentNode, /duration|time/i, nodes, edges, '0.2');
        steps.push({
          activeNodeId: currentId,
          logMessage: `  ⏳ [Latent Yield] Pausing execution thread for ${duration}s...`,
          logType: 'info',
        });
      } else if (lowerTitle.includes('apply damage')) {
        const damageVal = resolveNodeParamValue(currentNode, /damage|amount/i, nodes, edges, '25.0');
        steps.push({
          activeNodeId: currentId,
          logMessage: `  💥 [Damage Event] Dispatched ${damageVal} damage to target actor.`,
          logType: 'warn',
        });
      } else {
        // General input parameters check
        const inputs: PinData[] = currentNode.data?.inputs || [];
        inputs.forEach((pin: PinData) => {
          if (pin.type !== 'exec' && pin.value !== undefined && pin.value !== null) {
            steps.push({
              activeNodeId: currentId,
              logMessage: `  ├─ Param [${pin.name}]: ${JSON.stringify(pin.value)}`,
              logType: 'data',
            });
          }
        });
      }
    }

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
      continue;
    }

    // Branching: Sequence Node (Executes all branches sequentially Then 0, Then 1, ...)
    if (lowerTitle.includes('sequence')) {
      const sortedBranches = [...outgoingExecEdges].sort((a, b) => {
        const handleA = a.sourceHandle || '';
        const handleB = b.sourceHandle || '';
        return handleA.localeCompare(handleB, undefined, { numeric: true });
      });

      steps.push({
        activeNodeId: currentId,
        logMessage: `  ├─ [Sequence Flow] Scheduling ${sortedBranches.length} execution branches in numerical order.`,
        logType: 'data',
      });

      const branchItems: ExecAgendaItem[] = [];
      for (const edge of sortedBranches) {
        const nextNode = nodes.find(n => n.id === edge.target);
        if (nextNode && !visitedNodes.has(nextNode.id)) {
          branchItems.push({
            node: nextNode,
            incomingEdge: edge,
          });
        }
      }

      agenda.unshift(...branchItems);
      continue;
    }

    // Branching: FlipFlop Node (Alternates between Output A and Output B)
    if (lowerTitle.includes('flipflop')) {
      const currentIsA = flipFlopState.get(currentId) ?? true;
      flipFlopState.set(currentId, !currentIsA);

      const targetPinName = currentIsA ? 'a' : 'b';
      const targetedEdge = outgoingExecEdges.find(e =>
        (e.sourceHandle || '').toLowerCase().includes(`exec-${targetPinName}`)
      ) || outgoingExecEdges[0];

      steps.push({
        activeNodeId: currentId,
        logMessage: `  ├─ [FlipFlop Logic] Toggled state: Output Pin "${currentIsA ? 'A' : 'B'}" selected (bIsA=${currentIsA}).`,
        logType: 'data',
      });

      if (targetedEdge) {
        const nextNode = nodes.find(n => n.id === targetedEdge.target);
        if (nextNode && !visitedNodes.has(nextNode.id)) {
          agenda.unshift({ node: nextNode, incomingEdge: targetedEdge });
        }
      }
      continue;
    }

    // Branching: Branch (IfThenElse)
    let selectedEdge: Edge = outgoingExecEdges[0];
    if (lowerTitle === 'branch') {
      const evalResult = evaluateNodeCondition(currentNode, nodes, edges);
      steps.push({
        activeNodeId: currentId,
        logMessage: `  ├─ Branch Logic: ${evalResult.explanation}`,
        logType: 'data',
      });

      const branchTarget = evalResult.result ? 'true' : 'false';
      const targetedEdge = outgoingExecEdges.find(e =>
        (e.sourceHandle || '').toLowerCase().includes(branchTarget)
      );
      if (targetedEdge) {
        selectedEdge = targetedEdge;
      }
    }

    const nextNode: Node<NodeData> | undefined = nodes.find(n => n.id === selectedEdge.target);
    if (nextNode && !visitedNodes.has(nextNode.id)) {
      agenda.unshift({ node: nextNode, incomingEdge: selectedEdge });
    }
  }

  return steps;
}
