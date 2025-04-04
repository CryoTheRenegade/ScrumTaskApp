from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-key-please-change')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///tasks.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# Models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    tasks = db.relationship('Task', backref='owner', lazy=True)
    shared_tasks = db.relationship('Task', secondary='task_sharing', backref=db.backref('shared_with', lazy='dynamic'))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    due_date = db.Column(db.DateTime)
    completed = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Association table for task sharing
task_sharing = db.Table('task_sharing',
    db.Column('task_id', db.Integer, db.ForeignKey('task.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True)
)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Routes
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        if User.query.filter_by(email=email).first():
            flash('Email already registered')
            return redirect(url_for('register'))
        
        user = User(email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('dashboard'))
        
        flash('Invalid email or password')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Get all tasks for the current user
    tasks = Task.query.filter_by(user_id=current_user.id).all()
    
    # Get tasks shared with the current user
    shared_tasks = current_user.shared_tasks
    
    # Get all users for sharing tasks
    users = User.query.filter(User.id != current_user.id).all()
    
    return render_template('dashboard.html', tasks=tasks, shared_tasks=shared_tasks, users=users)

# API Routes
@app.route('/api/tasks', methods=['GET', 'POST'])
@login_required
def api_tasks():
    if request.method == 'GET':
        tasks = Task.query.filter_by(user_id=current_user.id).all()
        shared_tasks = current_user.shared_tasks
        return jsonify({
            'tasks': [task.to_dict() for task in tasks],
            'shared_tasks': [task.to_dict() for task in shared_tasks]
        })
    
    elif request.method == 'POST':
        data = request.get_json()
        task = Task(
            title=data['title'],
            description=data.get('description', ''),
            due_date=datetime.fromisoformat(data['due_date']) if data.get('due_date') else None,
            user_id=current_user.id
        )
        db.session.add(task)
        
        # Handle task sharing
        if data.get('share_with'):
            shared_user = User.query.filter_by(email=data['share_with']).first()
            if shared_user:
                task.shared_with.append(shared_user)
        
        db.session.commit()
        return jsonify(task.to_dict())

@app.route('/api/tasks/<int:task_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def api_task(task_id):
    task = Task.query.get_or_404(task_id)
    
    # Check if user has permission
    if task.user_id != current_user.id and current_user not in task.shared_with:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if request.method == 'GET':
        return jsonify(task.to_dict())
    
    elif request.method == 'PUT':
        data = request.get_json()
        if 'title' in data:
            task.title = data['title']
        if 'description' in data:
            task.description = data['description']
        if 'due_date' in data:
            task.due_date = datetime.fromisoformat(data['due_date']) if data['due_date'] else None
        if 'completed' in data:
            task.completed = data['completed']
        
        db.session.commit()
        return jsonify(task.to_dict())
    
    elif request.method == 'DELETE':
        db.session.delete(task)
        db.session.commit()
        return jsonify({'message': 'Task deleted'})

# Add to_dict method to Task model
def task_to_dict(self):
    return {
        'id': self.id,
        'title': self.title,
        'description': self.description,
        'due_date': self.due_date.isoformat() if self.due_date else None,
        'completed': self.completed,
        'user_id': self.user_id,
        'created_at': self.created_at.isoformat(),
        'updated_at': self.updated_at.isoformat()
    }

Task.to_dict = task_to_dict

def init_db():
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")

if __name__ == '__main__':
    init_db()
    app.run(debug=True) 