'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let todos = [];
let filter = 'all';
let nextId = 1;

const STORAGE_KEY = 'todo-app-data';

// ── Persistence ────────────────────────────────────────────────────────────
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ todos, nextId }));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    todos = data.todos || [];
    nextId = data.nextId || todos.length + 1;
  } catch {
    todos = [];
    nextId = 1;
  }
}

// ── DOM refs ───────────────────────────────────────────────────────────────
const todoInput    = document.getElementById('todoInput');
const prioritySel  = document.getElementById('prioritySelect');
const addBtn       = document.getElementById('addBtn');
const todoList     = document.getElementById('todoList');
const filterBtns   = document.querySelectorAll('.filter-btn');
const clearBtn     = document.getElementById('clearBtn');
const countEl      = document.getElementById('count');
const emptyState   = document.getElementById('emptyState');
const themeToggle  = document.getElementById('themeToggle');

// ── Theme ──────────────────────────────────────────────────────────────────
const THEME_KEY = 'todo-theme';

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeToggle.textContent = dark ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    applyTheme(saved === 'dark');
  } else {
    applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
}

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(!isDark);
});

// ── Todo CRUD ──────────────────────────────────────────────────────────────
function addTodo() {
  const text = todoInput.value.trim();
  if (!text) {
    todoInput.focus();
    todoInput.classList.add('shake');
    setTimeout(() => todoInput.classList.remove('shake'), 300);
    return;
  }

  todos.unshift({
    id: nextId++,
    text,
    done: false,
    priority: prioritySel.value,
    createdAt: Date.now(),
  });

  todoInput.value = '';
  prioritySel.value = 'normal';
  todoInput.focus();
  save();
  render();
}

function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.done = !todo.done;
    save();
    render();
  }
}

function deleteTodo(id) {
  const item = document.querySelector(`[data-id="${id}"]`);
  if (item) {
    item.classList.add('removing');
    item.addEventListener('animationend', () => {
      todos = todos.filter(t => t.id !== id);
      save();
      render();
    }, { once: true });
  }
}

function updateText(id, newText) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    const trimmed = newText.trim();
    if (trimmed) {
      todo.text = trimmed;
    }
    save();
    render();
  }
}

function clearCompleted() {
  todos = todos.filter(t => !t.done);
  save();
  render();
}

// ── Render ─────────────────────────────────────────────────────────────────
const PRIORITY_ORDER = { high: 0, normal: 1, low: 2 };

function getFiltered() {
  let list;
  switch (filter) {
    case 'active':    list = todos.filter(t => !t.done); break;
    case 'completed': list = todos.filter(t => t.done);  break;
    default:          list = todos;
  }
  return list.slice().sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

function render() {
  const visible = getFiltered();
  const activeCount = todos.filter(t => !t.done).length;
  const completedCount = todos.filter(t => t.done).length;

  // Count
  countEl.textContent = `${activeCount}개 남음`;

  // Clear button visibility
  clearBtn.style.visibility = completedCount > 0 ? 'visible' : 'hidden';

  // Empty state
  if (visible.length === 0) {
    todoList.innerHTML = '';
    emptyState.classList.add('visible');
    // Insert empty state into app, not outside
    todoList.parentNode.insertBefore(emptyState, todoList.nextSibling);
    emptyState.style.display = 'flex';
  } else {
    emptyState.classList.remove('visible');
    emptyState.style.display = 'none';
  }

  // Preserve focus and cursor if editing
  const activeEl = document.activeElement;
  const editingId = activeEl && activeEl.classList.contains('todo-text')
    ? Number(activeEl.closest('[data-id]')?.dataset.id)
    : null;

  // Diff render: only update items that changed
  const existing = new Map();
  todoList.querySelectorAll('[data-id]').forEach(el => {
    existing.set(Number(el.dataset.id), el);
  });

  const fragment = document.createDocumentFragment();
  visible.forEach(todo => {
    if (existing.has(todo.id) && todo.id !== editingId) {
      const el = existing.get(todo.id);
      updateItemEl(el, todo);
      fragment.appendChild(el);
      existing.delete(todo.id);
    } else if (todo.id === editingId) {
      const el = existing.get(todo.id) || createItemEl(todo);
      fragment.appendChild(el);
      existing.delete(todo.id);
    } else {
      fragment.appendChild(createItemEl(todo));
    }
  });

  // Remove stale items
  existing.forEach(el => el.remove());

  todoList.appendChild(fragment);
}

function createItemEl(todo) {
  const li = document.createElement('li');
  li.className = `todo-item${todo.done ? ' done' : ''}`;
  li.dataset.id = todo.id;

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'todo-check';
  check.checked = todo.done;
  check.addEventListener('change', () => toggleTodo(todo.id));

  const dot = document.createElement('span');
  dot.className = `priority-dot ${todo.priority}`;

  const text = document.createElement('span');
  text.className = 'todo-text';
  text.textContent = todo.text;
  text.setAttribute('title', '더블클릭하여 편집');

  // Inline edit on double-click
  text.addEventListener('dblclick', () => startEdit(text, todo.id));

  const del = document.createElement('button');
  del.className = 'delete-btn';
  del.innerHTML = '✕';
  del.setAttribute('aria-label', '삭제');
  del.addEventListener('click', () => deleteTodo(todo.id));

  li.append(check, dot, text, del);
  return li;
}

function updateItemEl(el, todo) {
  el.className = `todo-item${todo.done ? ' done' : ''}`;
  const check = el.querySelector('.todo-check');
  const dot = el.querySelector('.priority-dot');
  const text = el.querySelector('.todo-text');
  check.checked = todo.done;
  dot.className = `priority-dot ${todo.priority}`;
  if (text.getAttribute('contenteditable') !== 'true') {
    text.textContent = todo.text;
  }
}

function startEdit(textEl, id) {
  textEl.setAttribute('contenteditable', 'true');
  textEl.focus();

  // Place cursor at end
  const range = document.createRange();
  range.selectNodeContents(textEl);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  function commitEdit() {
    textEl.removeAttribute('contenteditable');
    const newText = textEl.textContent;
    updateText(id, newText);
  }

  textEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      textEl.blur();
    }
    if (e.key === 'Escape') {
      // Restore original
      const todo = todos.find(t => t.id === id);
      if (todo) textEl.textContent = todo.text;
      textEl.removeAttribute('contenteditable');
      textEl.blur();
    }
  }, { once: false });

  textEl.addEventListener('blur', commitEdit, { once: true });
}

// ── Filter ─────────────────────────────────────────────────────────────────
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.filter;
    render();
  });
});

// ── Events ─────────────────────────────────────────────────────────────────
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTodo();
});

clearBtn.addEventListener('click', clearCompleted);

// ── Shake animation (CSS) ──────────────────────────────────────────────────
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%      { transform: translateX(-6px); }
  40%      { transform: translateX(6px); }
  60%      { transform: translateX(-4px); }
  80%      { transform: translateX(4px); }
}
.shake { animation: shake 0.3s ease; border-color: var(--danger) !important; }
`;
document.head.appendChild(shakeStyle);

// ── Init ───────────────────────────────────────────────────────────────────
initTheme();
load();
render();
todoInput.focus();
