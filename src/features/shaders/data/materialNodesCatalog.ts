import { MaterialNodeDefinition, ShaderPreset } from '../types/materialTypes';

export const MATERIAL_EXPRESSIONS: MaterialNodeDefinition[] = [
  // --- Constants & Parameters ---
  {
    id: 'mat_scalar_const',
    title: 'Constant (Scalar)',
    category: 'Constants & Parameters',
    ueClassName: 'MaterialExpressionConstant',
    color: '#0284C7',
    inputs: [],
    outputs: [{ name: 'Out', type: 'float', defaultValue: 1.0 }],
    description: 'Outputs a single float scalar value.',
    defaultProperties: { R: 1.0 }
  },
  {
    id: 'mat_vec2_const',
    title: 'Constant2Vector',
    category: 'Constants & Parameters',
    ueClassName: 'MaterialExpressionConstant2Vector',
    color: '#0284C7',
    inputs: [],
    outputs: [{ name: 'Out', type: 'vector2d', defaultValue: [1.0, 1.0] }],
    description: 'Outputs a 2-channel RG / UV vector.',
    defaultProperties: { R: 1.0, G: 1.0 }
  },
  {
    id: 'mat_vec3_const',
    title: 'Constant3Vector (RGB)',
    category: 'Constants & Parameters',
    ueClassName: 'MaterialExpressionConstant3Vector',
    color: '#0284C7',
    inputs: [],
    outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [1.0, 0.84, 0.0] }],
    description: 'Outputs a 3-channel RGB color vector.',
    defaultProperties: { Constant: { R: 1.0, G: 0.84, B: 0.0, A: 0.0 } }
  },
  {
    id: 'mat_vec4_const',
    title: 'Constant4Vector (RGBA)',
    category: 'Constants & Parameters',
    ueClassName: 'MaterialExpressionConstant4Vector',
    color: '#0284C7',
    inputs: [],
    outputs: [{ name: 'RGBA', type: 'vector4', defaultValue: [1.0, 1.0, 1.0, 1.0] }],
    description: 'Outputs a 4-channel RGBA vector with alpha.',
    defaultProperties: { Constant: { R: 1.0, G: 1.0, B: 1.0, A: 1.0 } }
  },
  {
    id: 'mat_scalar_param',
    title: 'ScalarParameter',
    category: 'Constants & Parameters',
    ueClassName: 'MaterialExpressionScalarParameter',
    color: '#0EA5E9',
    inputs: [],
    outputs: [{ name: 'Param', type: 'float', defaultValue: 0.5 }],
    description: 'A scalar float parameter exposed to Material Instances.',
    defaultProperties: { ParameterName: 'Param_Scalar', DefaultValue: 0.5 }
  },
  {
    id: 'mat_vector_param',
    title: 'VectorParameter',
    category: 'Constants & Parameters',
    ueClassName: 'MaterialExpressionVectorParameter',
    color: '#0EA5E9',
    inputs: [],
    outputs: [{ name: 'RGB', type: 'vector3' }, { name: 'A', type: 'float' }],
    description: 'A vector color parameter exposed to Material Instances.',
    defaultProperties: { ParameterName: 'Param_Color', DefaultValue: { R: 1.0, G: 1.0, B: 1.0, A: 1.0 } }
  },
  {
    id: 'mat_static_switch',
    title: 'StaticSwitchParameter',
    category: 'Constants & Parameters',
    ueClassName: 'MaterialExpressionStaticSwitchParameter',
    color: '#0EA5E9',
    inputs: [
      { name: 'True', type: 'vector3' },
      { name: 'False', type: 'vector3' }
    ],
    outputs: [{ name: 'Out', type: 'vector3' }],
    description: 'Static branching switch configured at material instance compilation.',
    defaultProperties: { ParameterName: 'EnableFeature', DefaultValue: true }
  },
  {
    id: 'mat_texture_sample',
    title: 'Texture Sample',
    category: 'Textures & UVs',
    ueClassName: 'MaterialExpressionTextureSample',
    color: '#9333EA',
    inputs: [
      { name: 'UVs', type: 'vector2d' },
      { name: 'Tex', type: 'texture' }
    ],
    outputs: [
      { name: 'RGB', type: 'vector3' },
      { name: 'R', type: 'float' },
      { name: 'G', type: 'float' },
      { name: 'B', type: 'float' },
      { name: 'A', type: 'float' }
    ],
    description: 'Samples an Unreal Engine 2D Texture Asset using UV coordinates.',
    defaultProperties: { SamplerType: 'SAMPLERTYPE_Color' }
  },
  {
    id: 'mat_texture_coord',
    title: 'TextureCoordinate (TexCoord)',
    category: 'Textures & UVs',
    ueClassName: 'MaterialExpressionTextureCoordinate',
    color: '#9333EA',
    inputs: [],
    outputs: [{ name: 'UV', type: 'vector2d' }],
    description: 'Provides UV coordinates for texture mapping, with tiling parameters.',
    defaultProperties: { UTiling: 1.0, VTiling: 1.0 }
  },
  {
    id: 'mat_panner',
    title: 'Panner',
    category: 'Textures & UVs',
    ueClassName: 'MaterialExpressionPanner',
    color: '#9333EA',
    inputs: [
      { name: 'Coordinate', type: 'vector2d' },
      { name: 'Time', type: 'float' },
      { name: 'Speed', type: 'vector2d' }
    ],
    outputs: [{ name: 'UV', type: 'vector2d' }],
    description: 'Scrolls UV coordinates over time to animate flow, water, or flames.',
    defaultProperties: { SpeedX: 0.1, SpeedY: 0.0 }
  },
  {
    id: 'mat_rotator',
    title: 'Rotator',
    category: 'Textures & UVs',
    ueClassName: 'MaterialExpressionRotator',
    color: '#9333EA',
    inputs: [
      { name: 'Coordinate', type: 'vector2d' },
      { name: 'Time', type: 'float' }
    ],
    outputs: [{ name: 'UV', type: 'vector2d' }],
    description: 'Rotates UV coordinates around a center point.',
    defaultProperties: { CenterX: 0.5, CenterY: 0.5, Speed: 0.25 }
  },

  // --- Math Operations ---
  {
    id: 'mat_add',
    title: 'Add',
    category: 'Math',
    ueClassName: 'MaterialExpressionAdd',
    color: '#16A34A',
    inputs: [
      { name: 'A', type: 'vector3', defaultValue: 0 },
      { name: 'B', type: 'vector3', defaultValue: 0 }
    ],
    outputs: [{ name: 'Out', type: 'vector3' }],
    description: 'Performs element-wise addition A + B.'
  },
  {
    id: 'mat_subtract',
    title: 'Subtract',
    category: 'Math',
    ueClassName: 'MaterialExpressionSubtract',
    color: '#16A34A',
    inputs: [
      { name: 'A', type: 'vector3', defaultValue: 0 },
      { name: 'B', type: 'vector3', defaultValue: 0 }
    ],
    outputs: [{ name: 'Out', type: 'vector3' }],
    description: 'Performs element-wise subtraction A - B.'
  },
  {
    id: 'mat_multiply',
    title: 'Multiply',
    category: 'Math',
    ueClassName: 'MaterialExpressionMultiply',
    color: '#16A34A',
    inputs: [
      { name: 'A', type: 'vector3', defaultValue: 1 },
      { name: 'B', type: 'vector3', defaultValue: 1 }
    ],
    outputs: [{ name: 'Out', type: 'vector3' }],
    description: 'Performs element-wise multiplication A * B.'
  },
  {
    id: 'mat_divide',
    title: 'Divide',
    category: 'Math',
    ueClassName: 'MaterialExpressionDivide',
    color: '#16A34A',
    inputs: [
      { name: 'A', type: 'vector3', defaultValue: 1 },
      { name: 'B', type: 'vector3', defaultValue: 1 }
    ],
    outputs: [{ name: 'Out', type: 'vector3' }],
    description: 'Performs element-wise division A / B.'
  },
  {
    id: 'mat_power',
    title: 'Power',
    category: 'Math',
    ueClassName: 'MaterialExpressionPower',
    color: '#16A34A',
    inputs: [
      { name: 'Base', type: 'float', defaultValue: 1 },
      { name: 'Exponent', type: 'float', defaultValue: 2 }
    ],
    outputs: [{ name: 'Out', type: 'float' }],
    description: 'Computes Base raised to the power Exponent.'
  },
  {
    id: 'mat_clamp',
    title: 'Clamp',
    category: 'Math',
    ueClassName: 'MaterialExpressionClamp',
    color: '#16A34A',
    inputs: [
      { name: 'In', type: 'vector3' },
      { name: 'Min', type: 'float', defaultValue: 0.0 },
      { name: 'Max', type: 'float', defaultValue: 1.0 }
    ],
    outputs: [{ name: 'Out', type: 'vector3' }],
    description: 'Constrains a value between Min and Max.'
  },
  {
    id: 'mat_saturate',
    title: 'Saturate',
    category: 'Math',
    ueClassName: 'MaterialExpressionSaturate',
    color: '#16A34A',
    inputs: [{ name: 'In', type: 'vector3' }],
    outputs: [{ name: 'Out', type: 'vector3' }],
    description: 'Clamps input value between 0.0 and 1.0 (free on GPU).'
  },
  {
    id: 'mat_sin',
    title: 'Sine (Sin)',
    category: 'Math',
    ueClassName: 'MaterialExpressionSine',
    color: '#16A34A',
    inputs: [{ name: 'In', type: 'float' }],
    outputs: [{ name: 'Out', type: 'float' }],
    description: 'Computes sine in normalized period (0.0 to 1.0 = 0 to 2*PI).'
  },
  {
    id: 'mat_cos',
    title: 'Cosine (Cos)',
    category: 'Math',
    ueClassName: 'MaterialExpressionCosine',
    color: '#16A34A',
    inputs: [{ name: 'In', type: 'float' }],
    outputs: [{ name: 'Out', type: 'float' }],
    description: 'Computes cosine in normalized period.'
  },
  {
    id: 'mat_tangent',
    title: 'Tangent (Tan)',
    category: 'Math',
    ueClassName: 'MaterialExpressionTangent',
    color: '#16A34A',
    inputs: [{ name: 'In', type: 'float' }],
    outputs: [{ name: 'Out', type: 'float' }],
    description: 'Computes the tangent of the input angle in radians.'
  },
  {
    id: 'mat_abs',
    title: 'Abs',
    category: 'Math',
    ueClassName: 'MaterialExpressionAbs',
    color: '#16A34A',
    inputs: [{ name: 'In', type: 'vector3' }],
    outputs: [{ name: 'Out', type: 'vector3' }],
    description: 'Computes the absolute value of the input.'
  },
  {
    id: 'mat_sqrt',
    title: 'SquareRoot (Sqrt)',
    category: 'Math',
    ueClassName: 'MaterialExpressionSquareRoot',
    color: '#16A34A',
    inputs: [{ name: 'In', type: 'float', defaultValue: 1.0 }],
    outputs: [{ name: 'Out', type: 'float' }],
    description: 'Computes the square root of the input.'
  },

  // --- Vector & Coordinate Math ---
  {
    id: 'mat_dot',
    title: 'Dot Product',
    category: 'Vector Math',
    ueClassName: 'MaterialExpressionDotProduct',
    color: '#2563EB',
    inputs: [
      { name: 'A', type: 'vector3' },
      { name: 'B', type: 'vector3' }
    ],
    outputs: [{ name: 'Out', type: 'float' }],
    description: 'Calculates the scalar dot product between two vectors.'
  },
  {
    id: 'mat_cross',
    title: 'Cross Product',
    category: 'Vector Math',
    ueClassName: 'MaterialExpressionCrossProduct',
    color: '#2563EB',
    inputs: [
      { name: 'A', type: 'vector3' },
      { name: 'B', type: 'vector3' }
    ],
    outputs: [{ name: 'Out', type: 'vector3' }],
    description: 'Computes the vector perpendicular to both vectors A and B.'
  },
  {
    id: 'mat_normalize',
    title: 'Normalize',
    category: 'Vector Math',
    ueClassName: 'MaterialExpressionNormalize',
    color: '#2563EB',
    inputs: [{ name: 'Vector', type: 'vector3' }],
    outputs: [{ name: 'Out', type: 'vector3' }],
    description: 'Returns vector scaled to unit length (length 1.0).'
  },
  {
    id: 'mat_vector_length',
    title: 'VectorLength',
    category: 'Vector Math',
    ueClassName: 'MaterialExpressionVectorLength',
    color: '#2563EB',
    inputs: [{ name: 'Vector', type: 'vector3' }],
    outputs: [{ name: 'Length', type: 'float' }],
    description: 'Calculates the scalar Euclidean length of a vector: ||V||_2.'
  },
  {
    id: 'mat_distance',
    title: 'Distance',
    category: 'Vector Math',
    ueClassName: 'MaterialExpressionDistance',
    color: '#2563EB',
    inputs: [
      { name: 'A', type: 'vector3' },
      { name: 'B', type: 'vector3' }
    ],
    outputs: [{ name: 'Out', type: 'float' }],
    description: 'Calculates the Euclidean distance between two points: ||A - B||_2.'
  },
  {
    id: 'mat_reflection_vector',
    title: 'ReflectionVectorWS',
    category: 'Vector Math',
    ueClassName: 'MaterialExpressionReflectionVectorWS',
    color: '#2563EB',
    inputs: [],
    outputs: [{ name: 'Out', type: 'vector3' }],
    description: 'World space reflection vector of incident camera ray bouncing off surface normal.'
  },
  {
    id: 'mat_camera_vector',
    title: 'CameraVectorWS',
    category: 'Vector Math',
    ueClassName: 'MaterialExpressionCameraVectorWS',
    color: '#2563EB',
    inputs: [],
    outputs: [{ name: 'Vector', type: 'vector3' }],
    description: 'Direction vector from pixel in world space toward the camera.'
  },
  {
    id: 'mat_pixel_normal',
    title: 'PixelNormalWS',
    category: 'Vector Math',
    ueClassName: 'MaterialExpressionPixelNormalWS',
    color: '#2563EB',
    inputs: [],
    outputs: [{ name: 'Normal', type: 'vector3' }],
    description: 'Normalized surface normal in world space after normal maps.'
  },
  {
    id: 'mat_world_position',
    title: 'WorldPosition',
    category: 'Vector Math',
    ueClassName: 'MaterialExpressionWorldPosition',
    color: '#2563EB',
    inputs: [],
    outputs: [{ name: 'Position', type: 'vector3' }],
    description: 'Position of current pixel / vertex in world space coordinates.'
  },

  // --- Color & Blending ---
  {
    id: 'mat_lerp',
    title: 'LinearInterpolate (Lerp)',
    category: 'Color & Blending',
    ueClassName: 'MaterialExpressionLinearInterpolate',
    color: '#D97706',
    inputs: [
      { name: 'A', type: 'vector3', defaultValue: 0 },
      { name: 'B', type: 'vector3', defaultValue: 1 },
      { name: 'Alpha', type: 'float', defaultValue: 0.5 }
    ],
    outputs: [{ name: 'Out', type: 'vector3' }],
    description: 'Interpolates between A and B based on Alpha weight (0.0 to 1.0).'
  },
  {
    id: 'mat_desaturation',
    title: 'Desaturation',
    category: 'Color & Blending',
    ueClassName: 'MaterialExpressionDesaturation',
    color: '#D97706',
    inputs: [
      { name: 'In', type: 'vector3' },
      { name: 'Fraction', type: 'float', defaultValue: 1.0 }
    ],
    outputs: [{ name: 'Out', type: 'vector3' }],
    description: 'Desaturates color toward greyscale by Fraction amount.'
  },
  {
    id: 'mat_component_mask',
    title: 'ComponentMask',
    category: 'Color & Blending',
    ueClassName: 'MaterialExpressionComponentMask',
    color: '#D97706',
    inputs: [{ name: 'In', type: 'vector4' }],
    outputs: [{ name: 'Out', type: 'vector3' }],
    description: 'Filters vector components (R, G, B, A isolation).',
    defaultProperties: { R: true, G: true, B: true, A: false }
  },

  // --- VFX & Dynamics ---
  {
    id: 'mat_fresnel',
    title: 'Fresnel',
    category: 'VFX & Utility',
    ueClassName: 'MaterialExpressionFresnel',
    color: '#EC4899',
    inputs: [
      { name: 'Exponent', type: 'float', defaultValue: 3.0 },
      { name: 'BaseReflectFraction', type: 'float', defaultValue: 0.04 },
      { name: 'Normal', type: 'vector3' }
    ],
    outputs: [{ name: 'Out', type: 'float' }],
    description: 'Falloff rim highlight based on surface angle to camera lens.',
    defaultProperties: { Exponent: 3.0, BaseReflectFraction: 0.04 }
  },
  {
    id: 'mat_depth_fade',
    title: 'DepthFade',
    category: 'VFX & Utility',
    ueClassName: 'MaterialExpressionDepthFade',
    color: '#EC4899',
    inputs: [
      { name: 'In', type: 'float' },
      { name: 'FadeDistance', type: 'float', defaultValue: 100.0 }
    ],
    outputs: [{ name: 'Out', type: 'float' }],
    description: 'Softens intersection seams between transparent mesh and scene geometry.'
  },
  {
    id: 'mat_wpo',
    title: 'WorldPositionOffset',
    category: 'VFX & Utility',
    ueClassName: 'MaterialExpressionWorldPositionOffset',
    color: '#EC4899',
    inputs: [{ name: 'Offset', type: 'vector3' }],
    outputs: [{ name: 'Out', type: 'vector3' }],
    description: 'Vertex displacement offset in world space for cloth, foliage, or waves.'
  },

  // --- Material Outputs Master Node ---
  {
    id: 'mat_root_master',
    title: 'Material Root',
    category: 'Material Outputs',
    ueClassName: 'MaterialGraphNode_Root',
    color: '#E11D48',
    inputs: [
      { name: 'BaseColor', type: 'vector3', defaultValue: [0.8, 0.8, 0.8] },
      { name: 'Metallic', type: 'float', defaultValue: 0.0 },
      { name: 'Specular', type: 'float', defaultValue: 0.5 },
      { name: 'Roughness', type: 'float', defaultValue: 0.4 },
      { name: 'EmissiveColor', type: 'vector3', defaultValue: [0.0, 0.0, 0.0] },
      { name: 'Opacity', type: 'float', defaultValue: 1.0 },
      { name: 'Normal', type: 'vector3', defaultValue: [0.0, 0.0, 1.0] },
      { name: 'WorldPositionOffset', type: 'vector3', defaultValue: [0.0, 0.0, 0.0] }
    ],
    outputs: [{ name: 'Material', type: 'materialattributes' }],
    description: 'Epic UE5 Master Material Result Pin Gateway.'
  }
];

