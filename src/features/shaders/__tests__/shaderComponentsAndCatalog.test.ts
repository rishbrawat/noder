import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MATERIAL_EXPRESSIONS, SHADER_PRESETS } from '../data/materialNodesCatalog';
import * as utilsCatalog from '../utils/materialNodesCatalog';
import { updateMeshGeometry } from '../components/ShaderPreviewViewport';

describe('ShadersUE: Material Nodes Catalog & Pure Mathematical Dataflow', () => {
  it('should enforce pure mathematical dataflow with zero exec pins across entire catalog', () => {
    MATERIAL_EXPRESSIONS.forEach((expr) => {
      // Inputs check
      expr.inputs.forEach((pin) => {
        expect(pin.type).not.toBe('exec');
        expect(pin.name.toLowerCase()).not.toBe('exec');
        expect(pin.name.toLowerCase()).not.toBe('execute');
      });

      // Outputs check
      expr.outputs.forEach((pin) => {
        expect(pin.type).not.toBe('exec');
        expect(pin.name.toLowerCase()).not.toBe('exec');
        expect(pin.name.toLowerCase()).not.toBe('then');
      });
    });
  });

  it('should include all required math, vector calculus, UV, color, and root nodes in catalog', () => {
    const titles = MATERIAL_EXPRESSIONS.map((e) => e.title);
    expect(titles.length).toBeGreaterThan(20);
    const classes = MATERIAL_EXPRESSIONS.map((e) => e.ueClassName);

    // Constants
    expect(classes).toContain('MaterialExpressionConstant');
    expect(classes).toContain('MaterialExpressionConstant2Vector');
    expect(classes).toContain('MaterialExpressionConstant3Vector');
    expect(classes).toContain('MaterialExpressionConstant4Vector');
    expect(classes).toContain('MaterialExpressionScalarParameter');
    expect(classes).toContain('MaterialExpressionVectorParameter');

    // Math
    expect(classes).toContain('MaterialExpressionAdd');
    expect(classes).toContain('MaterialExpressionSubtract');
    expect(classes).toContain('MaterialExpressionMultiply');
    expect(classes).toContain('MaterialExpressionDivide');
    expect(classes).toContain('MaterialExpressionPower');
    expect(classes).toContain('MaterialExpressionClamp');
    expect(classes).toContain('MaterialExpressionSaturate');
    expect(classes).toContain('MaterialExpressionSine');
    expect(classes).toContain('MaterialExpressionCosine');
    expect(classes).toContain('MaterialExpressionTangent');
    expect(classes).toContain('MaterialExpressionAbs');
    expect(classes).toContain('MaterialExpressionSquareRoot');

    // Vector calculus
    expect(classes).toContain('MaterialExpressionDotProduct');
    expect(classes).toContain('MaterialExpressionCrossProduct');
    expect(classes).toContain('MaterialExpressionNormalize');
    expect(classes).toContain('MaterialExpressionVectorLength');
    expect(classes).toContain('MaterialExpressionDistance');
    expect(classes).toContain('MaterialExpressionReflectionVectorWS');

    // UV & Textures
    expect(classes).toContain('MaterialExpressionTextureCoordinate');
    expect(classes).toContain('MaterialExpressionPanner');
    expect(classes).toContain('MaterialExpressionRotator');
    expect(classes).toContain('MaterialExpressionTextureSample');

    // Color & VFX
    expect(classes).toContain('MaterialExpressionLinearInterpolate');
    expect(classes).toContain('MaterialExpressionDesaturation');
    expect(classes).toContain('MaterialExpressionComponentMask');
    expect(classes).toContain('MaterialExpressionFresnel');
    expect(classes).toContain('MaterialExpressionDepthFade');
    expect(classes).toContain('MaterialExpressionWorldPositionOffset');

    // Root Master
    expect(classes).toContain('MaterialGraphNode_Root');
  });

  it('should verify Master Material Root defines all 8 PBR input pins', () => {
    const root = MATERIAL_EXPRESSIONS.find((e) => e.ueClassName === 'MaterialGraphNode_Root');
    expect(root).toBeDefined();

    const pinNames = root!.inputs.map((p) => p.name);
    expect(pinNames).toContain('BaseColor');
    expect(pinNames).toContain('Metallic');
    expect(pinNames).toContain('Specular');
    expect(pinNames).toContain('Roughness');
    expect(pinNames).toContain('EmissiveColor');
    expect(pinNames).toContain('Opacity');
    expect(pinNames).toContain('Normal');
    expect(pinNames).toContain('WorldPositionOffset');
  });

  it('should verify all 6 standard PBR Shader Presets are defined with valid properties', () => {
    expect(SHADER_PRESETS.length).toBe(6);

    const presetIds = SHADER_PRESETS.map((p) => p.id);
    expect(presetIds).toContain('preset_gold');
    expect(presetIds).toContain('preset_chrome');
    expect(presetIds).toContain('preset_glass');
    expect(presetIds).toContain('preset_plasma');
    expect(presetIds).toContain('preset_rust');
    expect(presetIds).toContain('preset_obsidian');

    SHADER_PRESETS.forEach((preset) => {
      expect(preset.name).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.previewColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(preset.properties.roughness).toBeDefined();
      expect(preset.properties.metallic).toBeDefined();
    });
  });

  it('should re-export identical expressions and presets from utils/materialNodesCatalog', () => {
    expect(utilsCatalog.MATERIAL_EXPRESSIONS).toEqual(MATERIAL_EXPRESSIONS);
    expect(utilsCatalog.SHADER_PRESETS).toEqual(SHADER_PRESETS);
  });
});

