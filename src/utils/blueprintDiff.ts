import { Node, Edge } from 'reactflow';
import { NodeData } from '../types/BlueprintTypes';

export type DiffChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface NodeDiffItem {
  id: string;
  title: string;
  changeType: DiffChangeType;
  details?: string;
  sourceNode?: Node<NodeData>;
  targetNode?: Node<NodeData>;
}

export interface EdgeDiffItem {
  id: string;
  sourceTitle: string;
  targetTitle: string;
  sourcePin: string;
  targetPin: string;
  changeType: DiffChangeType;
}

export interface BlueprintGraphDiff {
  nodeDiffs: NodeDiffItem[];
  edgeDiffs: EdgeDiffItem[];
  summary: {
    addedNodes: number;
    removedNodes: number;
    modifiedNodes: number;
    unchangedNodes: number;
    addedEdges: number;
    removedEdges: number;
    unchangedEdges: number;
    isIdentical: boolean;
  };
}

/**
 * Computes a visual diff between two Unreal Blueprint graphs (e.g. Current vs Snapshot or Snapshot A vs B).
 */
export function computeBlueprintDiff(
  baseNodes: Node<NodeData>[],
  baseEdges: Edge[],
  targetNodes: Node<NodeData>[],
  targetEdges: Edge[]
): BlueprintGraphDiff {
  const nodeDiffs: NodeDiffItem[] = [];
  const edgeDiffs: EdgeDiffItem[] = [];

  const baseNodeMap = new Map<string, Node<NodeData>>();
  const baseTitleMap = new Map<string, Node<NodeData>[]>();

  baseNodes.forEach(n => {
    baseNodeMap.set(n.id, n);
    const title = n.data?.title || 'Node';
    if (!baseTitleMap.has(title)) baseTitleMap.set(title, []);
    baseTitleMap.get(title)!.push(n);
  });

  const matchedBaseNodeIds = new Set<string>();

  // Compare target nodes against base
  targetNodes.forEach(tNode => {
    const directMatch = baseNodeMap.get(tNode.id);

    if (directMatch) {
      matchedBaseNodeIds.add(directMatch.id);
      // Check if modified
      const baseInputs = JSON.stringify(directMatch.data?.inputs || []);
      const targetInputs = JSON.stringify(tNode.data?.inputs || []);
      const isModified = baseInputs !== targetInputs || directMatch.data?.title !== tNode.data?.title;

      nodeDiffs.push({
        id: tNode.id,
        title: tNode.data?.title || 'Node',
        changeType: isModified ? 'modified' : 'unchanged',
        details: isModified ? 'Input pin values or signatures modified.' : 'No changes.',
        sourceNode: directMatch,
        targetNode: tNode,
      });
    } else {
      // Check if matched by title as potential rename/re-instantiation
      nodeDiffs.push({
        id: tNode.id,
        title: tNode.data?.title || 'Node',
        changeType: 'added',
        details: 'Newly added node.',
        targetNode: tNode,
      });
    }
  });

  // Any base nodes not matched were removed in target
  baseNodes.forEach(bNode => {
    if (!matchedBaseNodeIds.has(bNode.id)) {
      nodeDiffs.push({
        id: bNode.id,
        title: bNode.data?.title || 'Node',
        changeType: 'removed',
        details: 'Removed from target version.',
        sourceNode: bNode,
      });
    }
  });

  // Helper to get titles for edge display
  const allNodesMap = new Map<string, string>();
  [...baseNodes, ...targetNodes].forEach(n => allNodesMap.set(n.id, n.data?.title || 'Node'));

  const baseEdgeKeys = new Set<string>();
  baseEdges.forEach(e => {
    const key = `${e.source}:${e.sourceHandle}->${e.target}:${e.targetHandle}`;
    baseEdgeKeys.add(key);
  });

  const targetEdgeKeys = new Set<string>();
  targetEdges.forEach(e => {
    const key = `${e.source}:${e.sourceHandle}->${e.target}:${e.targetHandle}`;
    targetEdgeKeys.add(key);

    const isAdded = !baseEdgeKeys.has(key);
    edgeDiffs.push({
      id: e.id,
      sourceTitle: allNodesMap.get(e.source) || 'Node',
      targetTitle: allNodesMap.get(e.target) || 'Node',
      sourcePin: (e.sourceHandle || '').split('-').slice(1).join('-') || 'Out',
      targetPin: (e.targetHandle || '').split('-').slice(1).join('-') || 'In',
      changeType: isAdded ? 'added' : 'unchanged',
    });
  });

  baseEdges.forEach(e => {
    const key = `${e.source}:${e.sourceHandle}->${e.target}:${e.targetHandle}`;
    if (!targetEdgeKeys.has(key)) {
      edgeDiffs.push({
        id: e.id,
        sourceTitle: allNodesMap.get(e.source) || 'Node',
        targetTitle: allNodesMap.get(e.target) || 'Node',
        sourcePin: (e.sourceHandle || '').split('-').slice(1).join('-') || 'Out',
        targetPin: (e.targetHandle || '').split('-').slice(1).join('-') || 'In',
        changeType: 'removed',
      });
    }
  });

  const addedNodes = nodeDiffs.filter(n => n.changeType === 'added').length;
  const removedNodes = nodeDiffs.filter(n => n.changeType === 'removed').length;
  const modifiedNodes = nodeDiffs.filter(n => n.changeType === 'modified').length;
  const unchangedNodes = nodeDiffs.filter(n => n.changeType === 'unchanged').length;

  const addedEdges = edgeDiffs.filter(e => e.changeType === 'added').length;
  const removedEdges = edgeDiffs.filter(e => e.changeType === 'removed').length;
  const unchangedEdges = edgeDiffs.filter(e => e.changeType === 'unchanged').length;

  const isIdentical = addedNodes === 0 && removedNodes === 0 && modifiedNodes === 0 && addedEdges === 0 && removedEdges === 0;

  return {
    nodeDiffs,
    edgeDiffs,
    summary: {
      addedNodes,
      removedNodes,
      modifiedNodes,
      unchangedNodes,
      addedEdges,
      removedEdges,
      unchangedEdges,
      isIdentical,
    },
  };
}

