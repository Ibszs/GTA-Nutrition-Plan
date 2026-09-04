const DEFAULT_STORES = [
  {
    id: 'costco-burlington',
    name: 'Costco - Burlington',
    items: [
      ['chicken-thighs', 'Halal boneless skinless chicken thighs', '1 pack, about 2.1 kg', '', 'PLAIN'],
      ['jasmine-rice', 'Thai Hom Mali jasmine rice', '1 bag, 8 kg', '', 'PLAIN'],
      ['greek-yogurt', 'Oikos PRO plain Greek yogurt', '2 x 750 g', '', 'LABEL'],
      ['rolled-oats', 'Plain large-flake rolled oats', '1 bag, 4.54 kg', '', 'PLAIN'],
      ['peanut-butter', 'Natural peanut butter', '2 x 1 kg', 'Buy only if ingredient list passes.', 'LABEL'],
      ['olive-oil', 'Extra virgin olive oil', '3 L', 'One-ingredient label.', 'LABEL'],
      ['mixed-vegetables', 'Frozen mixed vegetables', '2.5 kg', 'No sauce or seasoning.', 'LABEL'],
      ['honey', '100% pure liquid honey', '3 x 750 g', '', 'LABEL'],
    ],
  },
  {
    id: 'food-basics-milton',
    name: 'Food Basics - Milton',
    items: [
      ['eggs', 'Large eggs', '30', '', 'PLAIN'],
      ['milk', 'Beatrice 2% milk', '4 L', '', 'LABEL'],
      ['bananas', 'Bananas', 'about 1 kg', '', 'PLAIN'],
      ['raisins', 'Natural seedless raisins', '750 g', '', 'LABEL'],
      ['ground-turkey', 'Plain ground turkey', 'smallest 400-500 g pack', 'Trial only.', 'PLAIN'],
      ['onions', 'Onions', '1 small bag', '', 'PLAIN'],
      ['lemons', 'Lemons', '2', '', 'PLAIN'],
      ['garlic', 'Fresh garlic', '1 bulb', '', 'PLAIN'],
    ],
  },
  {
    id: 'iqbal-erin-mills',
    name: 'Iqbal Foods - Erin Mills',
    items: [
      ['lentils', 'Plain dry lentils', 'about 1.8 kg', '', 'PLAIN'],
      ['cumin', 'Plain cumin', '1 pack only if needed', '', 'PLAIN'],
      ['paprika', 'Plain paprika', '1 pack only if needed', '', 'PLAIN'],
      ['turmeric', 'Plain turmeric', '1 pack only if needed', '', 'PLAIN'],
      ['salt', 'Salt', '1 pack only if needed', '', 'PLAIN'],
      ['black-pepper', 'Black pepper', '1 pack only if needed', '', 'PLAIN'],
    ],
  },
].map((store) => ({
  ...store,
  items: store.items.map(([id, name, quantity, note, tag]) => ({
    id,
    name,
    quantity,
    note,
    tag,
    checked: false,
  })),
}));

function clone(value) {
  return structuredClone(value);
}

