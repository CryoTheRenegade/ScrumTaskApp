const CACHE_NAME = 'task-manager-v1';
const urlsToCache = [
    '/',
    '/static/css/style.css',
    '/static/js/dashboard.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://code.jquery.com/jquery-3.6.0.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('sync', event => {
    if (event.tag === 'sync-tasks') {
        event.waitUntil(syncTasks());
    }
});

function syncTasks() {
    return new Promise((resolve, reject) => {
        // Open IndexedDB
        const request = indexedDB.open('TaskManagerDB', 1);
        
        request.onerror = () => {
            console.error('Error opening IndexedDB');
            reject();
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            
            // Get all tasks from IndexedDB
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => {
                const tasks = getAllRequest.result;
                
                // Sync each task with the server
                Promise.all(tasks.map(task => {
                    return fetch('/api/tasks', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(task)
                    })
                    .then(response => {
                        if (response.ok) {
                            // Delete the task from IndexedDB after successful sync
                            store.delete(task.id);
                        }
                    });
                }))
                .then(() => {
                    console.log('Tasks synced successfully');
                    resolve();
                })
                .catch(error => {
                    console.error('Error syncing tasks:', error);
                    reject();
                });
            };
        };
    });
} 