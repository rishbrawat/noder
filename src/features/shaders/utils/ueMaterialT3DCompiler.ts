import { Node, Edge } from 'reactflow';
import { NodeData } from '../../../types/BlueprintTypes';
import { MATERIAL_EXPRESSIONS } from '../data/materialNodesCatalog';

export interface MaterialT3DCompileResult {
  t3dText: string;
  nodeCount: number;
  connectionCount: number;
  warnings: string[];
}

/**
 * Compiles a visual Material Graph into Unreal Engine 5's native MaterialExpression T3D format.
 * This can be copied directly to clipboard and pasted into UE5 Material Editor.
 */
export function compileMaterialToT3D(nodes: Node<NodeData>[], edges: Edge[]): MaterialT3DCompileResult {
  const warnings: string[] = [];
  const lines: string[] = [];

  const nodeMap = new Map<string, { node: Node<NodeData>; index: number; ueClass: string; exprName: string }>();

  nodes.forEach((node, idx) => {
    const title = (node.data.title || '').trim().toLowerCase();
    const catalogEntry = MATERIAL_EXPRESSIONS.find(
      (m) =>
        m.title.toLowerCase() === title ||
        m.id === node.id ||
        m.ueClassName.toLowerCase() === title ||
        title.startsWith(m.title.toLowerCase())
    );
    const ueClass = catalogEntry?.ueClassName || 'MaterialExpressionConstant';
    const exprName = `${ueClass}_${idx}`;
    nodeMap.set(node.id, { node, index: idx, ueClass, exprName });
  });

  // Find incoming edges for each node pin
  const findSourceConnection = (targetNodeId: string, pinName: string, pinType: string) => {
    const handlePattern = `${pinType}-${pinName.toLowerCase().replace(/\s+/g, '')}`;
    const cleanPin = pinName.toLowerCase().replace(/\s+/g, '');

    const edge = edges.find((e) => {
      if (e.target !== targetNodeId) return false;
      const th = (e.targetHandle || '').toLowerCase().replace(/\s+/g, '');
      return (
        th === handlePattern ||
        th === cleanPin ||
        th.includes(cleanPin) ||
        th.endsWith(`-${cleanPin}`)
      );
    });

    if (edge) {
      return nodeMap.get(edge.source);
    }
    return undefined;
  };

  // Root or individual expressions
  const rootNode = nodes.find((n) => n.data.title === 'Material Root' || n.id.includes('root'));

  nodes.forEach((node) => {
    const info = nodeMap.get(node.id);
    if (!info) return;

    if (info.ueClass === 'MaterialGraphNode_Root') {
      // Handled as the material outputs or root graph node
      return;
    }

    const posX = Math.round(node.position.x || 0);
    const posY = Math.round(node.position.y || 0);

    lines.push(`Begin Object Class=/Script/Engine.MaterialGraphNode Name="MaterialGraphNode_${info.index}"`);
    lines.push(`   Begin Object Class=/Script/Engine.${info.ueClass} Name="${info.exprName}"`);
    lines.push(`   End Object`);
    lines.push(`   MaterialExpression=${info.ueClass}'"${info.exprName}"'`);
    lines.push(`   NodePosX=${posX}`);
    lines.push(`   NodePosY=${posY}`);
    lines.push(`   NodeGuid=${info.node.id.replace(/[^a-zA-Z0-9]/g, '').padEnd(32, '0').slice(0, 32).toUpperCase()}`);
    lines.push(`End Object`);

    // Expression definition with wired inputs
    lines.push(`Begin Object Class=/Script/Engine.${info.ueClass} Name="${info.exprName}"`);

    const catalogEntry = MATERIAL_EXPRESSIONS.find((m) => m.ueClassName === info.ueClass);
    const nodeDefaultProps = (node.data as Record<string, any>).defaultProperties;
    const mergedProps = {
      ...(catalogEntry?.defaultProperties || {}),
      ...(nodeDefaultProps || {}),
    };

    // Constant override check from outputs defaultValue
    if (info.ueClass === 'MaterialExpressionConstant') {
      const pin = node.data.outputs?.find((o) => o.name === 'Out' || o.name === 'Param');
      if (typeof pin?.defaultValue === 'number') {
        mergedProps.R = pin.defaultValue;
      }
    } else if (info.ueClass === 'MaterialExpressionConstant2Vector') {
      const pin = node.data.outputs?.[0];
      if (Array.isArray(pin?.defaultValue) && pin.defaultValue.length >= 2) {
        mergedProps.R = pin.defaultValue[0];
        mergedProps.G = pin.defaultValue[1];
      }
    }

    if (Object.keys(mergedProps).length > 0) {
      for (const [propKey, propVal] of Object.entries(mergedProps)) {
        if (typeof propVal === 'object' && propVal !== null) {
          const sub = Object.entries(propVal).map(([k, v]) => `${k}=${v}`).join(',');
          lines.push(`   ${propKey}=(${sub})`);
        } else {
          lines.push(`   ${propKey}=${propVal}`);
        }
      }
    }

    // Connect input pins
    const inputPins = node.data.inputs || catalogEntry?.inputs || [];
    inputPins.forEach((pin) => {
      const srcInfo = findSourceConnection(node.id, pin.name, pin.type);
      if (srcInfo) {
        lines.push(`   ${pin.name}=(Expression=${srcInfo.ueClass}'"${srcInfo.exprName}"')`);
      }
    });

    lines.push(`   Material=Material'"/Game/Materials/M_CustomShader.M_CustomShader"'`);
    lines.push(`End Object`);
  });

  // If there is a root node, emit the master material assignments
  if (rootNode) {
    lines.push(`Begin Object Class=/Script/Engine.Material Name="M_CustomShader"`);
    const rootCatalog = MATERIAL_EXPRESSIONS.find((m) => m.ueClassName === 'MaterialGraphNode_Root');
    const rootInputs = rootNode.data.inputs && rootNode.data.inputs.length > 0
      ? rootNode.data.inputs
      : (rootCatalog?.inputs || []);

    rootInputs.forEach((pin) => {
      const srcInfo = findSourceConnection(rootNode.id, pin.name, pin.type);
      if (srcInfo) {
        lines.push(`   ${pin.name}=(Expression=${srcInfo.ueClass}'"${srcInfo.exprName}"')`);
      }
    });
    lines.push(`End Object`);
  }

  const t3dText = lines.join('\r\n');
  return {
    t3dText,
    nodeCount: nodes.length,
    connectionCount: edges.length,
    warnings
  };
}
