import { LLMNodeData, LLMConnectionData } from '../types/BlueprintTypes';

/**
 * Computes optimal, non-overlapping (x, y) coordinates for Unreal Engine Blueprint nodes.
 * Adheres to UE5's standard horizontal execution flow with vertical branch stacking.
 */
export function calculateBlueprintLayout(
  nodes: LLMNodeData[],
  connections: LLMConnectionData[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  // Check if LLM already provided valid, non-overlapping coordinates (spread across canvas)
  const existingCoords = nodes.filter(n => n.position && (n.position.x !== 0 || n.position.y !== 0));
  const uniqueX = new Set(existingCoords.map(n => Math.round(n.position!.x / 60)));
  const uniqueY = new Set(existingCoords.map(n => Math.round(n.position!.y / 60)));

  // If the LLM generated well-spaced coordinates for all nodes, use them
  if (existingCoords.length === nodes.length && uniqueX.size > 1 && uniqueY.size >= 1) {
    nodes.forEach(n => positions.set(n.id, { x: n.position!.x, y: n.position!.y }));
    return positions;
  }

  // Otherwise, compute topological layers for horizontal execution flow
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  nodes.forEach(n => {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  });

  connections.forEach(c => {
    if (adj.has(c.sourceNodeId) && adj.has(c.targetNodeId)) {
      adj.get(c.sourceNodeId)!.push(c.targetNodeId);
      inDegree.set(c.targetNodeId, (inDegree.get(c.targetNodeId) || 0) + 1);
    }
  });

  // Identify root nodes (e.g. Events or nodes with in-degree 0)
  const queue: { id: string; col: number }[] = [];
  const visited = new Set<string>();
  const nodeLayer = new Map<string, number>();

  const roots = nodes.filter(n => (inDegree.get(n.id) === 0) || n.nodeType === 'event');
  const sortedRoots = roots.length > 0 ? roots : [nodes[0]];

  sortedRoots.forEach(root => {
    queue.push({ id: root.id, col: 0 });
    visited.add(root.id);
    nodeLayer.set(root.id, 0);
  });

  // BFS to assign columns (depth)
  while (queue.length > 0) {
    const { id, col } = queue.shift()!;
    const children = adj.get(id) || [];

    children.forEach(childId => {
      const nextCol = col + 1;
      const currentLayer = nodeLayer.get(childId) ?? 0;
      nodeLayer.set(childId, Math.max(currentLayer, nextCol));

      if (!visited.has(childId)) {
        visited.add(childId);
        queue.push({ id: childId, col: nextCol });
      }
    });
  }

  // Any unvisited nodes (e.g. disconnected helper or pure nodes)
  nodes.forEach(n => {
    if (!nodeLayer.has(n.id)) {
      nodeLayer.set(n.id, 0);
    }
  });

  // Group nodes by their horizontal column layer
  const layerGroups = new Map<number, string[]>();
  nodeLayer.forEach((layer, id) => {
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, []);
    }
    layerGroups.get(layer)!.push(id);
  });

  const HORIZONTAL_STEP = 380;
  const VERTICAL_STEP = 200;
  const START_X = 100;
  const START_Y = 180;

  layerGroups.forEach((nodeIds, layer) => {
    nodeIds.forEach((id, rowIdx) => {
      const x = START_X + layer * HORIZONTAL_STEP;
      const y = START_Y + rowIdx * VERTICAL_STEP;
      positions.set(id, { x, y });
    });
  });

  return positions;
}

import { Node, Edge } from 'reactflow';
import { NodeData } from '../types/BlueprintTypes';

/**
 * Epic Games Style Linear Graph Auto-Formatter:
 * Re-arranges active Blueprint canvas nodes into clean horizontal execution spines,
 * with pure mathematical/getter nodes neatly stacked beneath the input pins of their consumers.
 */
