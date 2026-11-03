import { PinType } from '../types/BlueprintTypes';

export interface StandardUENodePreset {
  id: string;
  category: 'Events' | 'Locomotion' | 'Flow' | 'World' | 'Math';
  title: string;
  subtitle: string;
  nodeType: 'event' | 'function' | 'macro' | 'variable';
  color: string;
  inputs: { name: string; type: PinType; value?: any }[];
  outputs: { name: string; type: PinType }[];
}

export const STANDARD_UE_NODES: StandardUENodePreset[] = [
  // Events
  {
    id: 'event-beginplay',
    category: 'Events',
    title: 'Event BeginPlay',
    subtitle: 'Actor Lifecycle',
    nodeType: 'event',
    color: '#991B1B',
    inputs: [],
    outputs: [{ name: 'Then', type: 'exec' }],
  },
  {
    id: 'event-tick',
    category: 'Events',
    title: 'Event Tick',
    subtitle: 'Frame Update',
    nodeType: 'event',
    color: '#991B1B',
    inputs: [],
    outputs: [
      { name: 'Then', type: 'exec' },
      { name: 'Delta Seconds', type: 'float' },
    ],
  },
  {
    id: 'event-anydamage',
    category: 'Events',
    title: 'Event AnyDamage',
    subtitle: 'Damage Pipeline',
    nodeType: 'event',
    color: '#991B1B',
    inputs: [],
    outputs: [
      { name: 'Then', type: 'exec' },
      { name: 'Damage', type: 'float' },
    ],
  },
  {
    id: 'action-jump',
    category: 'Events',
    title: 'InputAction IA_Jump',
    subtitle: 'Enhanced Input',
    nodeType: 'event',
    color: '#991B1B',
    inputs: [],
    outputs: [
      { name: 'Started', type: 'exec' },
      { name: 'Completed', type: 'exec' },
    ],
  },
  {
    id: 'action-sprint',
    category: 'Events',
    title: 'InputAction IA_Sprint',
    subtitle: 'Enhanced Input',
    nodeType: 'event',
    color: '#991B1B',
    inputs: [],
    outputs: [
      { name: 'Started', type: 'exec' },
      { name: 'Completed', type: 'exec' },
    ],
  },

  // Locomotion
  {
    id: 'get-char-movement',
    category: 'Locomotion',
    title: 'Get Character Movement',
    subtitle: 'Component Getter',
    nodeType: 'function',
    color: '#15803D',
    inputs: [{ name: 'Target', type: 'object' }],
    outputs: [{ name: 'Return Value', type: 'object' }],
  },
  {
    id: 'set-max-walk-speed',
    category: 'Locomotion',
    title: 'Set Max Walk Speed',
    subtitle: 'Movement Component',
    nodeType: 'function',
    color: '#18181B',
    inputs: [
      { name: 'Execute', type: 'exec' },
      { name: 'Target', type: 'object' },
      { name: 'Max Walk Speed', type: 'float', value: 600.0 },
    ],
    outputs: [{ name: 'Then', type: 'exec' }],
  },
  {
    id: 'launch-character',
    category: 'Locomotion',
    title: 'Launch Character',
    subtitle: 'Physics Impulse',
    nodeType: 'function',
    color: '#18181B',
    inputs: [
      { name: 'Execute', type: 'exec' },
      { name: 'Target', type: 'object' },
      { name: 'Launch Velocity', type: 'vector' },
      { name: 'XYOverride', type: 'bool', value: false },
      { name: 'ZOverride', type: 'bool', value: true },
    ],
    outputs: [{ name: 'Then', type: 'exec' }],
  },

  // Flow Control
  {
    id: 'flow-branch',
    category: 'Flow',
    title: 'Branch',
    subtitle: 'Conditional (If/Else)',
    nodeType: 'macro',
    color: '#B45309',
    inputs: [
      { name: 'Execute', type: 'exec' },
      { name: 'Condition', type: 'bool' },
    ],
    outputs: [
      { name: 'True', type: 'exec' },
      { name: 'False', type: 'exec' },
    ],
  },
  {
    id: 'flow-sequence',
    category: 'Flow',
    title: 'Sequence',
    subtitle: 'Sequential Execution',
    nodeType: 'macro',
    color: '#B45309',
    inputs: [{ name: 'Execute', type: 'exec' }],
    outputs: [
      { name: 'Then 0', type: 'exec' },
      { name: 'Then 1', type: 'exec' },
    ],
  },
  {
    id: 'flow-delay',
    category: 'Flow',
    title: 'Delay',
    subtitle: 'Latent Timer',
    nodeType: 'function',
    color: '#B45309',
    inputs: [
      { name: 'Execute', type: 'exec' },
      { name: 'Duration', type: 'float', value: 1.0 },
    ],
    outputs: [{ name: 'Completed', type: 'exec' }],
  },
  {
    id: 'flow-reroute',
    category: 'Flow',
    title: 'Reroute',
    subtitle: 'Knot Pin',
    nodeType: 'macro',
    color: '#71717A',
    inputs: [{ name: 'In', type: 'exec' }],
    outputs: [{ name: 'Out', type: 'exec' }],
  },
  {
    id: 'action-move',
    category: 'Events',
    title: 'InputAction IA_Move',
    subtitle: 'Enhanced Input (Vector2D)',
    nodeType: 'event',
    color: '#991B1B',
    inputs: [],
    outputs: [
      { name: 'Triggered', type: 'exec' },
      { name: 'Ongoing', type: 'exec' },
      { name: 'Completed', type: 'exec' },
      { name: 'Action Value', type: 'vector2d' },
    ],
  },

  // World & Utilities
  {
    id: 'print-string',
    category: 'World',
    title: 'Print String',
    subtitle: 'Debug Message',
    nodeType: 'function',
    color: '#18181B',
    inputs: [
      { name: 'Execute', type: 'exec' },
      { name: 'In String', type: 'string', value: 'Hello Unreal' },
      { name: 'Print to Screen', type: 'bool', value: true },
    ],
    outputs: [{ name: 'Then', type: 'exec' }],
  },
  {
    id: 'play-sound-2d',
    category: 'World',
    title: 'Play Sound 2D',
    subtitle: 'Audio System',
    nodeType: 'function',
    color: '#18181B',
    inputs: [
      { name: 'Execute', type: 'exec' },
      { name: 'Sound', type: 'object' },
    ],
    outputs: [{ name: 'Then', type: 'exec' }],
  },
  {
    id: 'line-trace',
    category: 'World',
    title: 'Line Trace by Channel',
    subtitle: 'Collision Query',
    nodeType: 'function',
    color: '#18181B',
    inputs: [
      { name: 'Execute', type: 'exec' },
      { name: 'Start', type: 'vector' },
      { name: 'End', type: 'vector' },
    ],
    outputs: [
      { name: 'Then', type: 'exec' },
      { name: 'Return Value', type: 'bool' },
    ],
  },

  // Math
  {
    id: 'make-vector',
    category: 'Math',
    title: 'Make Vector',
    subtitle: 'Struct Builder',
    nodeType: 'function',
    color: '#15803D',
    inputs: [
      { name: 'X', type: 'float', value: 0.0 },
      { name: 'Y', type: 'float', value: 0.0 },
      { name: 'Z', type: 'float', value: 0.0 },
    ],
    outputs: [{ name: 'Return Value', type: 'vector' }],
  },
  {
    id: 'subtract-float',
    category: 'Math',
    title: 'Subtract Float',
    subtitle: 'Float Math',
    nodeType: 'function',
    color: '#15803D',
    inputs: [
      { name: 'A', type: 'float' },
      { name: 'B', type: 'float' },
    ],
    outputs: [{ name: 'Return Value', type: 'float' }],
  },
  {
    id: 'less-equal-float',
    category: 'Math',
    title: 'Less Equal Float',
    subtitle: 'Comparison',
    nodeType: 'function',
    color: '#15803D',
    inputs: [
      { name: 'A', type: 'float' },
      { name: 'B', type: 'float', value: 0.0 },
    ],
    outputs: [{ name: 'Return Value', type: 'bool' }],
  },
];