function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${label} is required.`);
  }
  return value.trim();
}

function optionalText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function defaultId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function requireStore(state, storeId) {
  const store = state.stores.find((candidate) => candidate.id === storeId);
  if (!store) throw new RangeError(`Shopping store not found: ${storeId}`);
  return store;
}

function requireItem(store, itemId) {
  const item = store.items.find((candidate) => candidate.id === itemId);
  if (!item) throw new RangeError(`Shopping item not found: ${itemId}`);
  return item;
}

function normalizedDraft(draft) {
  return {
    name: requireText(draft?.name, 'Item name'),
    quantity: optionalText(draft?.quantity),
    note: optionalText(draft?.note),
    tag: optionalText(draft?.tag).toUpperCase(),
  };
}

export function validateShoppingState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new TypeError('Shopping data must be an object.');
  }
  if (state.version !== 2) {
    throw new RangeError('Shopping data uses an unsupported version.');
  }
  if (!Array.isArray(state.stores)) {
    throw new TypeError('Shopping data must contain a stores array.');
  }

  const storeIds = new Set();
  const itemIds = new Set();
  for (const store of state.stores) {
    const storeId = requireText(store?.id, 'Shopping store ID');
    requireText(store?.name, 'Shopping store name');
    if (!Array.isArray(store?.items)) {
      throw new TypeError('Shopping store must contain an items array.');
    }
    if (storeIds.has(storeId)) throw new TypeError(`Duplicate shopping store ID: ${storeId}`);
    storeIds.add(storeId);

    for (const item of store.items) {
      const itemId = requireText(item?.id, 'Shopping item ID');
      requireText(item?.name, 'Shopping item name');
      if (typeof item.quantity !== 'string' || typeof item.note !== 'string' || typeof item.tag !== 'string') {
        throw new TypeError('Shopping item text fields must be strings.');
      }
      if (typeof item.checked !== 'boolean') {
        throw new TypeError('Shopping item checked state must be boolean.');
      }
      if (itemIds.has(itemId)) throw new TypeError(`Duplicate shopping item ID: ${itemId}`);
      itemIds.add(itemId);
    }
  }

  return clone(state);
}

export function createDefaultShoppingState() {
  return { version: 2, stores: clone(DEFAULT_STORES) };
}

export function addStore(state, name, idFactory = defaultId) {
  const next = validateShoppingState(state);
  const id = requireText(idFactory(), 'Shopping store ID');
  if (next.stores.some((store) => store.id === id)) {
    throw new TypeError(`Duplicate shopping store ID: ${id}`);
  }
  next.stores.push({ id, name: requireText(name, 'Store name'), items: [] });
  return next;
}

export function renameStore(state, storeId, name) {
  const next = validateShoppingState(state);
  requireStore(next, storeId).name = requireText(name, 'Store name');
  return next;
}

export function removeStore(state, storeId) {
  const next = validateShoppingState(state);
  requireStore(next, storeId);
  next.stores = next.stores.filter((store) => store.id !== storeId);
  return next;
}

export function addItem(state, storeId, draft, idFactory = defaultId) {
  const next = validateShoppingState(state);
  const store = requireStore(next, storeId);
  const id = requireText(idFactory(), 'Shopping item ID');
  if (next.stores.some((candidate) => candidate.items.some((item) => item.id === id))) {
    throw new TypeError(`Duplicate shopping item ID: ${id}`);
  }
  store.items.push({ id, ...normalizedDraft(draft), checked: false });
  return next;
}

export function updateItem(state, storeId, itemId, draft) {
  const next = validateShoppingState(state);
  const item = requireItem(requireStore(next, storeId), itemId);
  Object.assign(item, normalizedDraft(draft));
  return next;
}

export function removeItem(state, storeId, itemId) {
  const next = validateShoppingState(state);
  const store = requireStore(next, storeId);
  requireItem(store, itemId);
  store.items = store.items.filter((item) => item.id !== itemId);
  return next;
}

export function toggleItem(state, storeId, itemId, checked) {
  const next = validateShoppingState(state);
  const item = requireItem(requireStore(next, storeId), itemId);
  item.checked = typeof checked === 'boolean' ? checked : !item.checked;
  return next;
}

export function clearChecks(state) {
  const next = validateShoppingState(state);
  next.stores.forEach((store) => store.items.forEach((item) => {
    item.checked = false;
  }));
  return next;
}

export function shoppingProgress(state) {
  const valid = validateShoppingState(state);
  const items = valid.stores.flatMap((store) => store.items);
  const checked = items.filter((item) => item.checked).length;
  return {
    checked,
    total: items.length,
    percent: items.length ? Math.round((checked / items.length) * 100) : 0,
  };
}

export function shoppingToText(state) {
  const valid = validateShoppingState(state);
  return valid.stores.map((store) => {
    const lines = store.items.map((item) => {
      const quantity = item.quantity ? ` - ${item.quantity}` : '';
      const note = item.note ? ` (${item.note})` : '';
      return `${item.checked ? '☑' : '☐'} ${item.name}${quantity}${note}`;
    });
    return [store.name.toUpperCase(), ...lines].join('\n');
  }).join('\n\n');
}

