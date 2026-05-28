-- Project avatar display (colour + initial) for logs and projects UI
alter table public.projects
  add column if not exists avatar_color text,
  add column if not exists avatar_initial text;

alter table public.projects
  drop constraint if exists projects_avatar_initial_len;

alter table public.projects
  add constraint projects_avatar_initial_len check (
    avatar_initial is null or char_length(avatar_initial) <= 1
  );
