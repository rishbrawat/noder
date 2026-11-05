import { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useBlueprintStore } from '../store/blueprintStore';
import { BlueprintGenerationService } from '../services/blueprintGenerationService';
import { LLMBlueprintData, BlueprintNode, BlueprintEdge } from '../types/BlueprintTypes';
import { auth } from '../services/firebase';
import { calculateBlueprintLayout } from '../utils/blueprintLayout';
import { getNodeColor } from '../utils/ueT3DParser';
import { applyBlueprintPatch } from '../utils/blueprintPatcher';
import { sanitizeBlueprintData } from '../utils/blueprintSanitizer';
import { toast } from 'react-hot-toast';

export interface GenerateBlueprintOptions {
  isPatch?: boolean;
  currentGraphIR?: any;
  scopedNodeIds?: string[];
}

export const useBlueprint = () => {
  const store = useBlueprintStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Cancel in-flight blueprint generation.
   */
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    store.setIsLoading(false);
    toast('Blueprint synthesis cancelled', { icon: '⏹️' });
  }, [store]);

  /**
   * Load or patch a blueprint from LLM-generated JSON data.
   */
  const loadBlueprintFromLLM = useCallback(async (
    query: string,
    targetClass: string = 'Actor',
    options?: GenerateBlueprintOptions
  ) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      store.setIsLoading(true);
      store.addLog({
        type: 'ai',
        message: `LogNoderAI: Initiating ${options?.isPatch ? 'incremental patch' : 'blueprint generation'} for query: "${query}" (Target: ${targetClass})...`,
      });

      const user = auth.currentUser;
      const idToken = user ? await user.getIdToken() : undefined;

      const response = await BlueprintGenerationService.generateFromQuery(
        query,
        idToken,
        targetClass,
        options?.currentGraphIR,
        options?.scopedNodeIds,
        controller.signal
      );
      
      if (!response) {
        throw new Error('No response received from generation API');
      }

      let parsedData: any;
      try {
        parsedData = JSON.parse(response);
      } catch (parseError) {
        console.error('Failed to parse blueprint JSON:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      // Strictly clamp and sanitize schema against canonical Unreal Engine definitions
      if (parsedData?.nodes && Array.isArray(parsedData.nodes)) {
        const sanitized = sanitizeBlueprintData(parsedData);
        parsedData = sanitized.data;
      }

      if (parsedData.architecturePlan) {
        store.setArchitecturePlan(parsedData.architecturePlan);
        store.addLog({
          type: 'ai',
          message: `LogNoderAI: Architecture Plan:\n${parsedData.architecturePlan}`,
        });
      }
      
      // If server returned a delta patch, apply patch in-place preserving layout
      if (parsedData._meta?.mode === 'patch' || options?.isPatch) {
        store.pushHistory('AI Patch');
        const currentNodes = useBlueprintStore.getState().nodes;
        const currentEdges = useBlueprintStore.getState().edges;
        const patchResult = applyBlueprintPatch(currentNodes, currentEdges, parsedData);
        store.setNodes(patchResult.nodes);
        store.setEdges(patchResult.edges);
        store.addLog({
          type: 'compiler',
          message: `LogBlueprintCompiler: Patch merged successfully (+${patchResult.stats.addedNodes} nodes, ${patchResult.nodes.length} total, ${patchResult.edges.length} wires).`,
        });
        toast.success(patchResult.summary || 'Graph patched successfully!');
        return;
      }

      // Otherwise, perform full fresh graph generation
      const fullData = parsedData as LLMBlueprintData;
      store.pushHistory('AI Generation');
      if (!fullData.nodes || !Array.isArray(fullData.nodes)) {
        throw new Error('Invalid blueprint data: missing nodes array');
      }

      if (!fullData.connections || !Array.isArray(fullData.connections)) {
        throw new Error('Invalid blueprint data: missing connections array');
      }

      const idMapping: Record<string, string> = {};
      
      // Calculate balanced non-overlapping coordinates (DAG layout)
      const layoutPositions = calculateBlueprintLayout(fullData.nodes, fullData.connections);

      // Generate React Flow nodes
      const nodes: BlueprintNode[] = fullData.nodes.map((node) => {
        const newId = uuidv4();
        idMapping[node.id] = newId;
        
        const nodeColor = node.color || getNodeColor(node.nodeType || '', node.title || '');
        const nodeData = {
          ...node,
          id: newId,
          color: nodeColor,
          subtitle: node.nodeType || '',
          description: node.description || '',
          inputs: node.inputs || [],
          outputs: node.outputs || []
        };
        
        const pos = layoutPositions.get(node.id) || node.position || { x: 100, y: 150 };

        return {
          id: newId,
          type: 'customNode',
          position: pos,
          data: nodeData,
        };
      });

      // Generate React Flow edges
      const edges: BlueprintEdge[] = fullData.connections.map((connection) => {
        const sourceNode = fullData.nodes.find(n => n.id === connection.sourceNodeId);
        const targetNode = fullData.nodes.find(n => n.id === connection.targetNodeId);
        
        const sourcePin = sourceNode?.outputs?.find(p => p.name === connection.sourcePinName);
        const targetPin = targetNode?.inputs?.find(p => p.name === connection.targetPinName);
        
        const sourcePinType = sourcePin?.type || 'exec';
        const targetPinType = targetPin?.type || 'exec';
        
        const sourceHandleId = `${sourcePinType}-${connection.sourcePinName.replace(/\s+|[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`;
        const targetHandleId = `${targetPinType}-${connection.targetPinName.replace(/\s+|[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`;
        
        return {
          id: uuidv4(),
          type: 'blueprintEdge',
          source: idMapping[connection.sourceNodeId],
          sourceHandle: sourceHandleId,
          target: idMapping[connection.targetNodeId],
          targetHandle: targetHandleId,
          data: {
            pinType: sourcePinType,
          }
        };
      });

      // Update the store
      store.setBlueprintName(fullData.blueprintName || 'Untitled Blueprint');
      store.setBlueprintDescription(fullData.blueprintDescription || '');
      store.setNodes(nodes);
      store.setEdges(edges);
      
      const meta = fullData._meta as { source?: string; similarity?: number; model?: string } | undefined;
      store.addLog({
        type: 'compiler',
        message: `LogBlueprintCompiler: Compiled ${nodes.length} nodes and ${edges.length} wires into Unreal Engine graph (Model: ${meta?.model || 'Gemini'}).`,
      });

      if (meta?.source === 'canonical_template') {
        toast.success(`Canonical Blueprint loaded (0 tokens burned, <10ms)!`);
      } else if (meta?.source?.includes('cache')) {
        toast.success(`Cache Hit: Served instantly (0 tokens burned)!`);
      } else {
        toast.success('Blueprint generated successfully!');
      }
    } catch (error) {
      console.error('Error loading blueprint:', error);
      const errMsg = error instanceof Error ? error.message : 'Failed to generate blueprint';
      store.addLog({
        type: 'warn',
        message: `LogError: ${errMsg}`,
      });
      toast.error(errMsg);
    } finally {
      store.setIsLoading(false);
    }
  }, [store]);

  /**
   * Export the current blueprint to JSON
   */
  const exportBlueprint = useCallback(() => {
    return {
      blueprintName: store.blueprintName,
      blueprintDescription: store.blueprintDescription,
      nodes: store.nodes.map(node => ({
        id: node.id,
        title: node.data.title,
        nodeType: node.data.nodeType,
        inputs: node.data.inputs,
        outputs: node.data.outputs,
        description: node.data.description,
        color: node.data.color,
        position: node.position,
      })),
      connections: store.edges.map(edge => ({
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        sourcePinName: edge.sourceHandle?.split('-').slice(1).join('-') || '',
        targetPinName: edge.targetHandle?.split('-').slice(1).join('-') || '',
      })),
    };
  }, [store.blueprintName, store.blueprintDescription, store.nodes, store.edges]);
  
  /**
   * Clear the current blueprint
   */
  const clearBlueprint = useCallback(() => {
    store.clearBlueprint();
    store.setBlueprintName('New Blueprint');
    store.setBlueprintDescription('');
  }, [store]);
  
  return {
    loadBlueprint: loadBlueprintFromLLM,
    cancelGeneration,
    exportBlueprint,
    clearBlueprint,
    isLoading: store.isLoading,
    blueprintName: store.blueprintName,
    blueprintDescription: store.blueprintDescription
  };
};
