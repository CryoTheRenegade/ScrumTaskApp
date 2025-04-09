# Task Manager

A Flask-based task management application with user authentication, task sharing, and offline support.

## Features

- User authentication (register, login, logout)
- Create, update, and delete tasks
- Set due dates for tasks
- Share tasks with other users
- Offline support with automatic sync
- Modern and responsive UI

## Setup

1. Create a virtual environment:
```powershell
py -3.11 -m venv .venv
```
Or if python is between 3.8 and 3.11 for your default environment:
```bash
python -m venv .venv
```

2. Activate the virtual environment:
- Windows:
```powershell
.\venv\Scripts\activate
```
- Linux/MacOS:
```bash
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the project root with the following variables:
```
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-secret-key(please_change)
DATABASE_URL=sqlite:///tasks.db
```

5. Run the application:
```bash
python app.py
```

The application will be available at `http://localhost:5000`.

## Project Structure

```
task-manager/
├── app.py              # Main application file
├── requirements.txt    # Python dependencies
├── .env               # Environment variables
├── static/            # Static files
│   ├── css/
│   │   └── style.css  # Custom styles
│   ├── js/
│   │   └── dashboard.js # Dashboard JavaScript
│   └── sw.js          # Service worker
└── templates/         # HTML templates
    ├── base.html      # Base template
    ├── index.html     # Home page
    ├── login.html     # Login page
    ├── register.html  # Registration page
    └── dashboard.html # Dashboard page
```

## Technologies Used

- Flask (Python web framework)
- SQLAlchemy (ORM)
- Flask-Login (User authentication)
- Bootstrap 5 (UI framework)
- Service Workers (Offline support)
- IndexedDB (Client-side storage)
