import {
  addItem,
  addStore,
  clearChecks,
  createDefaultShoppingState,
  removeItem,
  removeStore,
  renameStore,
  shoppingProgress,
  shoppingToText,
  toggleItem,
  updateItem,
  validateShoppingState,
} from './shopping-state.js';
import { copyText, createStorage, downloadText, loadJson, makeId, saveJson } from './common.js';

const STORAGE_KEY = 'gtaNutrition.shopping.v2';
const { storage, persistent } = createStorage();
const elements = Object.fromEntries([
  'shoppingCounter', 'shoppingBar', 'shoppingStorageNotice', 'shoppingStatus', 'stores',
  'addStoreButton', 'clearChecksButton', 'restoreDefaultsButton', 'copyListButton',
  'exportShoppingButton', 'importShoppingInput', 'storeDialog', 'storeForm',
  'storeDialogTitle', 'storeId', 'storeName', 'cancelStoreButton', 'itemDialog',
  'itemForm', 'itemDialogTitle', 'itemStoreId', 'itemId', 'itemName', 'itemQuantity',
  'itemNote', 'itemTag', 'cancelItemButton',
].map((id) => [id, document.getElementById(id)]));

let state = loadState();

function loadState() {
  try {
    return validateShoppingState(loadJson(storage, STORAGE_KEY, createDefaultShoppingState()));
  } catch (_) {
    return createDefaultShoppingState();
  }
}

function setStatus(message, error = false) {
  elements.shoppingStatus.textContent = message;
  elements.shoppingStatus.dataset.error = String(error);
}

function save() {
  saveJson(storage, STORAGE_KEY, state);
  window.dispatchEvent(new CustomEvent('gta-data-changed', { detail: { section: 'shopping' } }));
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function actionButton(label, action, storeId, itemId, className = 'ghost') {
  const button = node('button', className, label);
  button.type = 'button';
  button.dataset.action = action;
  button.dataset.storeId = storeId;
  if (itemId) button.dataset.itemId = itemId;
  return button;
}

function render() {
  elements.stores.replaceChildren();

  state.stores.forEach((store, storeIndex) => {
    const section = node('section', 'store');
    const heading = node('div', 'store-heading');
    heading.append(node('h2', '', store.name));
    const storeActions = node('div', 'store-actions');
    storeActions.append(
      actionButton('Add item', 'add-item', store.id, '', 'secondary'),
      actionButton('Rename', 'rename-store', store.id),
      actionButton('Delete store', 'delete-store', store.id, '', 'danger-button'),
    );
    heading.append(storeActions);
    section.append(heading);

    if (!store.items.length) section.append(node('p', 'empty', 'No items yet. Add one when needed.'));

    store.items.forEach((item, itemIndex) => {
      const row = node('div', `item${item.checked ? ' checked' : ''}`);
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.checked;
      checkbox.id = `shopping-check-${storeIndex}-${itemIndex}`;
      checkbox.dataset.action = 'toggle-item';
      checkbox.dataset.storeId = store.id;
      checkbox.dataset.itemId = item.id;

      const label = node('label', '', item.name);
      label.htmlFor = checkbox.id;
      const details = [item.quantity, item.note].filter(Boolean).join(' · ');
      if (details) label.append(node('small', '', details));

      const itemActions = node('div', 'item-actions');
      if (item.tag) itemActions.append(node('span', `badge${item.tag === 'LABEL' ? ' check' : ''}`, item.tag));
      itemActions.append(
        actionButton('Edit', 'edit-item', store.id, item.id),
        actionButton('Delete', 'delete-item', store.id, item.id, 'danger-button'),
      );
      row.append(checkbox, label, itemActions);
      section.append(row);
    });
    elements.stores.append(section);
  });

  const progress = shoppingProgress(state);
  elements.shoppingCounter.textContent = `${progress.checked} of ${progress.total} items`;
  elements.shoppingBar.style.width = `${progress.percent}%`;
}

function showDialog(dialog) {
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeDialog(dialog) {
  if (dialog.close) dialog.close();
  else dialog.removeAttribute('open');
}

function findStore(storeId) {
  return state.stores.find((store) => store.id === storeId);
}

function findItem(storeId, itemId) {
  return findStore(storeId)?.items.find((item) => item.id === itemId);
}

function openStoreDialog(storeId = '') {
  const store = storeId ? findStore(storeId) : null;
  elements.storeDialogTitle.textContent = store ? 'Rename store' : 'Add store';
  elements.storeId.value = store?.id ?? '';
  elements.storeName.value = store?.name ?? '';
  showDialog(elements.storeDialog);
  elements.storeName.focus();
}

function openItemDialog(storeId, itemId = '') {
  const item = itemId ? findItem(storeId, itemId) : null;
  elements.itemDialogTitle.textContent = item ? 'Edit item' : 'Add item';
  elements.itemStoreId.value = storeId;
  elements.itemId.value = item?.id ?? '';
  elements.itemName.value = item?.name ?? '';
  elements.itemQuantity.value = item?.quantity ?? '';
  elements.itemNote.value = item?.note ?? '';
  elements.itemTag.value = item?.tag ?? '';
  showDialog(elements.itemDialog);
  elements.itemName.focus();
}

function update(transform, successMessage) {
  try {
    state = transform(state);
    save();
    render();
    setStatus(successMessage);
  } catch (error) {
    setStatus(error.message, true);
  }
}

elements.stores.addEventListener('change', (event) => {
  const control = event.target.closest('[data-action="toggle-item"]');
  if (!control) return;
  update(
    (current) => toggleItem(current, control.dataset.storeId, control.dataset.itemId, control.checked),
    'Check saved.',
  );
});

elements.stores.addEventListener('click', (event) => {
  const control = event.target.closest('[data-action]');
  if (!control || control.dataset.action === 'toggle-item') return;
  const { action, storeId, itemId } = control.dataset;
  const store = findStore(storeId);
  const item = itemId ? findItem(storeId, itemId) : null;

  if (action === 'add-item') openItemDialog(storeId);
  if (action === 'rename-store') openStoreDialog(storeId);
  if (action === 'edit-item') openItemDialog(storeId, itemId);
  if (action === 'delete-store' && window.confirm(`Delete store “${store.name}” and its ${store.items.length} items?`)) {
    update((current) => removeStore(current, storeId), `Deleted ${store.name}.`);
  }
  if (action === 'delete-item' && window.confirm(`Delete item “${item.name}”?`)) {
    update((current) => removeItem(current, storeId, itemId), `Deleted ${item.name}.`);
  }
});

elements.storeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const storeId = elements.storeId.value;
  update(
    (current) => storeId
      ? renameStore(current, storeId, elements.storeName.value)
      : addStore(current, elements.storeName.value, makeId),
    storeId ? 'Store renamed.' : 'Store added.',
  );
  closeDialog(elements.storeDialog);
});

