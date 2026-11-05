import React, { useState, useEffect, useRef, useMemo } from 'react';
import { STANDARD_UE_NODES, StandardUENodePreset } from '../data/standardUENodes';
import { LuSearch, LuZap, LuGitFork, LuActivity, LuTerminal, LuLayers, LuMessageSquare, LuSparkles } from 'react-icons/lu';

export interface OriginPinContext {
  nodeId: string;
  handleId: string;
  handleType: 'source' | 'target';
  pinType: string;
  pinName: string;
}

interface UnrealContextMenuProps {
  x: number;
  y: number;
  originPin?: OriginPinContext | null;
  onClose: () => void;
  onSelectNode: (preset: StandardUENodePreset, originPin?: OriginPinContext | null) => void;
  onAddComment: () => void;
}

export const UnrealContextMenu: React.FC<UnrealContextMenuProps> = ({
  x,
  y,
  originPin,
  onClose,
  onSelectNode,
  onAddComment,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isContextSensitive, setIsContextSensitive] = useState(Boolean(originPin));
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  // Filter presets based on search query and optional Context Sensitivity
  const filteredNodes = useMemo(() => {
    let pool = STANDARD_UE_NODES;

    if (isContextSensitive && originPin) {
      pool = pool.filter(node => {
        if (originPin.handleType === 'source') {
          // Dragged from output pin: need node with an input pin matching pinType
          return (node.inputs || []).some(
            inp => inp.type === originPin.pinType || (originPin.pinType === 'exec' && inp.type === 'exec')
          );
        } else {
          // Dragged from input pin: need node with an output pin matching pinType
          return (node.outputs || []).some(
            out => out.type === originPin.pinType || (originPin.pinType === 'exec' && out.type === 'exec')
          );
        }
      });
    }

    const query = search.toLowerCase().trim();
    if (!query) return pool;
    return pool.filter(
      n =>
        n.title.toLowerCase().includes(query) ||
        n.subtitle.toLowerCase().includes(query) ||
        n.category.toLowerCase().includes(query)
    );
  }, [search, isContextSensitive, originPin]);

  const MAX_DISPLAY_NODES = 60;

  // Windowed display slice to keep DOM lightweight and 120fps responsive
  const displayNodes = useMemo(() => {
    return filteredNodes.slice(0, MAX_DISPLAY_NODES);
  }, [filteredNodes]);

  // Group by category
  const categories = useMemo(() => {
    const map = new Map<string, StandardUENodePreset[]>();
    displayNodes.forEach(node => {
      if (!map.has(node.category)) map.set(node.category, []);
      map.get(node.category)!.push(node);
    });
    return Array.from(map.entries());
  }, [displayNodes]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => {
    const items: ({ type: 'node'; preset: StandardUENodePreset } | { type: 'comment' })[] = [
      { type: 'comment' },
      ...displayNodes.map(preset => ({ type: 'node' as const, preset })),
    ];
    return items;
  }, [displayNodes]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = flatItems[selectedIndex];
      if (current) {
        if (current.type === 'comment') {
          onAddComment();
          onClose();
        } else {
          onSelectNode(current.preset, originPin);
          onClose();
        }
      }
    }
  };

  // Adjust menu position to avoid screen overflowing
  const menuStyle = useMemo(() => {
    const menuWidth = 320;
    const menuHeight = 420;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const posX = x + menuWidth > screenWidth ? Math.max(10, screenWidth - menuWidth - 20) : x;
    const posY = y + menuHeight > screenHeight ? Math.max(10, screenHeight - menuHeight - 20) : y;

    return { left: `${posX}px`, top: `${posY}px` };
  }, [x, y]);

  let currentFlatIdx = 0;

  return (
    <div
      ref={containerRef}
      style={menuStyle}
      className="fixed z-50 w-80 bg-zinc-950/95 dark:bg-black/95 text-zinc-100 rounded-lg border border-zinc-800 shadow-2xl backdrop-blur-md overflow-hidden font-sans select-none animate-fade-in"
      onKeyDown={handleKeyDown}
    >
      {/* Header & Search */}
      <div className="p-2 border-b border-zinc-800/80 bg-zinc-900/60 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          <span className="font-semibold text-zinc-200">
            {originPin ? `Actions for [${originPin.pinType.toUpperCase()}] Pin` : 'All Actions for this Blueprint'}
          </span>
          {originPin && (
            <label className="flex items-center gap-1.5 cursor-pointer text-gold-400 font-mono text-[10px]">
              <input
                type="checkbox"
                checked={isContextSensitive}
                onChange={e => setIsContextSensitive(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-gold-500 focus:ring-0"
              />
              <span>Context Sensitive</span>
            </label>
          )}
        </div>
        <div className="flex items-center space-x-2 px-2 py-1.5 rounded bg-zinc-950 border border-zinc-800 focus-within:border-gold-500">
          <LuSearch className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={originPin ? `Search compatible ${originPin.pinType} nodes...` : "Search all Blueprint nodes..."}
            className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Menu Action List */}
      <div className="max-h-80 overflow-y-auto p-1.5 space-y-2 text-xs">
        {/* Comment Action */}
        <div>
          <button
            onClick={() => {
              onAddComment();
              onClose();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-colors text-left ${
              selectedIndex === 0
                ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                : 'hover:bg-zinc-800/60 text-zinc-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <LuMessageSquare className="w-3.5 h-3.5 text-gold-500 shrink-0" />
              <div>
                <span className="font-semibold text-white">Add Comment Box</span>
                <p className="text-[10px] text-zinc-400">Wrap nodes or organize logic section (C)</p>
              </div>
            </div>
            <kbd className="text-[9px] font-mono px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">C</kbd>
          </button>
        </div>

        {/* Categories */}
        {categories.map(([category, nodes]) => (
          <div key={category} className="space-y-0.5">
            <div className="px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-gold-500 flex items-center space-x-1">
              {category === 'Events' && <LuZap size={11} />}
              {category === 'Flow' && <LuGitFork size={11} />}
              {category === 'Locomotion' && <LuActivity size={11} />}
              {category === 'World' && <LuLayers size={11} />}
              {category === 'Physics' && <LuActivity size={11} />}
              {category === 'Math' && <LuTerminal size={11} />}
              {category === 'Audio/VFX' && <LuSparkles size={11} />}
              {category === 'UI' && <LuLayers size={11} />}
              <span>{category}</span>
            </div>

            {nodes.map(node => {
              currentFlatIdx++;
              const thisIdx = currentFlatIdx;
              const isSelected = selectedIndex === thisIdx;

              return (
                <button
                  key={node.id}
                  onClick={() => {
                    onSelectNode(node, originPin);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1 rounded text-left transition-colors ${
                    isSelected
                      ? 'bg-gold-500/20 text-gold-300 border border-gold-500/30'
                      : 'hover:bg-zinc-800/60 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: node.color }}
                    />
                    <div className="truncate">
                      <span className="font-medium text-white">{node.title}</span>
                      <span className="text-[10px] text-zinc-500 ml-1.5 truncate">
                        {node.subtitle}
                      </span>
                    </div>
                  </div>
                  {node.title === 'Branch' && (
                    <kbd className="text-[9px] font-mono px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">B+Click</kbd>
                  )}
                  {node.title === 'Sequence' && (
                    <kbd className="text-[9px] font-mono px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">S+Click</kbd>
                  )}
                  {node.title === 'Delay' && (
                    <kbd className="text-[9px] font-mono px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">D+Click</kbd>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {filteredNodes.length === 0 && (
          <div className="p-4 text-center text-zinc-500 text-xs">
            No matching Unreal Engine actions found.
          </div>
        )}
      </div>

      {/* Footer Navigation Tip */}
      <div className="px-3 py-1.5 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-[10px] font-mono text-zinc-500">
        <div className="flex items-center space-x-2">
          <span>↑↓ Navigate</span>
          <span>↵ Spawn</span>
          <span>Esc Close</span>
        </div>
        {filteredNodes.length > MAX_DISPLAY_NODES && (
          <span className="text-gold-500">
            Showing top {MAX_DISPLAY_NODES} of {filteredNodes.length}
          </span>
        )}
      </div>
    </div>
  );
};

