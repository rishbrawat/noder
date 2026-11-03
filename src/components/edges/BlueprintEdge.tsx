import { memo } from 'react';
import { EdgeProps, getBezierPath, Position } from 'reactflow';

interface BlueprintEdgeData {
  label?: string;
  pinType?: string;
}

const PIN_EDGE_COLORS: Record<string, string> = {
  exec: '#FFFFFF', // Pure white for execution wires
  bool: '#DC2626', // Unreal Red
  int: '#16A34A', // Emerald Green
  float: '#22C55E', // Green
  byte: '#15803D', // Deep Green
  string: '#F4F4F5', // White / Silver
  vector: '#EAB308', // Gold
  rotator: '#CA8A04', // Gold
  transform: '#D97706', // Gold / Amber
  object: '#E4E4E7', // Silver / White
  class: '#F59E0B', // Gold
  default: '#A1A1AA', // Slate / Graphite
};

const BlueprintEdge = memo<EdgeProps<BlueprintEdgeData>>(({ 
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  style = {},
  markerEnd,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const pinType = data?.pinType || 'default';
  const strokeColor = PIN_EDGE_COLORS[pinType] || PIN_EDGE_COLORS.default;

  const edgeStyle = {
    ...style,
    strokeWidth: pinType === 'exec' ? 2.5 : 2,
    stroke: strokeColor,
  };

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
      />
      {data?.label && (
        <foreignObject
          width={100}
          height={32}
          x={labelX - 50}
          y={labelY - 16}
          className="react-flow__edge-textwrapper"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div className="bg-zinc-800/90 text-white text-[10px] px-2 py-0.5 rounded border border-zinc-700 text-center truncate">
            {data.label}
          </div>
        </foreignObject>
      )}
    </>
  );
});

BlueprintEdge.displayName = 'BlueprintEdge';
export default BlueprintEdge;
