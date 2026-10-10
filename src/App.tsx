import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock3,
  Filter,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

type Priority = 'low' | 'medium' | 'high';
type Status = 'pending' | 'completed';
type FilterValue = 'all' | Status;

type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  due_date: string | null;
  priority: Priority;
  category: string;
  status: Status;
  created_at: string;
  updated_at: string;
};

type TaskForm = {
  title: string;
  description: string;
  due_date: string;
  priority: Priority;
  category: string;
};

const emptyForm: TaskForm = {
  title: '',
  description: '',
  due_date: '',
  priority: 'medium',
  category: 'Personal',
};

const categories = ['Personal', 'Work', 'Study', 'Health'];

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function handleAuth(email: string, password: string, name: string) {
    setAuthError('');
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name.trim() } },
      });
      if (error) setAuthError(error.message);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError('Those details do not match. Please try again.');
  }

  if (authLoading) return <LoadingScreen />;
  if (!session) {
    return (
      <AuthScreen
        mode={authMode}
        error={authError}
        onSubmit={handleAuth}
        onModeChange={(mode) => {
          setAuthMode(mode);
          setAuthError('');
        }}
      />
    );
  }

  return <Dashboard session={session} />;
}

function LoadingScreen() {
  return <div className="loading-screen"><div className="loader-mark"><ClipboardCheck size={24} /></div><span>Loading your workspace</span></div>;
}

