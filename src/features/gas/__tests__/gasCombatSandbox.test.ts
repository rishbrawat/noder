import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { GasCombatSandbox } from '../components/GasCombatSandbox';
import { AttributeSetInspector } from '../components/AttributeSetInspector';
import { PRESET_ABILITY_DODGE } from '../data/gasCatalog';

describe('GASStudio: GasCombatSandbox & AttributeSetInspector UI Components', () => {
  it('should render GasCombatSandbox with health, shield, stamina and dummy pawn', () => {
    const html = renderToString(
      React.createElement(GasCombatSandbox, {
        ability: PRESET_ABILITY_DODGE,
      })
    );

    expect(html).toContain('Live GAS Combat Sandbox');
    expect(html).toContain('120 FPS');
    expect(html).toContain('Target_Dummy_01');
    expect(html).toContain('UPlayerAttributeSet');
    expect(html).toContain('Health');
    expect(html).toContain('Shield');
    expect(html).toContain('Stamina');
    expect(html).toContain('GA_DodgeRoll');
    expect(html).toContain('Live ASC Execution Log');
  });

  it('should render AttributeSetInspector with editable attributes and live C++ code generation', () => {
    const html = renderToString(
      React.createElement(AttributeSetInspector, {
        onAttributesChange: vi.fn(),
      })
    );

    expect(html).toContain('AttributeSet Definition');
    expect(html).toContain('UPlayerAttributeSet');
    expect(html).toContain('Health');
    expect(html).toContain('Interactive Clamp Simulator');
  });
});
