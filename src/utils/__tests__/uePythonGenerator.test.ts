import { describe, it, expect } from 'vitest';
import { generateUE5PythonScript } from '../uePythonGenerator';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';
import { execSync } from 'child_process';

/**
 * Validates Python script syntax using Python's standard `ast.parse()`.
 * If python is installed in the test environment, parses the AST and fails if syntax/indentation is invalid.
 * Also performs static indentation assertions across all logical lines inside the function body.
 */
function assertValidPythonScript(script: string): void {
  let hasPython = false;
  try {
    execSync('python --version', { stdio: 'ignore' });
    hasPython = true;
  } catch {
    hasPython = false;
  }

  if (hasPython) {
    // ast.parse validates full Python grammar (indentation, strings, docstrings) without executing or importing 'unreal'
    execSync('python -c "import ast, sys; ast.parse(sys.stdin.read())"', {
      input: script,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }

  // Structural static indentation check (runs in all environments)
  const lines = script.split('\n');
  let inFunctionBody = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('def generate_')) {
      inFunctionBody = true;
      continue;
    }
    if (inFunctionBody) {
      if (line.trim().length === 0) {
        continue;
      }
      if (line.startsWith('# Raw T3D') || line.startsWith('T3D_CLIPBOARD_DATA =') || line.startsWith('if __name__') || !line.startsWith(' ')) {
        inFunctionBody = false;
        continue;
      }
      // Non-blank lines inside generate_*_blueprint() must be indented with at least 4 spaces
      expect(line.startsWith('    ')).toBe(true);
      // Sibling statements at depth 1 must start with exactly 4 spaces (not 8)
      if (line.trim().startsWith('unreal.log("  * [Node:') || line.trim().startsWith('unreal.log("  * (Empty graph)')) {
        expect(line.startsWith('    unreal.log(')).toBe(true);
        expect(line.startsWith('        unreal.log(')).toBe(false);
      }
    }
  }
}

describe('uePythonGenerator', () => {
  it('generates an executable Unreal Engine 5 Python automation script', () => {
    const mockNodes: Node<NodeData>[] = [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 150 },
        data: {
          title: 'Event BeginPlay',
          nodeType: 'event',
          inputs: [],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
      {
        id: 'node-2',
        type: 'customNode',
        position: { x: 400, y: 150 },
        data: {
          title: 'Print String',
          nodeType: 'function',
          inputs: [
            { name: 'Execute', type: 'exec' },
            { name: 'InString', type: 'string', value: 'Hello Unreal!' },
          ],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const mockEdges: Edge[] = [
      {
        id: 'edge-1',
        source: 'node-1',
        sourceHandle: 'exec-out-0',
        target: 'node-2',
        targetHandle: 'exec-in-0',
      },
    ];

    const result = generateUE5PythonScript(mockNodes, mockEdges, {
      blueprintName: 'BP_TestAutomation',
      targetClass: 'Character',
    });

    expect(result.fileName).toBe('BP_TestAutomation_Generator.py');
    expect(result.nodeCount).toBe(2);
    expect(result.connectionCount).toBe(1);
    expect(result.script).toContain('import unreal');
    expect(result.script).toContain('def generate_bp_testautomation_blueprint():');
    expect(result.script).toContain('package_path = "/Game/Blueprints"');
    expect(result.script).toContain('unreal.BlueprintFactory()');
    expect(result.script).toContain('/Script/Engine.Character');
    expect(result.script).toContain('T3D_CLIPBOARD_DATA = r\'\'\'');
    expect(result.script).toContain('Print String');
    expect(() => assertValidPythonScript(result.script)).not.toThrow();
  });

  it('handles empty graphs gracefully', () => {
    const result = generateUE5PythonScript([], [], {
      blueprintName: 'BP_Empty',
    });

    expect(result.fileName).toBe('BP_Empty_Generator.py');
    expect(result.nodeCount).toBe(0);
    expect(result.connectionCount).toBe(0);
    expect(result.script).toContain('import unreal');
    expect(() => assertValidPythonScript(result.script)).not.toThrow();
  });

  it('produces valid Python AST syntax for standard node graphs without indentation errors', () => {
    const mockNodes: Node<NodeData>[] = [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 150 },
        data: {
          title: 'Event BeginPlay',
          nodeType: 'event',
          inputs: [],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];
    const result = generateUE5PythonScript(mockNodes, [], {
      blueprintName: 'BP_TestAutomation',
      targetClass: 'Character',
    });
    expect(() => assertValidPythonScript(result.script)).not.toThrow();
  });

  it('sanitizes quotes and special characters in blueprintName and node titles', () => {
    const adversarialNodes: Node<NodeData>[] = [
      {
        id: 'node-adv-1',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Special "Node" \\ Path',
          nodeType: 'function',
          inputs: [],
          outputs: [],
        },
      },
    ];

    const result = generateUE5PythonScript(adversarialNodes, [], {
      blueprintName: 'BP_Special "Asset" 123',
      targetClass: 'Actor"Test',
      packagePath: '/Game/Bad "Path"/Sub',
    });

    // Check filename and asset name are clean
    expect(result.fileName).toBe('BP_Special_Asset_123_Generator.py');
    expect(result.script).toContain('asset_name = "BP_Special_Asset_123"');
    expect(result.script).not.toContain('BP_Special "Asset"');

    // Must pass AST validation cleanly
    expect(() => assertValidPythonScript(result.script)).not.toThrow();
  });
});

