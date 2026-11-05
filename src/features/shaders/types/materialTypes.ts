export type MaterialExpressionCategory = 
  | 'Constants & Parameters'
  | 'Math'
  | 'Vector Math'
  | 'Textures & UVs'
  | 'Color & Blending'
  | 'VFX & Utility'
  | 'Material Outputs';

export interface MaterialPinDefinition {
  name: string;
  type: 'float' | 'vector2d' | 'vector3' | 'vector4' | 'texture' | 'materialattributes';
  defaultValue?: number | number[] | string;
  description?: string;
}

export interface MaterialNodeDefinition {
  id: string;
  title: string;
  category: MaterialExpressionCategory;
  ueClassName: string;
  color: string;
  inputs: MaterialPinDefinition[];
  outputs: MaterialPinDefinition[];
  description: string;
  defaultProperties?: Record<string, any>;
}

export interface MaterialGraphProperties {
  baseColor: [number, number, number];
  metallic: number;
  specular: number;
  roughness: number;
  emissiveColor: [number, number, number];
  opacity: number;
  normal: [number, number, number];
  worldPositionOffset: [number, number, number];
  shadingModel: 'DefaultLit' | 'Subsurface' | 'ClearCoat' | 'Unlit';
  twoSided: boolean;
}

export interface ShaderPreset {
  id: string;
  name: string;
  description: string;
  properties: Partial<MaterialGraphProperties>;
  previewColor: string;
}
