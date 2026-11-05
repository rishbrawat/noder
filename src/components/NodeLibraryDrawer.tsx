import React, { useState, useMemo, useEffect } from 'react';
import { LuSearch, LuPlus, LuX, LuLayers } from 'react-icons/lu';
import { STANDARD_UE_NODES, StandardUENodePreset, NodeCategory } from '../data/standardUENodes';
import { useBlueprintStore } from '../store/blueprintStore';
import { MATERIAL_EXPRESSIONS } from '../features/shaders/utils/materialNodesCatalog';
import { NIAGARA_MODULES } from '../features/niagara/utils/niagaraModulesCatalog';
import { GAS_ABILITY_TASKS } from '../features/gas/data/gasCatalog';
import { PinType, NodeType, UEGraphType } from '../types/BlueprintTypes';

export function getNodePresetsForGraph(graphType: UEGraphType): StandardUENodePreset[] {
  if (graphType === 'ShadersUE') {
    return MATERIAL_EXPRESSIONS.map((m): StandardUENodePreset => ({
      id: m.id,
      category: m.category as NodeCategory,
      title: m.title,
      subtitle: m.ueClassName.replace(/^MaterialExpression/, ''),
      nodeType: 'customNode',
      color: m.color || '#0284C7',
      inputs: (m.inputs || []).map(i => ({
        name: i.name,
        type: i.type as PinType,
        value: i.defaultValue,
      })),
      outputs: (m.outputs || []).map(o => ({
        name: o.name,
        type: o.type as PinType,
      })),
    }));
  }

  if (graphType === 'NiagaraVFX') {
    const niagaraNodes = NIAGARA_MODULES.map((n): StandardUENodePreset => {
      const isSpawn = n.stage.toLowerCase().includes('spawn');
      const baseInputs: Array<{ name: string; type: PinType; value?: any }> = (n.inputs || []).map(i => ({
        name: i.name,
        type: i.type as PinType,
        value: i.defaultValue,
      }));
      const inputs = (!isSpawn && !baseInputs.some(i => i.type === 'exec'))
        ? [{ name: 'Exec', type: 'exec' as PinType }, ...baseInputs]
        : baseInputs;

      return {
        id: n.id,
        category: n.category as NodeCategory,
        title: n.name,
        subtitle: n.stage,
        nodeType: (isSpawn ? 'event' : 'function') as NodeType,
        color: n.color || '#D97706',
        inputs,
        outputs: (n.outputs || [{ name: 'Then', type: 'exec' }]).map(o => ({
          name: o.name,
          type: o.type as PinType,
        })),
      };
    });

    const mathNodes = STANDARD_UE_NODES.filter(n => n.category === 'Math');
    return [...niagaraNodes, ...mathNodes];
  }

  if (graphType === 'GASStudio') {
    const gasCoreNodes: StandardUENodePreset[] = [
      {
        id: 'gas_node_activate_ability',
        category: 'Events' as NodeCategory,
        title: 'ActivateAbility',
        subtitle: 'Gameplay Ability Entry',
        nodeType: 'event',
        color: '#0284C7',
        inputs: [],
        outputs: [
          { name: 'OutputDelegate', type: 'object' },
          { name: 'Then', type: 'exec' },
        ],
      },
      {
        id: 'gas_node_commit_ability',
        category: 'Flow' as NodeCategory,
        title: 'Commit Ability',
        subtitle: 'Cost & Cooldown Check',
        nodeType: 'function',
        color: '#16A34A',
        inputs: [{ name: 'Execute', type: 'exec' }],
        outputs: [
          { name: 'Then', type: 'exec' },
          { name: 'ReturnValue', type: 'bool' },
        ],
      },
      {
        id: 'gas_node_end_ability',
        category: 'Flow' as NodeCategory,
        title: 'End Ability',
        subtitle: 'Clean Up & Remove Granted Tags',
        nodeType: 'function',
        color: '#DC2626',
        inputs: [{ name: 'Execute', type: 'exec' }],
        outputs: [{ name: 'Then', type: 'exec' }],
      },
      {
        id: 'gas_node_apply_ge_to_owner',
        category: 'World' as NodeCategory,
        title: 'Apply GameplayEffect To Owner',
        subtitle: 'Gameplay Effect Execution',
        nodeType: 'function',
        color: '#9333EA',
        inputs: [
          { name: 'Execute', type: 'exec' },
          { name: 'GameplayEffectClass', type: 'class' },
          { name: 'Level', type: 'float', value: 1.0 },
        ],
        outputs: [
          { name: 'Then', type: 'exec' },
          { name: 'ActiveEffectHandle', type: 'object' },
        ],
      },
    ];

    const gasTaskNodes: StandardUENodePreset[] = GAS_ABILITY_TASKS.map((t): StandardUENodePreset => ({
      id: t.id,
      category: (t.category || 'Tasks') as NodeCategory,
      title: t.title,
      subtitle: t.taskType,
      nodeType: 'function',
      color: '#D97706',
      inputs: (t.inputs || []).map(i => ({
        name: i.name,
        type: (i.type === 'exec' ? 'exec' : i.type === 'bool' ? 'bool' : i.type === 'float' ? 'float' : 'object') as PinType,
        value: i.defaultValue,
      })),
      outputs: (t.outputs || []).map(o => ({
        name: o.name,
        type: (o.type === 'exec' ? 'exec' : o.type === 'bool' ? 'bool' : o.type === 'float' ? 'float' : 'object') as PinType,
      })),
    }));

    return [...gasCoreNodes, ...gasTaskNodes];
  }

  return STANDARD_UE_NODES;
}