function AuthScreen({
  mode,
  error,
  onSubmit,
  onModeChange,
}: {
  mode: 'signin' | 'signup';
  error: string;
  onSubmit: (email: string, password: string, name: string) => void;
  onModeChange: (mode: 'signin' | 'signup') => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(email, password, name);
  }

  return (
    <main className="auth-layout">
      <section className="auth-visual">
        <div className="brand brand-light"><span className="brand-icon"><Check size={17} strokeWidth={3} /></span> Taskly</div>
        <div className="visual-copy">
          <span className="eyebrow"><Sparkles size={14} /> A clearer way to work</span>
          <h1>Make space for what <em>matters.</em></h1>
          <p>Bring your tasks, priorities, and progress together in one calm, focused workspace.</p>
        </div>
        <div className="quote-card"><div className="quote-mark">“</div><p>Small steps every day add up to big results.</p><span>Your personal productivity companion</span></div>
        <div className="visual-orb orb-one" /><div className="visual-orb orb-two" />
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="brand brand-dark"><span className="brand-icon"><Check size={17} strokeWidth={3} /></span> Taskly</div>
          <div className="auth-heading"><span className="eyebrow">{mode === 'signin' ? 'Welcome back' : 'Start your journey'}</span><h2>{mode === 'signin' ? 'Good to see you.' : 'Create your workspace.'}</h2><p>{mode === 'signin' ? 'Enter your details to pick up where you left off.' : 'A simple place to plan, track, and finish your day.'}</p></div>
          <form className="auth-form" onSubmit={submit}>
            {mode === 'signup' && <label>Full name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="How should we call you?" /></label>}
            <label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-button wide" type="submit">{mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></button>
          </form>
          <p className="auth-switch">{mode === 'signin' ? 'New to Taskly?' : 'Already have an account?'} <button onClick={() => onModeChange(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Create an account' : 'Sign in instead'}</button></p>
        </div>
      </section>
    </main>
  );
}

function Dashboard({ session }: { session: Session }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    async function loadTasks() {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (error) setActionError('We could not load your tasks. Please refresh and try again.');
      else setTasks((data ?? []) as Task[]);
      setLoading(false);
    }
    loadTasks();
  }, []);

  const completed = tasks.filter((task) => task.status === 'completed').length;
  const pending = tasks.length - completed;
  const today = new Date().toISOString().slice(0, 10);
  const dueToday = tasks.filter((task) => task.due_date === today && task.status === 'pending').length;
  const displayName = session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'there';
  const firstName = displayName.split(' ')[0];

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const matchesFilter = filter === 'all' || task.status === filter;
    const searchText = `${task.title} ${task.description} ${task.category}`.toLowerCase();
    return matchesFilter && searchText.includes(search.toLowerCase());
  }), [tasks, filter, search]);

  async function saveTask(form: TaskForm) {
    setActionError('');
    if (editingTask) {
      const { data, error } = await supabase.from('tasks').update({ ...form, due_date: form.due_date || null, updated_at: new Date().toISOString() }).eq('id', editingTask.id).select().maybeSingle();
      if (error || !data) setActionError('That task could not be updated.');
      else setTasks((current) => current.map((task) => task.id === editingTask.id ? data as Task : task));
    } else {
      const { data, error } = await supabase.from('tasks').insert({ ...form, due_date: form.due_date || null }).select().maybeSingle();
      if (error || !data) setActionError('That task could not be created.');
      else setTasks((current) => [data as Task, ...current]);
    }
    setEditingTask(null);
    setShowModal(false);
  }

  async function toggleTask(task: Task) {
    const nextStatus: Status = task.status === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase.from('tasks').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', task.id);
    if (error) setActionError('The task status could not be changed.');
    else setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: nextStatus } : item));
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) setActionError('The task could not be removed.');
    else setTasks((current) => current.filter((task) => task.id !== id));
  }

  async function signOut() { await supabase.auth.signOut(); }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand brand-dark"><span className="brand-icon"><Check size={17} strokeWidth={3} /></span> Taskly</div>
        <nav><span className="nav-label">Workspace</span><button className="nav-item active"><LayoutDashboard size={18} /> Overview</button><button className="nav-item"><CalendarDays size={18} /> Calendar <span className="nav-soon">Soon</span></button><button className="nav-item"><Target size={18} /> Goals <span className="nav-soon">Soon</span></button></nav>
        <div className="sidebar-bottom"><div className="tip-card"><Sparkles size={17} /><strong>Stay focused</strong><p>Finish one important task before adding another.</p></div><button className="signout-button" onClick={signOut}><LogOut size={17} /> Sign out</button></div>
      </aside>
      {mobileNav && <button className="mobile-overlay" onClick={() => setMobileNav(false)} aria-label="Close menu" />}
      <main className="main-content">
        <header className="topbar"><button className="menu-button" onClick={() => setMobileNav(true)}><Menu size={21} /></button><div className="breadcrumb"><span>Workspace</span><span>/</span><strong>Overview</strong></div><div className="topbar-user"><div className="avatar">{firstName.charAt(0).toUpperCase()}</div><div><strong>{displayName}</strong><span>{session.user.email}</span></div></div></header>
        <div className="content-wrap">
          <section className="welcome-row"><div><span className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span><h1>Good morning, {firstName} <span className="wave">✦</span></h1><p>Here’s a quick look at your day.</p></div><button className="primary-button" onClick={() => { setEditingTask(null); setShowModal(true); }}><Plus size={18} /> New task</button></section>
          {actionError && <div className="action-error">{actionError}<button onClick={() => setActionError('')}><X size={15} /></button></div>}
          <section className="stats-grid"><StatCard icon={<ClipboardCheck size={19} />} label="Total tasks" value={tasks.length} tone="blue" /><StatCard icon={<Clock3 size={19} />} label="In progress" value={pending} tone="amber" /><StatCard icon={<CheckCircle2 size={19} />} label="Completed" value={completed} tone="green" /><StatCard icon={<CalendarDays size={19} />} label="Due today" value={dueToday} tone="rose" /></section>
          <section className="progress-card"><div><span className="eyebrow">Your momentum</span><h2>{tasks.length ? `${Math.round((completed / tasks.length) * 100)}% complete` : 'A fresh start'}</h2><p>{tasks.length ? completed === tasks.length ? 'Everything is checked off. Beautiful work.' : `${pending} ${pending === 1 ? 'task' : 'tasks'} left to keep the momentum going.` : 'Add your first task and make today count.'}</p></div><div className="progress-ring" style={{ '--progress': `${tasks.length ? (completed / tasks.length) * 100 : 0}%` } as React.CSSProperties}><strong>{tasks.length ? Math.round((completed / tasks.length) * 100) : 0}<small>%</small></strong></div></section>
          <section className="tasks-section"><div className="section-heading"><div><h2>My tasks</h2><p>Keep your day moving forward.</p></div><button className="more-button"><MoreHorizontal size={20} /></button></div><div className="task-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks..." /></div><div className="filter-tabs"><Filter size={16} /><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All <span>{tasks.length}</span></button><button className={filter === 'pending' ? 'selected' : ''} onClick={() => setFilter('pending')}>Open <span>{pending}</span></button><button className={filter === 'completed' ? 'selected' : ''} onClick={() => setFilter('completed')}>Done <span>{completed}</span></button></div></div>{loading ? <div className="empty-state"><div className="loading-dots"><i /><i /><i /></div><p>Gathering your tasks...</p></div> : visibleTasks.length ? <div className="task-list">{visibleTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onEdit={(item) => { setEditingTask(item); setShowModal(true); }} onDelete={deleteTask} />)}</div> : <EmptyState hasTasks={tasks.length > 0} onAdd={() => { setEditingTask(null); setShowModal(true); }} />}</section>
        </div>
      </main>
      {showModal && <TaskModal task={editingTask} onClose={() => { setShowModal(false); setEditingTask(null); }} onSave={saveTask} />}
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>; }

