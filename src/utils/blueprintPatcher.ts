import { Node, Edge } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { NodeData, LLMNodeData, LLMConnectionData } from '../types/BlueprintTypes';
import { getNodeColor } from './ueT3DParser';
import { calculateBlueprintLayout } from './blueprintLayout';

export interface BlueprintPatchPayload {
  mode?: 'patch' | 'full';
  summary?: string;
  nodes?: LLMNodeData[];
  connections?: LLMConnectionData[];
  removedNodeIds?: string[];
  removedConnections?: LLMConnectionData[];
}

export interface PatchApplyResult {
  nodes: Node<NodeData>[];
  edges: Edge[];
  summary: string;
  stats: {
    addedNodes: number;
    modifiedNodes: number;
    removedNodes: number;
    addedEdges: number;
    removedEdges: number;
  };
}

/**
 * Clean string for handle ID generation
 */
function toHandleId(pinType: string, pinName: string): string {
  const cleanName = pinName.replace(/\s+|[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  return `${pinType || 'exec'}-${cleanName}`;
}

/**
 * Apply an incremental Blueprint patch to the active canvas.
 * Preserves user-dragged node coordinates, updates existing node signatures,
 * intelligently positions new nodes adjacent to connected parents, and merges connections.
 */
export function applyBlueprintPatch(
  currentNodes: Node<NodeData>[],
  currentEdges: Edge[],
  patch: BlueprintPatchPayload
): PatchApplyResult {
  const removedNodeIdSet = new Set(patch.removedNodeIds || []);
  let removedNodesCount = 0;
  let modifiedNodesCount = 0;
  let addedNodesCount = 0;

  // Step 1: Filter out removed nodes
  let activeNodes = currentNodes.filter(node => {
    if (removedNodeIdSet.has(node.id)) {
      removedNodesCount++;
      return false;
    }
    return true;
  });

  // Filter out edges attached to removed nodes
  let activeEdges = currentEdges.filter(
    edge => !removedNodeIdSet.has(edge.source) && !removedNodeIdSet.has(edge.target)
  );

  // Step 2: Filter out explicitly removed connections
  let removedEdgesCount = 0;
  if (patch.removedConnections && patch.removedConnections.length > 0) {
    activeEdges = activeEdges.filter(edge => {
      const match = patch.removedConnections!.some(rc => {
        const srcPin = edge.sourceHandle?.split('-').slice(1).join('-') || '';
        const tgtPin = edge.targetHandle?.split('-').slice(1).join('-') || '';
        return (
          edge.source === rc.sourceNodeId &&
          edge.target === rc.targetNodeId &&
          srcPin.toLowerCase() === rc.sourcePinName.toLowerCase() &&
          tgtPin.toLowerCase() === rc.targetPinName.toLowerCase()
        );
      });
      if (match) removedEdgesCount++;
      return !match;
    });
  }

  // Node ID translation map (for newly synthesized nodes)
  const idMap: Record<string, string> = {};
  const existingNodeMap = new Map<string, Node<NodeData>>(activeNodes.map(n => [n.id, n]));

  // Find canvas bounds for placing unlinked new nodes
  let maxX = 100;
  let avgY = 150;
  if (activeNodes.length > 0) {
    maxX = Math.max(...activeNodes.map(n => n.position.x)) + 380;
    avgY = Math.round(activeNodes.reduce((acc, n) => acc + n.position.y, 0) / activeNodes.length);
  }

  const patchNodes = patch.nodes || [];

  // Pre-calculate topological DAG layout for all brand-new nodes in the patch
  const brandNewPatchNodes = patchNodes.filter(p => !existingNodeMap.has(p.id));
  const brandNewNodeIds = new Set(brandNewPatchNodes.map(n => n.id));
  const brandNewConnections = (patch.connections || []).filter(
    c => brandNewNodeIds.has(c.sourceNodeId) && brandNewNodeIds.has(c.targetNodeId)
  );
  const newLayout = calculateBlueprintLayout(brandNewPatchNodes, brandNewConnections);

  // Step 3: Process patch nodes (Update existing vs Add new)
  const newNodesToAdd: Node<NodeData>[] = [];

  patchNodes.forEach((pNode, index) => {
    const existing = existingNodeMap.get(pNode.id);

    if (existing) {
      // Modify existing node in place (preserve position and selected state)
      modifiedNodesCount++;
      idMap[pNode.id] = existing.id;

      const updatedData: NodeData = {
        ...existing.data,
        title: pNode.title || existing.data.title,
        nodeType: pNode.nodeType || existing.data.nodeType,
        description: pNode.description || existing.data.description,
        inputs: pNode.inputs || existing.data.inputs,
        outputs: pNode.outputs || existing.data.outputs,
      };

      activeNodes = activeNodes.map(n => 
        n.id === existing.id ? { ...n, data: updatedData } : n
      );
    } else {
      // Create brand-new node
      addedNodesCount++;
      const newId = uuidv4();
      idMap[pNode.id] = newId;

      // Determine smart position: use relative DAG layout offset from maxX
      const relPos = newLayout.get(pNode.id);
      let spawnPos: { x: number; y: number };

      if (relPos) {
        spawnPos = {
          x: maxX + relPos.x,
          y: Math.max(100, avgY - 100) + relPos.y,
        };
      } else {
        // Fallback: search for incoming or outgoing connection to an existing node
        const upstreamConnection = (patch.connections || []).find(c => c.targetNodeId === pNode.id);
        const upExisting = upstreamConnection ? existingNodeMap.get(upstreamConnection.sourceNodeId) : null;
        if (upExisting) {
          spawnPos = {
            x: upExisting.position.x + 320,
            y: upExisting.position.y + index * 80,
          };
        } else {
          spawnPos = { x: maxX, y: avgY + index * 120 };
        }
      }

      const nodeColor = pNode.color || getNodeColor(pNode.nodeType || '', pNode.title || '');

      const newNode: Node<NodeData> = {
        id: newId,
        type: 'customNode',
        position: spawnPos,
        data: {
          title: pNode.title || 'New Node',
          subtitle: pNode.nodeType || 'function',
          nodeType: pNode.nodeType || 'function',
          color: nodeColor,
          description: pNode.description || '',
          inputs: (pNode.inputs || []).map(p => ({ ...p })),
          outputs: (pNode.outputs || []).map(p => ({ ...p })),
        },
        selected: true, // Highlight newly added nodes
      };

      newNodesToAdd.push(newNode);
    }
  });

  const mergedNodes = [...activeNodes, ...newNodesToAdd];

  // Step 4: Add new connections
  let addedEdgesCount = 0;
  const newEdgesToAdd: Edge[] = [];
  const existingEdgeSignatures = new Set(
    activeEdges.map(e => `${e.source}:${e.sourceHandle}->${e.target}:${e.targetHandle}`)
  );

  (patch.connections || []).forEach(conn => {
    const realSourceId = idMap[conn.sourceNodeId] || conn.sourceNodeId;
    const realTargetId = idMap[conn.targetNodeId] || conn.targetNodeId;

    const sourceNode = mergedNodes.find(n => n.id === realSourceId);
    const targetNode = mergedNodes.find(n => n.id === realTargetId);

    if (!sourceNode || !targetNode) return;

    const sourcePin = sourceNode.data.outputs?.find(p => 
      p.name.toLowerCase() === conn.sourcePinName.toLowerCase()
    );
    const targetPin = targetNode.data.inputs?.find(p => 
      p.name.toLowerCase() === conn.targetPinName.toLowerCase()
    );

    const pinType = sourcePin?.type || targetPin?.type || 'exec';
    const sourceHandleId = toHandleId(pinType, conn.sourcePinName);
    const targetHandleId = toHandleId(pinType, conn.targetPinName);

    const sig = `${realSourceId}:${sourceHandleId}->${realTargetId}:${targetHandleId}`;
    if (!existingEdgeSignatures.has(sig)) {
      existingEdgeSignatures.add(sig);
      addedEdgesCount++;
      newEdgesToAdd.push({
        id: `edge_${realSourceId}_${realTargetId}_${Date.now()}_${addedEdgesCount}`,
        source: realSourceId,
        sourceHandle: sourceHandleId,
        target: realTargetId,
        targetHandle: targetHandleId,
        type: 'blueprintEdge',
        data: { pinType },
      });
    }
  });

  const mergedEdges = [...activeEdges, ...newEdgesToAdd];

  const summary = patch.summary || 
    `Patched graph: +${addedNodesCount} nodes, ~${modifiedNodesCount} modified, -${removedNodesCount} removed, +${addedEdgesCount} wires.`;

  return {
    nodes: mergedNodes,
    edges: mergedEdges,
    summary,
    stats: {
      addedNodes: addedNodesCount,
      modifiedNodes: modifiedNodesCount,
      removedNodes: removedNodesCount,
      addedEdges: addedEdgesCount,
      removedEdges: removedEdgesCount,
    },
  };
}

