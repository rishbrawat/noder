import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useBlueprintStore } from '../store/blueprintStore';
import { BlueprintGenerationService } from '../services/blueprintGenerationService';
import { LLMBlueprintData, BlueprintNode, BlueprintEdge } from '../types/BlueprintTypes';
import { auth } from '../services/firebase';
import { calculateBlueprintLayout } from '../utils/blueprintLayout';
import { getNodeColor } from '../utils/ueT3DParser';
import { toast } from 'react-hot-toast';

export const useBlueprint = () => {
  const store = useBlueprintStore();

  /**
   * Load a blueprint from LLM-generated JSON data.
   */
  const loadBlueprintFromLLM = useCallback(async (query: string, targetClass: string = 'Actor') => {
    try {
      store.setIsLoading(true);

      const user = auth.currentUser;
      const idToken = user ? await user.getIdToken() : undefined;

      const response = await BlueprintGenerationService.generateFromQuery(query, idToken, targetClass);
      
      if (!response) {
        throw new Error('No response received from generation API');
      }

      let parsedData: LLMBlueprintData;
      try {
        parsedData = JSON.parse(response) as LLMBlueprintData;
      } catch (parseError) {
        console.error('Failed to parse blueprint JSON:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      if (!parsedData.nodes || !Array.isArray(parsedData.nodes)) {
        throw new Error('Invalid blueprint data: missing nodes array');
      }

      if (!parsedData.connections || !Array.isArray(parsedData.connections)) {
        throw new Error('Invalid blueprint data: missing connections array');
      }

      const idMapping: Record<string, string> = {};
      
      // Calculate balanced non-overlapping coordinates (DAG layout)
      const layoutPositions = calculateBlueprintLayout(parsedData.nodes, parsedData.connections);

      // Generate React Flow nodes
      const nodes: BlueprintNode[] = parsedData.nodes.map((node) => {
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
      const edges: BlueprintEdge[] = parsedData.connections.map((connection) => {
        const sourceNode = parsedData.nodes.find(n => n.id === connection.sourceNodeId);
        const targetNode = parsedData.nodes.find(n => n.id === connection.targetNodeId);
        
        const sourcePin = sourceNode?.outputs?.find(p => p.name === connection.sourcePinName);
        const targetPin = targetNode?.inputs?.find(p => p.name === connection.targetPinName);
        
        const sourcePinType = sourcePin?.type || 'exec';
        const targetPinType = targetPin?.type || 'exec';
        
        const sourceHandleId = `${sourcePinType}-${connection.sourcePinName.replace(/\s+|[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`;
        const targetHandleId = `${targetPinType}-${connection.targetPinName.replace(/\s+|[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`;
        
        return {
          id: uuidv4(),
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
      store.setBlueprintName(parsedData.blueprintName || 'Untitled Blueprint');
      store.setBlueprintDescription(parsedData.blueprintDescription || '');
      store.setNodes(nodes);
      store.setEdges(edges);
      
      toast.success('Blueprint generated successfully!');
    } catch (error) {
      console.error('Error loading blueprint:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate blueprint');
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
    exportBlueprint,
    clearBlueprint,
    isLoading: store.isLoading,
    blueprintName: store.blueprintName,
    blueprintDescription: store.blueprintDescription
  };
};
