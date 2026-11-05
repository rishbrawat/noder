import { describe, it, expect } from 'vitest';
import { getNodePresetsForGraph } from '../components/NodeLibraryDrawer';
import { validateGraph } from '../utils/blueprintValidator';
import { compileMaterialToT3D } from '../features/shaders/utils/ueMaterialT3DCompiler';
import { compileNiagaraToT3D } from '../features/niagara/utils/ueNiagaraT3DCompiler';
import { compileGameplayAbilityToT3D } from '../features/gas/utils/gasT3DCompiler';
import { compileGraphToT3D } from '../utils/ueT3DCompiler';
import { DEFAULT_NIAGARA_CONFIG } from '../features/niagara/data/niagaraModulesCatalog';
import { PRESET_ABILITY_DODGE } from '../features/gas/data/gasCatalog';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../types/BlueprintTypes';

describe('Milestone 5: Modular Additive Integration & Zero UI Regressions', () => {
  describe('Dynamic Node Catalog Swapping (getNodePresetsForGraph)', () => {
    it('returns standard UE nodes for EventGraph and ConstructionScript', () => {
      const eventCatalog = getNodePresetsForGraph('EventGraph');
      const constructionCatalog = getNodePresetsForGraph('ConstructionScript');

      expect(eventCatalog.length).toBeGreaterThanOrEqual(30);
      expect(constructionCatalog.length).toBeGreaterThanOrEqual(30);
      expect(eventCatalog.some(n => n.title === 'Event BeginPlay')).toBe(true);
      expect(eventCatalog.some(n => n.title === 'Event Tick')).toBe(true);
    });

    it('returns Material Expression nodes for ShadersUE mode', () => {
      const shaderCatalog = getNodePresetsForGraph('ShadersUE');

      expect(shaderCatalog.length).toBeGreaterThanOrEqual(20);
      expect(shaderCatalog.some(n => n.title === 'Constant (Scalar)')).toBe(true);
      expect(shaderCatalog.some(n => n.title.includes('Constant3Vector'))).toBe(true);
      expect(shaderCatalog.some(n => n.title === 'Multiply')).toBe(true);
      expect(shaderCatalog.some(n => n.title === 'LinearInterpolate (Lerp)')).toBe(true);
      expect(shaderCatalog.some(n => n.title === 'Fresnel')).toBe(true);

      // Verify categories in ShadersUE
      const categories = new Set<string>(shaderCatalog.map(n => n.category));
      expect(categories.has('Constants & Parameters')).toBe(true);
      expect(categories.has('Math')).toBe(true);
      expect(categories.has('Vector Math')).toBe(true);
      expect(categories.has('Color & Blending')).toBe(true);
    });

    it('returns Niagara modules for NiagaraVFX mode', () => {
      const niagaraCatalog = getNodePresetsForGraph('NiagaraVFX');

      expect(niagaraCatalog.length).toBeGreaterThanOrEqual(14);
      expect(niagaraCatalog.some(n => n.title === 'System State')).toBe(true);
      expect(niagaraCatalog.some(n => n.title === 'Emitter Properties')).toBe(true);
      expect(niagaraCatalog.some(n => n.title === 'Spawn Rate')).toBe(true);
      expect(niagaraCatalog.some(n => n.title === 'Gravity Force')).toBe(true);
      expect(niagaraCatalog.some(n => n.title === 'Sprite Renderer')).toBe(true);

      // Verify stages / subtitles
      expect(niagaraCatalog.some(n => n.subtitle === 'EmitterSpawn')).toBe(true);
      expect(niagaraCatalog.some(n => n.subtitle === 'ParticleUpdate')).toBe(true);
    });

    it('returns GAS ability tasks and core execution nodes for GASStudio mode', () => {
      const gasCatalog = getNodePresetsForGraph('GASStudio');

      expect(gasCatalog.length).toBeGreaterThanOrEqual(6);
      expect(gasCatalog.some(n => n.title === 'ActivateAbility')).toBe(true);
      expect(gasCatalog.some(n => n.title === 'Commit Ability')).toBe(true);
      expect(gasCatalog.some(n => n.title === 'End Ability')).toBe(true);
      expect(gasCatalog.some(n => n.title === 'Play Montage And Wait')).toBe(true);
      expect(gasCatalog.some(n => n.title === 'Wait Delay')).toBe(true);
      expect(gasCatalog.some(n => n.title === 'Wait Gameplay Event')).toBe(true);
    });
  });

  describe('One-Click UE5 Copy Routing per activeGraphType', () => {
    it('routes ShadersUE to compileMaterialToT3D clipboard syntax', () => {
      const shaderNodes: Node<NodeData>[] = [
        {
          id: 'root-node',
          type: 'customNode',
          position: { x: 400, y: 100 },
          data: {
            title: 'Material Root',
            nodeType: 'customNode',
            inputs: [{ name: 'BaseColor', type: 'vector3' }],
            outputs: [],
          },
        },
        {
          id: 'vec-node',
          type: 'customNode',
          position: { x: 100, y: 100 },
          data: {
            title: 'Constant3Vector (RGB)',
            nodeType: 'customNode',
            inputs: [],
            outputs: [{ name: 'RGB', type: 'vector3' }],
          },
        },
      ];
      const shaderEdges: Edge[] = [
        {
          id: 'e1',
          source: 'vec-node',
          sourceHandle: 'vector3-rgb',
          target: 'root-node',
          targetHandle: 'vector3-basecolor',
        },
      ];

      const result = compileMaterialToT3D(shaderNodes, shaderEdges);
      expect(result.t3dText).toContain('MaterialExpressionConstant3Vector');
      expect(result.t3dText).toContain('Material Name="M_CustomShader"');
      expect(result.t3dText).toContain('BaseColor=(Expression=MaterialExpressionConstant3Vector');
    });

    it('routes NiagaraVFX to compileNiagaraToT3D clipboard syntax', () => {
      const result = compileNiagaraToT3D(DEFAULT_NIAGARA_CONFIG);
      expect(result.t3dText).toContain('Begin Object Class=/Script/Niagara.NiagaraEmitter');
      expect(result.t3dText).toContain('NiagaraNodeFunctionCall_SpawnRate');
      expect(result.t3dText).toContain('NiagaraNodeFunctionCall_Gravity');
      expect(result.t3dText).toContain('NiagaraSpriteRendererProperties');
    });

    it('routes GASStudio to compileGameplayAbilityToT3D Blueprint K2 syntax', () => {
      const result = compileGameplayAbilityToT3D(PRESET_ABILITY_DODGE);
      expect(result.t3dText).toContain('K2Node_Event_ActivateAbility');
      expect(result.t3dText).toContain('K2Node_CallFunction_CommitAbility');
      expect(result.t3dText).toContain('K2Node_AsyncAction_PlayMontage');
      expect(result.t3dText).toContain('K2Node_CallFunction_EndAbility');
    });

    it('routes standard modes to compileGraphToT3D K2 execution syntax', () => {
      const nodes: Node<NodeData>[] = [
        {
          id: 'ev-1',
          type: 'customNode',
          position: { x: 100, y: 100 },
          data: {
            title: 'Event BeginPlay',
            nodeType: 'event',
            inputs: [],
            outputs: [{ name: 'Then', type: 'exec' }],
          },
        },
      ];
      const result = compileGraphToT3D(nodes, []);
      expect(result.t3dText).toContain('K2Node_Event');
    });
  });

  describe('Context-Aware Graph Validator Integration', () => {
    it('validates pure dataflow in ShadersUE without erroring on missing execution lines', () => {
      const nodes: Node<NodeData>[] = [
        {
          id: 'sn-1',
          type: 'customNode',
          position: { x: 50, y: 50 },
          data: {
            title: 'Constant (Scalar)',
            nodeType: 'customNode',
            inputs: [],
            outputs: [{ name: 'Out', type: 'float' }],
          },
        },
      ];

      const report = validateGraph(nodes, [], 'ShadersUE');
      expect(report.isValid).toBe(true);
      expect(report.errorCount).toBe(0);
      expect(report.warningCount).toBe(0);
    });

    it('preserves strict execution rules for EventGraph', () => {
      const nodes: Node<NodeData>[] = [
        {
          id: 'impure-fn',
          type: 'customNode',
          position: { x: 50, y: 50 },
          data: {
            title: 'Print String',
            nodeType: 'function',
            inputs: [{ name: 'Execute', type: 'exec' }],
            outputs: [{ name: 'Then', type: 'exec' }],
          },
        },
      ];

      const report = validateGraph(nodes, [], 'EventGraph');
      expect(report.warningCount).toBeGreaterThan(0);
      expect(report.issues.some(i => i.id === 'no-entry-event')).toBe(true);
      expect(report.issues.some(i => i.id.startsWith('unconnected-exec-in-'))).toBe(true);
    });
  });
});
