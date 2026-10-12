import { useState } from 'react';

export function useSelection() {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const enter = () => setSelectionMode(true);

  const exit = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return { selectionMode, selectedIds, count: selectedIds.size, enter, exit, toggle };
}
