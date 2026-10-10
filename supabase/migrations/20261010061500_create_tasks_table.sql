/*
# Create task management table

1. New Tables
- `tasks` stores each signed-in user's task records.
- `id` is the unique task identifier.
- `user_id` links each task to its authenticated owner and defaults automatically.
- `title` is the required task name.
- `description` stores optional task details.
- `due_date` stores an optional calendar date.
- `priority` stores low, medium, or high importance.
- `category` stores an optional label for grouping work.
- `status` stores pending or completed state.
- `created_at` and `updated_at` track task history.

2. Security
- Row Level Security is enabled on `tasks`.
- Separate authenticated CRUD policies restrict every operation to the owning user.

3. Important Notes
- No task can be read, changed, or removed by another signed-in user.
- The owner is filled by the database from the current authenticated session.
*/

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  description text NOT NULL DEFAULT '',
  due_date date,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category text NOT NULL DEFAULT 'Personal',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS tasks_user_id_status_idx ON public.tasks (user_id, status);
CREATE INDEX IF NOT EXISTS tasks_user_id_due_date_idx ON public.tasks (user_id, due_date);

DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
CREATE POLICY "Users can create their own tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
