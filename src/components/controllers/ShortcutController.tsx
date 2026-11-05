import React, { useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import { toast } from 'react-hot-toast';
import { NodeData } from '../../types/BlueprintTypes';
import { compileGraphToT3D } from '../../utils/ueT3DCompiler';
import { parseUE5T3DToGraph } from '../../utils/ueT3DParser';
import { useBlueprintStore } from '../../store/blueprintStore';
import { ShortcutControllerProps } from './types';

export const copyGraphToUE5Clipboard = async (
  nodes: Node<NodeData>[],
  edges: Edge[],
  addLog?: (entry: any) => void
): Promise<boolean> => {
  if (nodes.length === 0) {
    toast.error('No nodes in blueprint to copy');
    return false;
  }
  try {
    const { t3dText, nodeCount } = compileGraphToT3D(nodes, edges);
    await navigator.clipboard.writeText(t3dText);
    toast.success(
      `Copied ${nodeCount} nodes! Paste directly into Unreal Engine 5 Event Graph (Ctrl+V).`,
      { duration: 4500 }
    );
    if (addLog) {
      addLog({
        type: 'compiler',
        message: `LogCompiler: Exported ${nodeCount} nodes to Unreal Engine T3D clipboard format.`,
      });
    }
    return true;
  } catch {
    toast.error('Failed to copy to clipboard');
    return false;
  }
};

export const importGraphFromUE5Clipboard = async (
  setNodes: (n: Node<NodeData>[]) => void,
  setEdges: (e: Edge[]) => void,
  pushHistory: (msg: string) => void,
  addLog?: (entry: any) => void
): Promise<boolean> => {
  try {
    const text = await navigator.clipboard.readText();
    if (!text || !text.includes('Begin Object')) {
      toast.error('Clipboard does not contain valid Unreal Engine T3D nodes. Copy nodes inside UE5 first!');
      return false;
    }
    const { nodes: pNodes, edges: pEdges } = parseUE5T3DToGraph(text);
    if (pNodes.length === 0) {
      toast.error('No valid Unreal Engine nodes detected in clipboard.');
      return false;
    }
    pushHistory('Import from UE5');
    setNodes(pNodes);
    setEdges(pEdges);
    toast.success(`Successfully imported ${pNodes.length} nodes from Unreal Engine 5!`);
    if (addLog) {
      addLog({
        type: 'compiler',
        message: `LogCompiler: Successfully reverse-compiled ${pNodes.length} nodes and ${pEdges.length} connections from Unreal Engine 5.`,
      });
    }
    return true;
  } catch (e: any) {
    toast.error(`Import error: ${e.message}`);
    return false;
  }
};

export const ShortcutController: React.FC<ShortcutControllerProps> = ({
  onUndo,
  onRedo,
  onAddComment,
  onStraightenConnections,
  onAlignHorizontal,
  onAlignVertical,
  onFormatGraph,
  onDeleteSelected,
  onDuplicateSelected,
  onCollapseToMacro,
  onToggleBreakpoint,
  onOpenContextMenu,
  isSimulating,
  isSimPaused,
  onResumeSimulation,
  onStepForward,
  onPasteUE5,
  lastMousePosRef,
  heldKeyRef,
}) => {
  useEffect(() => {
    const isFocusInInput = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return true;
      if (target.closest('[role="dialog"]') || target.closest('.modal-content')) return true;
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFocusInInput(e.target)) return;

      const key = e.key.toLowerCase();

      // Track held keys for quick click spawning (B, S, D, P)
      if (['b', 's', 'd', 'p'].includes(key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        heldKeyRef.current = key;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      } else if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        onRedo();
      } else if (key === 'c' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onAddComment();
      } else if (key === 'q' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onStraightenConnections();
      } else if (e.shiftKey && key === 'a') {
        e.preventDefault();
        onAlignHorizontal();
      } else if (e.shiftKey && key === 'w') {
        e.preventDefault();
        onAlignVertical();
      } else if (e.shiftKey && key === 'f') {
        e.preventDefault();
        onFormatGraph();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        onDeleteSelected();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        onOpenContextMenu({ x: lastMousePosRef.current.x, y: lastMousePosRef.current.y });
      } else if (e.key === 'F9') {
        e.preventDefault();
        onToggleBreakpoint();
      } else if (e.key === 'F5' && isSimulating && isSimPaused) {
        e.preventDefault();
        onResumeSimulation();
      } else if (e.key === 'F10' && isSimulating) {
        e.preventDefault();
        onStepForward();
      } else if ((e.ctrlKey || e.metaKey) && (key === 'w' || key === 'd')) {
        e.preventDefault();
        onDuplicateSelected();
      } else if ((e.ctrlKey || e.metaKey) && key === 'g') {
        e.preventDefault();
        onCollapseToMacro();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (heldKeyRef.current === key) {
        heldKeyRef.current = null;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (isFocusInInput(e.target)) return;

      const pasteData = e.clipboardData?.getData('text');
      if (pasteData && (pasteData.includes('Begin Object Class=') || pasteData.includes('Begin Object'))) {
        e.preventDefault();
        if (onPasteUE5) {
          onPasteUE5(pasteData);
        } else {
          try {
            const { nodes: pNodes, edges: pEdges } = parseUE5T3DToGraph(pasteData);
            if (pNodes.length > 0) {
              const store = useBlueprintStore.getState();
              store.pushHistory('Paste from UE5');
              store.setNodes(pNodes);
              store.setEdges(pEdges);
              toast.success(`Pasted ${pNodes.length} nodes directly from Unreal Engine 5!`);
            }
          } catch (err) {
            console.warn('Clipboard paste parse failed:', err);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('paste', handleGlobalPaste);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [
    onUndo,
    onRedo,
    onAddComment,
    onStraightenConnections,
    onAlignHorizontal,
    onAlignVertical,
    onFormatGraph,
    onDeleteSelected,
    onDuplicateSelected,
    onCollapseToMacro,
    onToggleBreakpoint,
    onOpenContextMenu,
    isSimulating,
    isSimPaused,
    onResumeSimulation,
    onStepForward,
    onPasteUE5,
    lastMousePosRef,
    heldKeyRef,
  ]);

  return null;
};

export default ShortcutController;