function TaskRow({ task, onToggle, onEdit, onDelete }: { task: Task; onToggle: (task: Task) => void; onEdit: (task: Task) => void; onDelete: (id: string) => void }) {
  const dueLabel = task.due_date ? new Date(`${task.due_date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date';
  return <article className={`task-row ${task.status === 'completed' ? 'task-done' : ''}`}><button className="check-button" onClick={() => onToggle(task)} aria-label={task.status === 'completed' ? 'Mark as open' : 'Mark as complete'}>{task.status === 'completed' ? <Check size={15} /> : <Circle size={19} />}</button><div className="task-main"><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}<div className="task-meta"><span className={`priority-dot ${task.priority}`} /> <span className={`priority-label ${task.priority}`}>{task.priority}</span><span className="meta-divider" /><span>{task.category}</span><span className="meta-divider" /><CalendarDays size={13} /><span>{dueLabel}</span></div></div><div className="task-actions"><button onClick={() => onEdit(task)}>Edit</button><button onClick={() => onDelete(task.id)} aria-label="Delete task"><Trash2 size={16} /></button></div></article>;
}

function EmptyState({ hasTasks, onAdd }: { hasTasks: boolean; onAdd: () => void }) { return <div className="empty-state"><div className="empty-icon">{hasTasks ? <Search size={23} /> : <CheckCircle2 size={23} />}</div><h3>{hasTasks ? 'No tasks found' : 'Your list is ready'}</h3><p>{hasTasks ? 'Try a different search or filter.' : 'Add a task to turn your plans into progress.'}</p>{!hasTasks && <button className="secondary-button" onClick={onAdd}><Plus size={16} /> Add first task</button>}</div>; }

function TaskModal({ task, onClose, onSave }: { task: Task | null; onClose: () => void; onSave: (form: TaskForm) => void }) {
  const [form, setForm] = useState<TaskForm>(task ? { title: task.title, description: task.description, due_date: task.due_date ?? '', priority: task.priority, category: task.category } : emptyForm);
  function update<K extends keyof TaskForm>(key: K, value: TaskForm[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onSave(form); }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="task-modal"><div className="modal-heading"><div><span className="eyebrow">{task ? 'Refine your plan' : 'Make it happen'}</span><h2>{task ? 'Edit task' : 'New task'}</h2></div><button onClick={onClose} className="close-button"><X size={20} /></button></div><form onSubmit={submit}><label>Task title<input required autoFocus value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="What needs to be done?" /></label><label>Notes <span>Optional</span><textarea rows={3} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Add a little context..." /></label><div className="form-grid"><label>Due date <span>Optional</span><input type="date" value={form.due_date} onChange={(event) => update('due_date', event.target.value)} /></label><label>Category<select value={form.category} onChange={(event) => update('category', event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label></div><label>Priority</label><div className="priority-picker">{(['low', 'medium', 'high'] as Priority[]).map((priority) => <button type="button" key={priority} className={form.priority === priority ? `active ${priority}` : ''} onClick={() => update('priority', priority)}><span className={`priority-dot ${priority}`} /> {priority.charAt(0).toUpperCase() + priority.slice(1)}</button>)}</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">{task ? 'Save changes' : 'Add task'} <ArrowRight size={16} /></button></div></form></section></div>;
}

export default App;
