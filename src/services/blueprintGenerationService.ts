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
  static async generateFromQuery(query: string, idToken?: string, targetClass: string = 'Actor'): Promise<string> {
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

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, targetClass }),
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
