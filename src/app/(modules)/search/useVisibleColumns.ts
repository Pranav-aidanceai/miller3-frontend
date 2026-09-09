'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_VISIBLE_COLUMNS, OPTIONAL_COLUMNS, TABLE_COLUMNS_STORAGE_KEY } from './tableColumns';

function loadVisibleColumns(): string[] {
    if (typeof window === 'undefined') return DEFAULT_VISIBLE_COLUMNS;
    try {
        const raw = localStorage.getItem(TABLE_COLUMNS_STORAGE_KEY);
        if (!raw) return DEFAULT_VISIBLE_COLUMNS;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return DEFAULT_VISIBLE_COLUMNS;
        // Drop anything that no longer exists as a column, so a stale cache
        // from an older build can't render a blank header.
        const validKeys = new Set(OPTIONAL_COLUMNS.map(c => c.key));
        const filtered = parsed.filter((key): key is string => typeof key === 'string' && validKeys.has(key));
        return filtered.length > 0 ? filtered : DEFAULT_VISIBLE_COLUMNS;
    } catch {
        return DEFAULT_VISIBLE_COLUMNS;
    }
}

/**
 * The optional columns the company table shows. The choice is per-browser
 * rather than per-search, so it applies the same way across Search, AI Search
 * and Buckets — which is also why the picker and the table can each hold their
 * own copy and still agree.
 */
export function useVisibleColumns(): [string[], (keys: string[]) => void] {
    // Deliberately not a lazy useState initializer: the server always renders
    // DEFAULT_VISIBLE_COLUMNS (no localStorage there), so seeding state with
    // the real saved value here — before the client's first paint settles —
    // would render a different set of columns than the server did and trip a
    // hydration mismatch. Swapping in the saved value post-mount is a plain
    // update instead.
    const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setVisibleColumns(loadVisibleColumns()); }, []);

    const setColumns = (keys: string[]) => {
        setVisibleColumns(keys);
        try {
            localStorage.setItem(TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(keys));
        } catch {
            // Ignore quota/serialization errors — persistence is best-effort.
        }
    };

    return [visibleColumns, setColumns];
}
