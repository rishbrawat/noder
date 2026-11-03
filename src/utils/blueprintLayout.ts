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