export const SHADER_PRESETS: ShaderPreset[] = [
  {
    id: 'preset_gold',
    name: 'PBR Brushed Gold',
    description: 'High metallic, warm specular reflections with subtle micro-roughness.',
    properties: {
      baseColor: [1.0, 0.766, 0.336],
      metallic: 1.0,
      roughness: 0.18,
      specular: 0.8,
      emissiveColor: [0.0, 0.0, 0.0]
    },
    previewColor: '#FFD700'
  },
  {
    id: 'preset_chrome',
    name: 'Mirror Chrome',
    description: 'Perfect mirror reflection with near-zero roughness.',
    properties: {
      baseColor: [0.95, 0.95, 0.95],
      metallic: 1.0,
      roughness: 0.05,
      specular: 1.0,
      emissiveColor: [0.0, 0.0, 0.0]
    },
    previewColor: '#E2E8F0'
  },
  {
    id: 'preset_glass',
    name: 'Frosted Glass',
    description: 'Translucent refractive surface with subtle surface roughness.',
    properties: {
      baseColor: [0.9, 0.95, 1.0],
      metallic: 0.0,
      roughness: 0.12,
      specular: 0.6,
      opacity: 0.4,
      emissiveColor: [0.0, 0.0, 0.0]
    },
    previewColor: '#93C5FD'
  },
  {
    id: 'preset_plasma',
    name: 'Emissive Plasma Rim',
    description: 'Dark carbon base with intense pulsing electric blue rim fresnel.',
    properties: {
      baseColor: [0.05, 0.05, 0.08],
      metallic: 0.8,
      roughness: 0.25,
      specular: 0.5,
      emissiveColor: [0.1, 0.8, 1.0]
    },
    previewColor: '#06B6D4'
  },
  {
    id: 'preset_rust',
    name: 'Weathered Iron',
    description: 'Non-metallic matte finish with high roughness and earthy tones.',
    properties: {
      baseColor: [0.45, 0.25, 0.18],
      metallic: 0.1,
      roughness: 0.85,
      specular: 0.2,
      emissiveColor: [0.0, 0.0, 0.0]
    },
    previewColor: '#B45309'
  },
  {
    id: 'preset_obsidian',
    name: 'Polished Obsidian',
    description: 'Ultra dark glossy volcanic glass with crisp specular highlights.',
    properties: {
      baseColor: [0.02, 0.02, 0.03],
      metallic: 0.0,
      roughness: 0.08,
      specular: 0.9,
      emissiveColor: [0.0, 0.0, 0.0]
    },
    previewColor: '#18181B'
  }
];
