import React, { useState } from 'react';
import { AttributeDefinition, StandardAttributeName } from '../types/gasTypes';
import { STANDARD_ATTRIBUTES } from '../data/gasCatalog';
import { generateAttributeSetCpp } from '../utils/gasCppGenerator';
import { clampAttributeValue } from '../utils/gasModifierEvaluator';
import { 
  LuHeartPulse, 
  LuCopy, 
  LuCheck, 
  LuSlidersHorizontal, 
  LuCalculator, 
  LuPlus, 
  LuTrash2, 
  LuCode 
} from 'react-icons/lu';
import { toast } from 'react-hot-toast';

interface AttributeSetInspectorProps {
  attributes?: AttributeDefinition[];
  className?: string;
  onAttributesChange?: (attrs: AttributeDefinition[]) => void;
}

export const AttributeSetInspector: React.FC<AttributeSetInspectorProps> = ({
  attributes: initialAttributes = STANDARD_ATTRIBUTES,
  className = '',
  onAttributesChange,
}) => {
  const [attributes, setAttributes] = useState<AttributeDefinition[]>(initialAttributes);
  const [cppClassName, setCppClassName] = useState<string>('UPlayerAttributeSet');
  const [copiedType, setCopiedType] = useState<'h' | 'cpp' | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // New Attribute Form State
  const [newAttrName, setNewAttrName] = useState<string>('');
  const [newAttrDefault, setNewAttrDefault] = useState<number>(100);
  const [newAttrMin, setNewAttrMin] = useState<number>(0);
  const [newAttrMax, setNewAttrMax] = useState<number>(100);
  const [newAttrCategory, setNewAttrCategory] = useState<string>('Vitals');

  // Clamp Simulator State
  const [testAttr, setTestAttr] = useState<StandardAttributeName>(attributes[0]?.name || 'Health');
  const [testValue, setTestValue] = useState<number>(150);

  const selectedAttrDef = attributes.find((a) => a.name === testAttr) || attributes[0];
  const clampedOutput = clampAttributeValue(testAttr, testValue, attributes);

  const updateAttributesList = (updated: AttributeDefinition[]) => {
    setAttributes(updated);
    if (onAttributesChange) {
      onAttributesChange(updated);
    }
  };

  const handleCopyCpp = (type: 'h' | 'cpp') => {
    const res = generateAttributeSetCpp(cppClassName.trim() || 'UBaseAttributeSet', attributes);
    const textToCopy = type === 'h' ? res.headerFile : res.sourceFile;
    navigator.clipboard.writeText(textToCopy);
    setCopiedType(type);
    toast.success(`Copied ${cppClassName} ${type === 'h' ? '.h Header' : '.cpp Source'}`);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCellChange = (name: string, field: 'defaultValue' | 'minValue' | 'maxValue', val: number) => {
    const updated = attributes.map((attr) => {
      if (attr.name === name) {
        return { ...attr, [field]: val };
      }
      return attr;
    });
    updateAttributesList(updated);
  };

  const handleDeleteAttribute = (name: string) => {
    if (attributes.length <= 1) {
      toast.error('AttributeSet must retain at least one attribute.');
      return;
    }
    const updated = attributes.filter((a) => a.name !== name);
    updateAttributesList(updated);
    if (testAttr === name && updated[0]) {
      setTestAttr(updated[0].name);
    }
    toast.success(`Removed attribute "${name}"`);
  };

  const handleCreateAttribute = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newAttrName.trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (!cleanName) {
      toast.error('Please enter a valid attribute name (alphanumeric).');
      return;
    }
    if (attributes.some((a) => a.name.toLowerCase() === cleanName.toLowerCase())) {
      toast.error(`Attribute "${cleanName}" already exists in set.`);
      return;
    }

    const newAttr: AttributeDefinition = {
      name: cleanName as StandardAttributeName,
      defaultValue: newAttrDefault,
      minValue: newAttrMin,
      maxValue: newAttrMax,
      isReplicated: true,
      category: newAttrCategory.trim() || 'Custom',
      description: `User-defined attribute ${cleanName}.`,
    };

    const updated = [...attributes, newAttr];
    updateAttributesList(updated);
    setIsAddingNew(false);
    setNewAttrName('');
    toast.success(`Added attribute "${cleanName}" to ${cppClassName}`);
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
            className="flex items-center space-x-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-mono text-[11px] transition-colors cursor-pointer"
            title={`Copy ${cppClassName} C++ Header (.h)`}
          >
            {copiedType === 'h' ? <LuCheck className="w-3 h-3 text-green-400" /> : <LuCopy className="w-3 h-3" />}
            <span>Copy .h</span>
          </button>
          <button
            onClick={() => handleCopyCpp('cpp')}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-mono text-[11px] transition-colors cursor-pointer"
            title={`Copy ${cppClassName} C++ Source (.cpp)`}
          >
            {copiedType === 'cpp' ? <LuCheck className="w-3 h-3 text-green-400" /> : <LuCopy className="w-3 h-3" />}
            <span>Copy .cpp</span>
          </button>
        </div>
      </div>

      {/* C++ Class Name Binding */}
      <div className="flex items-center justify-between p-2 bg-zinc-950/70 rounded border border-zinc-800">
        <div className="flex items-center space-x-2 text-[11px] text-zinc-300">
          <LuCode className="w-3.5 h-3.5 text-gold-400" />
          <span>UE5 C++ Class Name:</span>
        </div>
        <input
          type="text"
          value={cppClassName}
          onChange={(e) => setCppClassName(e.target.value)}
          placeholder="UPlayerAttributeSet"
          className="bg-zinc-800 border border-zinc-700 text-cyan-300 font-mono px-2 py-0.5 rounded text-xs focus:outline-none focus:border-gold-500 w-44"
        />
      </div>

      {/* Attributes Table with Interactive Editing */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[11px]">
          <thead>
            <tr className="text-zinc-400 border-b border-zinc-800">
              <th className="pb-1.5 font-normal">Attribute</th>
              <th className="pb-1.5 font-normal">Default</th>
              <th className="pb-1.5 font-normal">Min</th>
              <th className="pb-1.5 font-normal">Max</th>
              <th className="pb-1.5 font-normal">Category</th>
              <th className="pb-1.5 font-normal text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {attributes.map((attr) => (
              <tr key={attr.name} className="hover:bg-zinc-800/40 transition-colors">
                <td className="py-1.5 font-semibold text-cyan-300">{attr.name}</td>
                <td className="py-1.5">
                  <input
                    type="number"
                    value={attr.defaultValue}
                    onChange={(e) => handleCellChange(attr.name, 'defaultValue', Number(e.target.value))}
                    className="w-16 bg-zinc-950/80 border border-zinc-800 text-zinc-200 px-1 py-0.5 rounded text-[11px] focus:outline-none focus:border-cyan-500"
                  />
                </td>
                <td className="py-1.5">
                  <input
                    type="number"
                    value={attr.minValue}
                    onChange={(e) => handleCellChange(attr.name, 'minValue', Number(e.target.value))}
                    className="w-14 bg-zinc-950/80 border border-zinc-800 text-yellow-400 px-1 py-0.5 rounded text-[11px] focus:outline-none focus:border-yellow-500"
                  />
                </td>
                <td className="py-1.5">
                  <input
                    type="number"
                    value={attr.maxValue}
                    onChange={(e) => handleCellChange(attr.name, 'maxValue', Number(e.target.value))}
                    className="w-14 bg-zinc-950/80 border border-zinc-800 text-yellow-400 px-1 py-0.5 rounded text-[11px] focus:outline-none focus:border-yellow-500"
                  />
                </td>
                <td className="py-1.5 text-zinc-400">{attr.category}</td>
                <td className="py-1.5 text-right">
                  <button
                    onClick={() => handleDeleteAttribute(attr.name)}
                    className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                    title={`Delete attribute ${attr.name}`}
                  >
                    <LuTrash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add New Attribute Inline Toggle */}
      {!isAddingNew ? (
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center justify-center space-x-1.5 w-full py-1.5 rounded bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-zinc-100 text-xs font-medium transition-colors cursor-pointer"
        >
          <LuPlus className="w-3.5 h-3.5 text-gold-400" />
          <span>Add Custom Attribute</span>
        </button>
      ) : (
        <form onSubmit={handleCreateAttribute} className="p-2.5 bg-zinc-950 rounded border border-gold-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gold-400">
            <span>New Attribute Specification</span>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-zinc-500 hover:text-zinc-300 text-[10px]"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-0.5">Name</label>
              <input
                type="text"
                placeholder="e.g. Shield"
                value={newAttrName}
                onChange={(e) => setNewAttrName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 px-1.5 py-1 rounded text-zinc-100 font-mono text-xs focus:outline-none focus:border-gold-500"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-0.5">Category</label>
              <input
                type="text"
                placeholder="Defense"
                value={newAttrCategory}
                onChange={(e) => setNewAttrCategory(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 px-1.5 py-1 rounded text-zinc-100 font-mono text-xs focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-0.5">Default Value</label>
              <input
                type="number"
                value={newAttrDefault}
                onChange={(e) => setNewAttrDefault(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 px-1.5 py-1 rounded text-zinc-100 font-mono text-xs focus:outline-none focus:border-gold-500"
              />
            </div>
            <div className="flex space-x-1">
              <div className="flex-1">
                <label className="text-[10px] text-zinc-400 block mb-0.5">Min</label>
                <input
                  type="number"
                  value={newAttrMin}
                  onChange={(e) => setNewAttrMin(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 px-1.5 py-1 rounded text-zinc-100 font-mono text-xs focus:outline-none focus:border-gold-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-zinc-400 block mb-0.5">Max</label>
                <input
                  type="number"
                  value={newAttrMax}
                  onChange={(e) => setNewAttrMax(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 px-1.5 py-1 rounded text-zinc-100 font-mono text-xs focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-1.5 bg-gold-500 hover:bg-gold-600 text-zinc-950 font-bold rounded text-xs transition-colors cursor-pointer"
          >
            Create Attribute
          </button>
        </form>
      )}

      {/* Interactive Clamp Math Simulator */}
      <div className="flex flex-col bg-zinc-950/60 p-2 rounded border border-zinc-800/80 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-300 font-medium">
          <div className="flex items-center space-x-1.5">
            <LuCalculator className="w-3.5 h-3.5 text-gold-400" />
            <span>Interactive Clamp Simulator:</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">PreAttributeChange & PostExecute</span>
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
