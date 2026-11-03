import { describe, it, expect } from 'vitest';
import { transpileBlueprintToCpp } from '../blueprintTranspiler';
import { Node } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';

describe('Blueprint to Unreal Engine C++ Transpiler', () => {
  it('generates valid Unreal Engine 5 header and source files from graph', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'n1',
        type: 'customNode',
        position: { x: 100, y: 100 },
        data: {
          title: 'InputAction IA_Sprint',
          nodeType: 'event',
          inputs: [],
          outputs: [{ name: 'Started', type: 'exec' }],
        },
      },
      {
        id: 'n2',
        type: 'customNode',
        position: { x: 450, y: 100 },
        data: {
          title: 'Set Max Walk Speed',
          nodeType: 'function',
          inputs: [
            { name: 'Execute', type: 'exec' },
            { name: 'Max Walk Speed', type: 'float', value: 800.0 },
          ],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const result = transpileBlueprintToCpp('BP_CharacterSprint', 'Character', nodes, []);

    // Header checks
    expect(result.headerCode).toContain('class YOURGAME_API ACharacterSprint : public ACharacter');
    expect(result.headerCode).toContain('UFUNCTION(BlueprintCallable');

    // Source checks
    expect(result.sourceCode).toContain('ACharacterSprint::BeginPlay()');
    expect(result.sourceCode).toContain('GetCharacterMovement()->MaxWalkSpeed = 800.0f');

    // Audit checks
    expect(result.complexityScore).toBe('Optimal');
  });
});