interface NodeLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (preset: StandardUENodePreset) => void;
}

export const NodeLibraryDrawer: React.FC<NodeLibraryDrawerProps> = ({
  isOpen,
  onClose,
  onAddNode,
}) => {
  const activeGraphType = useBlueprintStore(state => state.activeGraphType);
  const activeCatalog = useMemo(() => getNodePresetsForGraph(activeGraphType), [activeGraphType]);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    setSelectedCategory('All');
  }, [activeGraphType]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    activeCatalog.forEach(node => {
      if (node.category) cats.add(node.category);
    });
    return ['All', ...Array.from(cats)];
  }, [activeCatalog]);

  const filteredNodes = useMemo(() => {
    return activeCatalog.filter(node => {
      const matchesSearch =
        node.title.toLowerCase().includes(search.toLowerCase()) ||
        node.subtitle.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || node.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeCatalog, search, selectedCategory]);

  const libraryTitle = useMemo(() => {
    if (activeGraphType === 'ShadersUE') return 'Material Expressions';
    if (activeGraphType === 'NiagaraVFX') return 'Niagara Modules';
    if (activeGraphType === 'GASStudio') return 'GAS Tasks & Presets';
    return 'Node Library';
  }, [activeGraphType]);

  const searchPlaceholder = useMemo(() => {
    if (activeGraphType === 'ShadersUE') return 'Search Material Expressions...';
    if (activeGraphType === 'NiagaraVFX') return 'Search Niagara Modules...';
    if (activeGraphType === 'GASStudio') return 'Search GAS Tasks & Abilities...';
    return 'Search Unreal nodes...';
  }, [activeGraphType]);

  if (!isOpen) return null;

  return (
    <aside className="fixed top-16 right-4 z-40 w-80 max-h-[calc(100vh-5rem)] flex flex-col bg-white dark:bg-noder-dark border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl overflow-hidden animate-fade-in font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-noder-panel border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center space-x-2">
          <LuLayers className="w-4 h-4 text-gold-500" />
          <h3 className="text-xs font-semibold tracking-wide uppercase text-zinc-900 dark:text-zinc-100">
            {libraryTitle}
          </h3>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
            {filteredNodes.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <LuX className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 bg-white dark:bg-noder-dark border-b border-zinc-100 dark:border-zinc-900">
        <div className="relative">
          <LuSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full py-1.5 pl-8 pr-3 text-xs rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-gold-500 transition-colors"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1 mt-2.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                selectedCategory === cat
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredNodes.map(node => (
          <div
            key={node.id}
            onClick={() => onAddNode(node)}
            className="group flex items-center justify-between p-2 rounded cursor-pointer border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all duration-150"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: node.color }}
              />
              <div className="truncate">
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-gold-500 dark:group-hover:text-gold-400 transition-colors truncate">
                  {node.title}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                  {node.subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="p-1 rounded opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <LuPlus className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {filteredNodes.length === 0 && (
          <div className="py-8 text-center text-xs text-zinc-400">
            No Unreal Engine nodes match "{search}"
          </div>
        )}
      </div>

      {/* Footer Helper */}
      <div className="p-2.5 bg-zinc-50 dark:bg-noder-panel border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400 text-center">
        Click any node to spawn it at the canvas center.
      </div>
    </aside>
  );
};

