import type { InventoryItem } from './database.types';

function getInventoryStackKey(item: InventoryItem) {
    if (item.source_type === 'static') {
        return `static:${item.item_key ?? item.title}`;
    }

    return `dynamic:${item.title}::${item.description ?? ''}::${item.category ?? ''}`;
}

export function normalizeInventoryStacks(items: InventoryItem[]) {
    const stackMap = new Map<string, InventoryItem>();

    for (const item of items) {
        const key = getInventoryStackKey(item);
        const existing = stackMap.get(key);

        if (!existing) {
            stackMap.set(key, item);
            continue;
        }

        const representative = new Date(item.updated_at).getTime() > new Date(existing.updated_at).getTime()
            ? item
            : existing;

        stackMap.set(key, {
            ...representative,
            quantity: existing.quantity + item.quantity,
        });
    }

    return [...stackMap.values()].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
}