elements.itemForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const storeId = elements.itemStoreId.value;
  const itemId = elements.itemId.value;
  const draft = {
    name: elements.itemName.value,
    quantity: elements.itemQuantity.value,
    note: elements.itemNote.value,
    tag: elements.itemTag.value,
  };
  update(
    (current) => itemId
      ? updateItem(current, storeId, itemId, draft)
      : addItem(current, storeId, draft, makeId),
    itemId ? 'Item updated.' : 'Item added.',
  );
  closeDialog(elements.itemDialog);
});

elements.addStoreButton.addEventListener('click', () => openStoreDialog());
elements.cancelStoreButton.addEventListener('click', () => closeDialog(elements.storeDialog));
elements.cancelItemButton.addEventListener('click', () => closeDialog(elements.itemDialog));

elements.clearChecksButton.addEventListener('click', () => {
  if (!window.confirm('Clear every checked item? List edits stay intact.')) return;
  update(clearChecks, 'All checks cleared.');
});

elements.restoreDefaultsButton.addEventListener('click', () => {
  if (!window.confirm('Restore default supplied shopping list? Current edits will be replaced.')) return;
  state = createDefaultShoppingState();
  save();
  render();
  setStatus('Supplied shopping list restored.');
});

elements.copyListButton.addEventListener('click', async () => {
  const text = shoppingToText(state);
  if (await copyText(text)) setStatus('Shopping list copied.');
  else if (downloadText('GTA-Shopping-List.txt', text)) setStatus('Clipboard unavailable. Text file downloaded.');
  else setStatus('Copy unavailable in this browser.', true);
});

elements.exportShoppingButton.addEventListener('click', () => {
  const exported = `${JSON.stringify(state, null, 2)}\n`;
  if (downloadText('GTA-Shopping-List.json', exported, 'application/json')) setStatus('Shopping JSON exported.');
  else setStatus('Export unavailable in this browser.', true);
});

elements.importShoppingInput.addEventListener('change', async () => {
  const file = elements.importShoppingInput.files?.[0];
  elements.importShoppingInput.value = '';
  if (!file) return;
  try {
    const imported = validateShoppingState(JSON.parse(await file.text()));
    if (!window.confirm(`Replace shopping list with “${file.name}”?`)) return;
    state = imported;
    save();
    render();
    setStatus('Shopping JSON imported.');
  } catch (error) {
    setStatus(`Import rejected: ${error.message}`, true);
  }
});

if (!persistent) {
  elements.shoppingStorageNotice.dataset.mode = 'memory';
  elements.shoppingStorageNotice.textContent = 'Browser blocked local storage. Edits last only until this tab closes; export shopping JSON before leaving.';
}

render();
