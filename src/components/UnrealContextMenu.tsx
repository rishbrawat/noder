import React, { useState, useEffect, useRef, useMemo } from 'react';
import { STANDARD_UE_NODES, StandardUENodePreset } from '../data/standardUENodes';
import { LuSearch, LuZap, LuGitFork, LuActivity, LuTerminal, LuLayers, LuMessageSquare } from 'react-icons/lu';

interface UnrealContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSelectNode: (preset: StandardUENodePreset) => void;
  onAddComment: () => void;
}

export const UnrealContextMenu: React.FC<UnrealContextMenuProps> = ({
  x,
  y,
  onClose,
  onSelectNode,
  onAddComment,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
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

  // Filter presets based on search query
  const filteredNodes = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return STANDARD_UE_NODES;
    return STANDARD_UE_NODES.filter(
      n =>
        n.title.toLowerCase().includes(query) ||
        n.subtitle.toLowerCase().includes(query) ||
        n.category.toLowerCase().includes(query)
    );
  }, [search]);

  // Group by category
  const categories = useMemo(() => {
    const map = new Map<string, StandardUENodePreset[]>();
    filteredNodes.forEach(node => {
      if (!map.has(node.category)) map.set(node.category, []);
      map.get(node.category)!.push(node);
    });
    return Array.from(map.entries());
  }, [filteredNodes]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => {
    const items: ({ type: 'node'; preset: StandardUENodePreset } | { type: 'comment' })[] = [
      { type: 'comment' },
      ...filteredNodes.map(preset => ({ type: 'node' as const, preset })),
    ];
    return items;
  }, [filteredNodes]);

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
          onSelectNode(current.preset);
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
      <div className="p-2 border-b border-zinc-800/80 bg-zinc-900/60">
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
            placeholder="All Actions for this Blueprint..."
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
              {category === 'Math' && <LuTerminal size={11} />}
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
                    onSelectNode(node);
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
        <span>↑↓ Navigate</span>
        <span>↵ Spawn</span>
        <span>Esc Close</span>
      </div>
    </div>
  );
};

