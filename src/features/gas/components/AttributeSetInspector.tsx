import React, { useState } from 'react';
import { AttributeDefinition, StandardAttributeName } from '../types/gasTypes';
import { STANDARD_ATTRIBUTES } from '../data/gasCatalog';
import { generateAttributeSetCpp } from '../utils/gasCppGenerator';
import { clampAttributeValue } from '../utils/gasModifierEvaluator';
import { LuHeartPulse, LuCopy, LuCheck, LuSlidersHorizontal, LuCalculator } from 'react-icons/lu';

interface AttributeSetInspectorProps {
  attributes?: AttributeDefinition[];
  className?: string;
}

export const AttributeSetInspector: React.FC<AttributeSetInspectorProps> = ({
  attributes = STANDARD_ATTRIBUTES,
  className = '',
}) => {
  const [copiedType, setCopiedType] = useState<'h' | 'cpp' | null>(null);
  const [testAttr, setTestAttr] = useState<StandardAttributeName>(attributes[0]?.name || 'Health');
  const [testValue, setTestValue] = useState<number>(150);

  const selectedAttrDef = attributes.find((a) => a.name === testAttr) || attributes[0];
  const clampedOutput = clampAttributeValue(testAttr, testValue, attributes);

  const handleCopyCpp = (type: 'h' | 'cpp') => {
    const res = generateAttributeSetCpp('UBaseAttributeSet', attributes);
    const textToCopy = type === 'h' ? res.headerFile : res.sourceFile;
    navigator.clipboard.writeText(textToCopy);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className={`flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs space-y-3 shadow-xl select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <LuHeartPulse className="w-4 h-4 text-red-400" />
          <span className="font-semibold text-zinc-100">AttributeSet Definition & Clamping</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => handleCopyCpp('h')}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-mono text-[11px] transition-colors"
            title="Copy UE5 AttributeSet C++ Header (.h)"
          >
            {copiedType === 'h' ? <LuCheck className="w-3 h-3 text-green-400" /> : <LuCopy className="w-3 h-3" />}
            <span>Copy .h</span>
          </button>
          <button
            onClick={() => handleCopyCpp('cpp')}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-mono text-[11px] transition-colors"
            title="Copy UE5 AttributeSet C++ Source (.cpp)"
          >
            {copiedType === 'cpp' ? <LuCheck className="w-3 h-3 text-green-400" /> : <LuCopy className="w-3 h-3" />}
            <span>Copy .cpp</span>
          </button>
        </div>
      </div>

      {/* Attributes Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[11px]">
          <thead>
            <tr className="text-zinc-400 border-b border-zinc-800">
              <th className="pb-1.5 font-normal">Attribute</th>
              <th className="pb-1.5 font-normal">Default</th>
              <th className="pb-1.5 font-normal">Min Clamp</th>
              <th className="pb-1.5 font-normal">Max Clamp</th>
              <th className="pb-1.5 font-normal">Category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {attributes.map((attr) => (
              <tr key={attr.name} className="hover:bg-zinc-800/40 transition-colors">
                <td className="py-1.5 font-semibold text-cyan-300">{attr.name}</td>
                <td className="py-1.5">{attr.defaultValue}</td>
                <td className="py-1.5 text-yellow-400">{attr.minValue}</td>
                <td className="py-1.5 text-yellow-400">{attr.maxValue}</td>
                <td className="py-1.5 text-zinc-400">{attr.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interactive Clamp Math Simulator */}
      <div className="flex flex-col bg-zinc-950/60 p-2 rounded border border-zinc-800/80 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-300 font-medium">
          <div className="flex items-center space-x-1.5">
            <LuCalculator className="w-3.5 h-3.5 text-gold-400" />
            <span>Interactive Clamp Simulator:</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">PreAttributeChange & PostGameplayEffectExecute</span>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <select
            value={testAttr}
            onChange={(e) => setTestAttr(e.target.value as StandardAttributeName)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-1.5 py-0.5 text-xs outline-none"
          >
            {attributes.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>

          <span className="text-zinc-500 text-[11px]">Incoming:</span>
          <input
            type="number"
            value={testValue}
            onChange={(e) => setTestValue(Number(e.target.value))}
            className="w-20 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-1.5 py-0.5 font-mono text-xs outline-none"
          />

          <span className="text-zinc-500 text-[11px]">→ Clamped:</span>
          <span className={`px-2 py-0.5 rounded font-mono font-bold ${
            clampedOutput !== testValue ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'bg-green-500/20 text-green-300 border border-green-500/40'
          }`}>
            {clampedOutput}
          </span>

          {selectedAttrDef && (
            <span className="text-[10px] text-zinc-500 ml-auto">
              [{selectedAttrDef.minValue}, {selectedAttrDef.maxValue}]
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-1.5 p-2 bg-zinc-950/60 rounded border border-zinc-800/80 text-[10px] text-zinc-400 font-mono">
        <LuSlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>Enforces FMath::Clamp in PreAttributeChange & PostGameplayEffectExecute automatically.</span>
      </div>
    </div>
  );
};