describe('ShadersUE: 3D Viewport Geometry Factory (updateMeshGeometry)', () => {
  const testMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x888888,
    metalness: 0.5,
    roughness: 0.4,
  });

  it('should construct UE5 composite Shader Ball with outer sphere, inner core, and base torus ring', () => {
    const group = new THREE.Group();
    updateMeshGeometry('shaderball', group, testMaterial);

    expect(group.children.length).toBe(3);

    // 1. Outer sphere
    const outer = group.children[0] as THREE.Mesh;
    expect(outer.geometry).toBeInstanceOf(THREE.SphereGeometry);
    const outerParams = (outer.geometry as THREE.SphereGeometry).parameters;
    expect(outerParams.radius).toBe(1.0);

    // 2. Recessed core sphere
    const inner = group.children[1] as THREE.Mesh;
    expect(inner.geometry).toBeInstanceOf(THREE.SphereGeometry);
    const innerParams = (inner.geometry as THREE.SphereGeometry).parameters;
    expect(innerParams.radius).toBeCloseTo(0.68);
    expect(inner.position.z).toBeCloseTo(0.45);
    // Inner core roughness halved
    const innerMat = inner.material as THREE.MeshPhysicalMaterial;
    expect(innerMat.roughness).toBeCloseTo(0.2);

    // 3. Base pedestal ring
    const ring = group.children[2] as THREE.Mesh;
    expect(ring.geometry).toBeInstanceOf(THREE.TorusGeometry);
    const ringParams = (ring.geometry as THREE.TorusGeometry).parameters;
    expect(ringParams.radius).toBeCloseTo(1.05);
    expect(ring.position.y).toBeCloseTo(-0.6);
  });

  it('should construct Sphere mesh shape', () => {
    const group = new THREE.Group();
    updateMeshGeometry('sphere', group, testMaterial);

    expect(group.children.length).toBe(1);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh.geometry).toBeInstanceOf(THREE.SphereGeometry);
    expect((mesh.geometry as THREE.SphereGeometry).parameters.radius).toBe(1.1);
  });

  it('should construct Cube mesh shape', () => {
    const group = new THREE.Group();
    updateMeshGeometry('cube', group, testMaterial);

    expect(group.children.length).toBe(1);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
    const params = (mesh.geometry as THREE.BoxGeometry).parameters;
    expect(params.width).toBe(1.6);
    expect(params.height).toBe(1.6);
    expect(params.depth).toBe(1.6);
  });

  it('should construct Cylinder mesh shape', () => {
    const group = new THREE.Group();
    updateMeshGeometry('cylinder', group, testMaterial);

    expect(group.children.length).toBe(1);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh.geometry).toBeInstanceOf(THREE.CylinderGeometry);
    const params = (mesh.geometry as THREE.CylinderGeometry).parameters;
    expect(params.radiusTop).toBe(0.9);
    expect(params.height).toBe(1.8);
  });

  it('should construct Plane mesh shape', () => {
    const group = new THREE.Group();
    updateMeshGeometry('plane', group, testMaterial);

    expect(group.children.length).toBe(1);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    const params = (mesh.geometry as THREE.PlaneGeometry).parameters;
    expect(params.width).toBe(2.2);
    expect(params.height).toBe(2.2);
  });

  it('should properly dispose previous geometry when switching between shapes', () => {
    const group = new THREE.Group();
    updateMeshGeometry('cube', group, testMaterial);
    const initialGeom = (group.children[0] as THREE.Mesh).geometry;
    let disposeCalled = false;
    initialGeom.dispose = () => {
      disposeCalled = true;
    };

    updateMeshGeometry('sphere', group, testMaterial);
    expect(disposeCalled).toBe(true);
    expect(group.children.length).toBe(1);
    expect(group.children[0] as THREE.Mesh).not.toBe(initialGeom);
  });
});
