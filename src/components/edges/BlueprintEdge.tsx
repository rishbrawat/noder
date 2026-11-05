import React, { memo, useMemo, useCallback } from 'react';
import { EdgeProps, getBezierPath, Position } from 'reactflow';
import { useTheme } from '../../contexts/ThemeContext';
import { useBlueprintStore } from '../../store/blueprintStore';
import { toast } from 'react-hot-toast';

interface BlueprintEdgeData {
  label?: string;
  pinType?: string;
  isSimulating?: boolean;
}

// Dark theme: white exec wires, vibrant luminous data wires
const DARK_PIN_EDGE_COLORS: Record<string, string> = {
  exec: '#FFFFFF', // Pure white
  bool: '#EF4444', // Unreal Red
  int: '#22C55E', // Green
  float: '#22C55E', // Green
  byte: '#16A34A', // Forest Green
  string: '#E4E4E7', // Silver
  name: '#E4E4E7',
  vector: '#EAB308', // Gold
  rotator: '#CA8A04', // Amber
  transform: '#F59E0B', // Orange Gold
  object: '#38BDF8', // Unreal Sky Blue
  class: '#F59E0B', // Gold
  default: '#A1A1AA', // Slate
};

// Light theme: crisp solid black exec wires (never invisible white!), high-contrast data wires
const LIGHT_PIN_EDGE_COLORS: Record<string, string> = {
  exec: '#09090B', // Solid Charcoal / Black for 100% crisp visibility
  bool: '#DC2626', // Deep Red
  int: '#15803D', // Deep Emerald
  float: '#15803D', // Deep Emerald
  byte: '#166534',
  string: '#3F3F46', // Dark Graphite
  name: '#3F3F46',
  vector: '#B45309', // Deep Amber / Gold
  rotator: '#B45309',
  transform: '#C2410C', // Deep Orange
  object: '#0284C7', // Deep Cyan Blue
  class: '#B45309',
  default: '#52525B', // Deep Slate
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
  const { theme } = useTheme();
  const removeEdge = useBlueprintStore(state => state.removeEdge);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const pinType = data?.pinType || 'default';
  const colorPalette = theme === 'dark' ? DARK_PIN_EDGE_COLORS : LIGHT_PIN_EDGE_COLORS;
  const strokeColor = colorPalette[pinType] || colorPalette.default;
  const isSimulating = Boolean(data?.isSimulating);

  const edgeStyle = useMemo(() => ({
    ...style,
    strokeWidth: pinType === 'exec' ? 2.5 : 2,
    stroke: strokeColor,
    strokeDasharray: undefined, // Always solid bezier curves in authentic UE5
  }), [style, pinType, strokeColor]);

  // Alt + Click to sever wire (Unreal Engine muscle memory)
  const handleEdgeClick = useCallback((e: React.MouseEvent) => {
    if (e.altKey) {
      e.stopPropagation();
      e.preventDefault();
      removeEdge(id);
      toast('Wire cut', { icon: '✂️' });
    }
  }, [id, removeEdge]);

  return (
    <>
      {/* Visual Render Path - zero transition delay on 'd' for instant 60fps tracking without lag */}
      <path
        id={id}
        className="react-flow__edge-path pointer-events-none"
        d={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
        vectorEffect="non-scaling-stroke"
      />

      {/* Unreal Engine 5 PIE Execution Simulation Pulse Glow */}
      {isSimulating && (
        <>
          {/* Luminous aura glow bloom */}
          <path
            d={edgePath}
            fill="none"
            stroke={pinType === 'exec' ? '#EAB308' : strokeColor}
            strokeWidth={pinType === 'exec' ? 8 : 7}
            strokeOpacity={0.7}
            style={{ filter: 'blur(3px)' }}
            className="pointer-events-none"
            vectorEffect="non-scaling-stroke"
          />
          {/* Intense core conduit */}
          <path
            d={edgePath}
            fill="none"
            stroke={theme === 'dark' ? '#FFFFFF' : '#FEF08A'}
            strokeWidth={pinType === 'exec' ? 4 : 3.5}
            strokeOpacity={0.9}
            className="pointer-events-none"
            vectorEffect="non-scaling-stroke"
          />
          {/* High-speed animated electricity spark along bezier curve */}
          <path
            d={edgePath}
            fill="none"
            stroke={pinType === 'exec' ? '#FACC15' : '#FFFFFF'}
            strokeWidth={pinType === 'exec' ? 5 : 4}
            strokeDasharray="14 26"
            strokeLinecap="round"
            className="pointer-events-none animate-wire-pulse"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}

      {/* Invisible interaction path with 24px stroke width for effortless clicking, Alt+Click cut, and double-clicking */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={24}
        onClick={handleEdgeClick}
        className="react-flow__edge-interaction cursor-pointer pointer-events-auto"
      >
        <title>Click to select | Alt+Click to sever wire | Double-click to insert Reroute point</title>
      </path>
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
