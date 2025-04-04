document.addEventListener('DOMContentLoaded', function() {
    // Load tasks when page loads
    loadTasks();

    // Handle new task submission
    document.getElementById('saveTask').addEventListener('click', function() {
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const due_date = document.getElementById('due_date').value;
        const share_with = document.getElementById('share_with').value;

        fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                description: description,
                due_date: due_date,
                share_with: share_with
            })
        })
        .then(response => response.json())
        .then(task => {
            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
            modal.hide();
            document.getElementById('addTaskForm').reset();
            
            // Reload tasks
            loadTasks();
        })
        .catch(error => console.error('Error:', error));
    });

    // Handle task deletion
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-task')) {
            const taskId = e.target.dataset.taskId;
            if (confirm('Are you sure you want to delete this task?')) {
                fetch(`/api/tasks/${taskId}`, {
                    method: 'DELETE'
                })
                .then(response => {
                    if (response.ok) {
                        loadTasks();
                    }
                })
                .catch(error => console.error('Error:', error));
            }
        }
    });

    // Handle task editing
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('edit-task')) {
            const taskId = e.target.dataset.taskId;
            const taskCard = e.target.closest('.task-card');
            const title = taskCard.querySelector('.card-title').textContent;
            const description = taskCard.querySelector('.card-text').textContent;
            const dueDate = taskCard.querySelector('.due-date')?.textContent.replace('Due: ', '');

            // Fill edit modal with task data
            document.getElementById('edit_task_id').value = taskId;
            document.getElementById('edit_title').value = title;
            document.getElementById('edit_description').value = description;
            if (dueDate) {
                document.getElementById('edit_due_date').value = dueDate;
            }
        }
    });

    // Handle task update
    document.getElementById('updateTask').addEventListener('click', function() {
        const taskId = document.getElementById('edit_task_id').value;
        const title = document.getElementById('edit_title').value;
        const description = document.getElementById('edit_description').value;
        const due_date = document.getElementById('edit_due_date').value;

        fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                description: description,
                due_date: due_date
            })
        })
        .then(response => response.json())
        .then(task => {
            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('editTaskModal'));
            modal.hide();
            document.getElementById('editTaskForm').reset();
            
            // Reload tasks
            loadTasks();
        })
        .catch(error => console.error('Error:', error));
    });
});

function loadTasks() {
    fetch('/api/tasks')
        .then(response => response.json())
        .then(data => {
            // Update tasks container
            const tasksContainer = document.getElementById('tasks-container');
            tasksContainer.innerHTML = data.tasks.map(task => createTaskCard(task)).join('');

            // Update shared tasks container
            const sharedTasksContainer = document.getElementById('shared-tasks-container');
            sharedTasksContainer.innerHTML = data.shared_tasks.map(task => createSharedTaskCard(task)).join('');
        })
        .catch(error => console.error('Error:', error));
}

function createTaskCard(task) {
    return `
        <div class="card mb-3 task-card" data-task-id="${task.id}">
            <div class="card-body">
                <h5 class="card-title">${task.title}</h5>
                <p class="card-text">${task.description || ''}</p>
                ${task.due_date ? `<p class="due-date">Due: ${task.due_date.split('T')[0]}</p>` : ''}
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary edit-task" data-bs-toggle="modal" data-bs-target="#editTaskModal" data-task-id="${task.id}">Edit</button>
                    <button class="btn btn-sm btn-outline-danger delete-task" data-task-id="${task.id}">Delete</button>
                </div>
            </div>
        </div>
    `;
}

function createSharedTaskCard(task) {
    return `
        <div class="card mb-3 task-card" data-task-id="${task.id}">
            <div class="card-body">
                <h5 class="card-title">${task.title}</h5>
                <p class="card-text">${task.description || ''}</p>
                ${task.due_date ? `<p class="due-date">Due: ${task.due_date.split('T')[0]}</p>` : ''}
                <p class="text-muted">Shared by: ${task.owner.email}</p>
            </div>
        </div>
    `;
} 