import React, { useState } from 'react';
import { LuX, LuPlus, LuTrash2, LuLayers, LuFolder, LuNetwork } from 'react-icons/lu';
import { PinType, BlueprintVariable, BlueprintNode as IBlueprintNode } from '../types/BlueprintTypes';
import { useBlueprintStore } from '../store/blueprintStore';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';

interface MyBlueprintDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PIN_TYPE_OPTIONS: { label: string; value: PinType; color: string }[] = [
  { label: 'Boolean', value: 'bool', color: 'text-red-400' },
  { label: 'Float', value: 'float', color: 'text-green-400' },
  { label: 'Integer', value: 'int', color: 'text-teal-400' },
  { label: 'String', value: 'string', color: 'text-rose-400' },
  { label: 'Name', value: 'name', color: 'text-purple-400' },
  { label: 'Vector', value: 'vector', color: 'text-gold-400' },
  { label: 'Rotator', value: 'rotator', color: 'text-indigo-400' },
  { label: 'Transform', value: 'transform', color: 'text-amber-400' },
  { label: 'Object / Actor', value: 'object', color: 'text-blue-400' },
];

export const MyBlueprintDrawer: React.FC<MyBlueprintDrawerProps> = ({ isOpen, onClose }) => {
  const { nodes, setNodes, activeGraphType, switchGraph } = useBlueprintStore();

  const [variables, setVariables] = useState<BlueprintVariable[]>([
    {
      id: 'var-1',
      name: 'WalkSpeed',
      type: 'float',
      defaultValue: 600.0,
      category: 'Movement',
      isReplicated: false,
    },
    {
      id: 'var-2',
      name: 'SprintSpeed',
      type: 'float',
      defaultValue: 1000.0,
      category: 'Movement',
      isReplicated: false,
    },
    {
      id: 'var-3',
      name: 'bIsSprinting',
      type: 'bool',
      defaultValue: false,
      category: 'Movement',
      isReplicated: true,
    },
    {
      id: 'var-4',
      name: 'CurrentHealth',
      type: 'float',
      defaultValue: 100.0,
      category: 'Attributes',
      isReplicated: true,
    },
  ]);

  const [isAddingVar, setIsAddingVar] = useState(false);
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<PinType>('float');
  const [newVarCategory, setNewVarCategory] = useState('Default');
  const [newVarDefaultVal, setNewVarDefaultVal] = useState('0');
  const [newVarReplicated, setNewVarReplicated] = useState(false);

  if (!isOpen) return null;

  const handleAddVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVarName.trim()) {
      toast.error('Variable name cannot be empty');
      return;
    }

    const cleanName = newVarName.trim().replace(/\s+/g, '');
    const newVar: BlueprintVariable = {
      id: uuidv4(),
      name: cleanName,
      type: newVarType,
      category: newVarCategory.trim() || 'Default',
      defaultValue: newVarType === 'bool' ? false : newVarType === 'float' || newVarType === 'int' ? Number(newVarDefaultVal) || 0 : newVarDefaultVal,
      isReplicated: newVarReplicated,
    };

    setVariables([...variables, newVar]);
    setIsAddingVar(false);
    setNewVarName('');
    toast.success(`Created variable "${cleanName}"`);
  };

  const handleDeleteVariable = (id: string) => {
    setVariables(variables.filter(v => v.id !== id));
    toast.success('Variable removed');
  };

  // Spawn a "Get <Variable>" Pure Node
  const handleSpawnGetter = (variable: BlueprintVariable) => {
    const spawnX = Math.round(Math.random() * 150 + 250);
    const spawnY = Math.round(Math.random() * 150 + 200);

    const getterNode: IBlueprintNode = {
      id: uuidv4(),
      type: 'customNode',
      position: { x: spawnX, y: spawnY },
      data: {
        title: `Get ${variable.name}`,
        subtitle: 'Variable Get',
        nodeType: 'variable',
        color: '#15803D',
        inputs: [],
        outputs: [{ name: variable.name, type: variable.type }],
        description: `Reads ${variable.name} (${variable.type}) from actor state.`,
      },
    };

    setNodes([...nodes, getterNode]);
    toast.success(`Spawned "Get ${variable.name}" on canvas`);
  };

  // Spawn a "Set <Variable>" Function Node
  const handleSpawnSetter = (variable: BlueprintVariable) => {
    const spawnX = Math.round(Math.random() * 150 + 350);
    const spawnY = Math.round(Math.random() * 150 + 200);

    const setterNode: IBlueprintNode = {
      id: uuidv4(),
      type: 'customNode',
      position: { x: spawnX, y: spawnY },
      data: {
        title: `Set ${variable.name}`,
        subtitle: 'Variable Set',
        nodeType: 'variable',
        color: '#18181B',
        inputs: [
          { name: 'Execute', type: 'exec' },
          { name: variable.name, type: variable.type, value: variable.defaultValue },
        ],
        outputs: [
          { name: 'Then', type: 'exec' },
          { name: variable.name, type: variable.type },
        ],
        description: `Writes new value to ${variable.name}.`,
      },
    };

    setNodes([...nodes, setterNode]);
    toast.success(`Spawned "Set ${variable.name}" on canvas`);
  };

  // Group variables by category
  const categories = Array.from(new Set(variables.map(v => v.category || 'Default')));

  return (
    <div className="fixed inset-y-0 left-0 w-80 bg-noder-dark border-r border-zinc-800 shadow-2xl z-40 flex flex-col font-sans text-white animate-fade-in select-none">
      {/* Header */}
      <div className="p-3.5 bg-noder-panel border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-gold-400">
            <LuLayers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-100">
              My Blueprint
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">Actor Variables & Graphs</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <LuX className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Graphs Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono px-1">
            <span>Graphs</span>
          </div>

          <div className="space-y-1 text-xs">
            <button
              onClick={() => switchGraph('EventGraph')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors ${
                activeGraphType === 'EventGraph'
                  ? 'bg-gold-500/10 text-gold-400 border border-gold-500/30'
                  : 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span className="font-medium">⚡ EventGraph</span>
              <span className="text-[10px] text-zinc-500 font-mono">Runtime</span>
            </button>

            <button
              onClick={() => switchGraph('ConstructionScript')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors ${
                activeGraphType === 'ConstructionScript'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                  : 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span className="font-medium">🛠️ ConstructionScript</span>
              <span className="text-[10px] text-zinc-500 font-mono">Edit-time</span>
            </button>
          </div>
        </div>

        {/* Variables Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono px-1">
            <span>Variables ({variables.length})</span>
            <button
              onClick={() => setIsAddingVar(!isAddingVar)}
              className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-gold-500 hover:text-black text-[10px] text-zinc-200 transition-colors"
            >
              <LuPlus size={11} />
              <span>Add</span>
            </button>
          </div>

          {/* Add Variable Inline Form */}
          {isAddingVar && (
            <form
              onSubmit={handleAddVariable}
              className="p-2.5 rounded bg-black/60 border border-gold-500/40 space-y-2 text-xs"
            >
              <div>
                <label className="text-[10px] text-zinc-400 font-mono uppercase">Variable Name</label>
                <input
                  type="text"
                  placeholder="e.g. MaxStamina"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-gold-500 font-mono"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 font-mono uppercase">Type</label>
                  <select
                    value={newVarType}
                    onChange={(e) => setNewVarType(e.target.value as PinType)}
                    className="w-full mt-0.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-gold-500 font-mono"
                  >
                    {PIN_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-mono uppercase">Category</label>
                  <input
                    type="text"
                    value={newVarCategory}
                    onChange={(e) => setNewVarCategory(e.target.value)}
                    className="w-full mt-0.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 font-mono uppercase">Default Value</label>
                <input
                  type="text"
                  placeholder="0.0"
                  value={newVarDefaultVal}
                  onChange={(e) => setNewVarDefaultVal(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-gold-500 font-mono"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="replicated"
                  checked={newVarReplicated}
                  onChange={(e) => setNewVarReplicated(e.target.checked)}
                  className="rounded border-zinc-700 text-gold-500 focus:ring-0 bg-zinc-900"
                />
                <label htmlFor="replicated" className="text-[11px] text-zinc-300 font-mono">
                  Replicated (Multiplayer)
                </label>
              </div>

              <div className="flex justify-end space-x-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingVar(false)}
                  className="px-2 py-1 rounded text-zinc-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-gold-500 text-black font-semibold text-xs hover:bg-gold-400 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          {/* Categorized Variable List */}
          <div className="space-y-3">
            {categories.map((category) => {
              const catVars = variables.filter(v => (v.category || 'Default') === category);

              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-[10px] font-mono uppercase text-zinc-500 px-1">
                    <LuFolder size={11} />
                    <span>{category}</span>
                  </div>

                  {catVars.map((v) => {
                    const typeOption = PIN_TYPE_OPTIONS.find(p => p.value === v.type) || PIN_TYPE_OPTIONS[1];

                    return (
                      <div
                        key={v.id}
                        className="group p-2 rounded bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="space-y-0.5 truncate mr-2">
                          <div className="flex items-center space-x-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              v.type === 'bool' ? 'bg-red-500' :
                              v.type === 'float' ? 'bg-green-500' :
                              v.type === 'int' ? 'bg-teal-400' :
                              v.type === 'vector' ? 'bg-gold-500' : 'bg-blue-400'
                            }`} />
                            <span className="font-semibold text-zinc-200 truncate">{v.name}</span>
                            {v.isReplicated && (
                              <span title="Replicated over network" className="text-gold-400">
                                <LuNetwork size={11} />
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-mono ${typeOption.color}`}>
                            {typeOption.label}
                          </span>
                        </div>

                        {/* Action Buttons: Get / Set / Delete */}
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={() => handleSpawnGetter(v)}
                            title={`Spawn Get ${v.name}`}
                            className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-gold-500 hover:text-black text-[10px] font-mono text-zinc-200 transition-colors"
                          >
                            Get
                          </button>
                          <button
                            onClick={() => handleSpawnSetter(v)}
                            title={`Spawn Set ${v.name}`}
                            className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-gold-500 hover:text-black text-[10px] font-mono text-zinc-200 transition-colors"
                          >
                            Set
                          </button>
                          <button
                            onClick={() => handleDeleteVariable(v.id)}
                            title="Delete variable"
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-red-400 transition-opacity"
                          >
                            <LuTrash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Helper */}
      <div className="p-3 bg-noder-panel border-t border-zinc-800 text-[11px] text-zinc-400 font-mono">
        Click <strong className="text-zinc-200">Get</strong> or <strong className="text-zinc-200">Set</strong> to spawn nodes directly onto the graph.
      </div>
    </div>
  );
};
