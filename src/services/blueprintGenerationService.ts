import { Node, Edge } from 'reactflow';
import { NodeData } from '../types/BlueprintTypes';
import { compileGraphToT3D, T3DCompileResult } from '../utils/ueT3DCompiler';
import { saveBlueprintTemplate } from './firestore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Service for generating, exporting, and persisting blueprint data.
 */
export class BlueprintGenerationService {
  /**
   * Generate blueprint data by sending query to backend API.
   */
  static async generateFromQuery(
    query: string,
    idToken?: string,
    targetClass: string = 'Actor',
    currentGraphIR?: any,
    scopedNodeIds?: string[],
    signal?: AbortSignal
  ): Promise<string> {
    if (!query.trim()) {
      throw new Error('Query cannot be empty');
    }

    const backendUrl = `${API_BASE_URL}/api/generateBlueprint`;
    console.log(`[BlueprintGenerationService] Sending query to ${backendUrl}:`, query);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    // Attach user's personal BYOK key if configured in browser storage
    const byokKey = typeof localStorage !== 'undefined' ? localStorage.getItem('noder_byok_gemini_key') : null;
    if (byokKey && byokKey.trim()) {
      headers['X-Gemini-Api-Key'] = byokKey.trim();
    }

    const payload: Record<string, any> = { query, targetClass };
    if (currentGraphIR) {
      payload.currentGraphIR = currentGraphIR;
    }
    if (scopedNodeIds && scopedNodeIds.length > 0) {
      payload.scopedNodeIds = scopedNodeIds;
    }

    // Set up a 45-second client timeout to accommodate multi-model fallback cascades
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort(new Error('Generation request timed out after 45 seconds.'));
    }, 45000);

    const handleExternalAbort = () => {
      timeoutController.abort(new Error('Generation request was cancelled.'));
    };

    if (signal) {
      if (signal.aborted) {
        clearTimeout(timeoutId);
        throw new Error('Generation request was cancelled.');
      }
      signal.addEventListener('abort', handleExternalAbort);
    }

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: timeoutController.signal,
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = `API request failed with status ${response.status}`;
        try {
          const errorJson = JSON.parse(responseText);
          if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Validate JSON response
      JSON.parse(responseText);
      return responseText;
    } catch (error) {
      console.error("[BlueprintGenerationService] API Call Error:", error);
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Blueprint generation failed: ${message}`);
    } finally {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener('abort', handleExternalAbort);
      }
    }
  }

  /**
   * Export blueprint graph to Unreal Engine 5 T3D ASCII clipboard format.
   */
  static exportToUnreal(nodes: Node<NodeData>[], edges: Edge[]): T3DCompileResult {
    return compileGraphToT3D(nodes, edges);
  }

  /**
   * Save blueprint graph as a template in Firestore.
   */
  static async saveAsTemplate(
    blueprint: { name: string; description: string; nodes: Node<NodeData>[]; edges: Edge[] },
    userId: string
  ): Promise<string> {
    return await saveBlueprintTemplate({
      name: blueprint.name || 'Untitled Template',
      description: blueprint.description || '',
      content: JSON.stringify(blueprint),
      category: 'custom',
      userId,
    });
  }
}
