import React from 'react';
import { Background, BackgroundVariant, useViewport } from 'reactflow';

export interface UnrealEngineGridProps {
  theme: string;
}

/**
 * Dynamic Level-of-Detail (LOD) Unreal Engine 5 Grid:
 * - Minor Subdivision Grid (24px): hides smoothly at extreme zoom-out (< 0.35) to prevent moiré noise.
 * - Major Coordinate Grid (120px: 5x5 subdivision): always visible across infinite zoom range.
 */
export const UnrealEngineGrid: React.FC<UnrealEngineGridProps> = React.memo(({ theme }) => {
  const { zoom } = useViewport();
  const isDark = theme === 'dark';

  return (
    <>
      {zoom >= 0.35 && (
        <Background
          id="ue5-grid-minor"
          variant={BackgroundVariant.Lines}
          gap={24}
          lineWidth={0.65}
          color={isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.035)'}
        />
      )}
      <Background
        id="ue5-grid-major"
        variant={BackgroundVariant.Lines}
        gap={120}
        lineWidth={1.2}
        color={isDark ? 'rgba(255, 255, 255, 0.085)' : 'rgba(0, 0, 0, 0.12)'}
      />
    </>
  );
});

UnrealEngineGrid.displayName = 'UnrealEngineGrid';
export default UnrealEngineGrid;
