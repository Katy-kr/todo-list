const todos = [];

function addTodo(task) {
  todos.push({ id: Date.now(), task, done: false });
  console.log(`Added: "${task}"`);
}

function completeTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.done = true;
    console.log(`Completed: "${todo.task}"`);
  }
}

function deleteTodo(id) {
  const index = todos.findIndex(t => t.id === id);
  if (index !== -1) {
    console.log(`Deleted: "${todos[index].task}"`);
    todos.splice(index, 1);
  }
}

function listTodos() {
  if (todos.length === 0) {
    console.log('No todos yet.');
    return;
  }
  todos.forEach(t => {
    console.log(`[${t.done ? 'x' : ' '}] (${t.id}) ${t.task}`);
  });
}

// Example usage
addTodo('Buy groceries');
addTodo('Write code');
addTodo('Read a book');
listTodos();