export function formatGraphLayout(
  nodes: Node<NodeData>[],
  edges: Edge[]
): Node<NodeData>[] {
  if (nodes.length <= 1) return nodes;

  const logicNodes = nodes.filter(n => n.type !== 'commentNode');
  if (logicNodes.length === 0) return nodes;

  const inDegree = new Map<string, number>();
  const execAdjacency = new Map<string, string[]>();
  const dataConsumers = new Map<string, string[]>();

  logicNodes.forEach(n => {
    inDegree.set(n.id, 0);
    execAdjacency.set(n.id, []);
    dataConsumers.set(n.id, []);
  });

  edges.forEach(e => {
    const isExec = (e.data as any)?.pinType === 'exec' || (e.sourceHandle || '').startsWith('exec-');
    if (isExec) {
      if (execAdjacency.has(e.source)) {
        execAdjacency.get(e.source)!.push(e.target);
        inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      }
    } else {
      if (dataConsumers.has(e.source)) {
        dataConsumers.get(e.source)!.push(e.target);
      }
    }
  });

  const isPureNode = (node: Node<NodeData>) => {
    const hasExecIn = (node.data?.inputs || []).some(p => p.type === 'exec');
    const hasExecOut = (node.data?.outputs || []).some(p => p.type === 'exec');
    return !hasExecIn && !hasExecOut && node.data?.nodeType !== 'event' && node.data?.nodeType !== 'reroute';
  };

  const pureNodeIds = new Set(logicNodes.filter(isPureNode).map(n => n.id));
  const execNodes = logicNodes.filter(n => !pureNodeIds.has(n.id));

  const nodeLayer = new Map<string, number>();
  const roots = execNodes.filter(n => 
    (inDegree.get(n.id) === 0) || 
    n.data?.nodeType === 'event' || 
    /^(event|inputaction)/i.test(n.data?.title || '')
  );

  const startRoots = roots.length > 0 ? roots : [execNodes[0] || logicNodes[0]];
  const queue: { id: string; col: number }[] = [];
  const visited = new Set<string>();

  startRoots.forEach(r => {
    queue.push({ id: r.id, col: 0 });
    visited.add(r.id);
    nodeLayer.set(r.id, 0);
  });

  while (queue.length > 0) {
    const { id, col } = queue.shift()!;
    const targets = execAdjacency.get(id) || [];
    targets.forEach(targetId => {
      const nextCol = col + 1;
      const cur = nodeLayer.get(targetId) ?? 0;
      nodeLayer.set(targetId, Math.max(cur, nextCol));
      if (!visited.has(targetId)) {
        visited.add(targetId);
        queue.push({ id: targetId, col: nextCol });
      }
    });
  }

  execNodes.forEach(n => {
    if (!nodeLayer.has(n.id)) {
      nodeLayer.set(n.id, 0);
    }
  });

  const layerGroups = new Map<number, string[]>();
  nodeLayer.forEach((layer, id) => {
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(id);
  });

  const HORIZONTAL_STEP = 340;
  const VERTICAL_STEP = 180;
  const START_X = 100;
  const START_Y = 160;

  const positions = new Map<string, { x: number; y: number }>();

  layerGroups.forEach((ids, layer) => {
    ids.forEach((id, row) => {
      positions.set(id, {
        x: START_X + layer * HORIZONTAL_STEP,
        y: START_Y + row * VERTICAL_STEP,
      });
    });
  });

  const purePlaced = new Set<string>();
  const consumerPureCount = new Map<string, number>();

  pureNodeIds.forEach(pureId => {
    const consumers = dataConsumers.get(pureId) || [];
    const consumerId = consumers.find(c => positions.has(c));

    if (consumerId && positions.has(consumerId)) {
      const consumerPos = positions.get(consumerId)!;
      const count = consumerPureCount.get(consumerId) || 0;
      consumerPureCount.set(consumerId, count + 1);

      positions.set(pureId, {
        x: consumerPos.x - 260,
        y: consumerPos.y + 40 + count * 110,
      });
      purePlaced.add(pureId);
    }
  });

  const maxY = Math.max(START_Y, ...Array.from(positions.values()).map(p => p.y));
  let orphanIndex = 0;
  pureNodeIds.forEach(pureId => {
    if (!purePlaced.has(pureId)) {
      positions.set(pureId, {
        x: START_X + (orphanIndex % 4) * 260,
        y: maxY + 200 + Math.floor(orphanIndex / 4) * 120,
      });
      orphanIndex++;
    }
  });

  return nodes.map(node => {
    const newPos = positions.get(node.id);
    if (newPos) {
      return {
        ...node,
        position: { x: Math.round(newPos.x), y: Math.round(newPos.y) },
      };
    }
    return node;
  });
}

