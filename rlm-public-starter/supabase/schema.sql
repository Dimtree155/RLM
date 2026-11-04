-- RLM initial schema. Run in Supabase SQL Editor.
-- All exposed tables use RLS. Never put a service_role key in the browser.

create type public.app_role as enum ('owner','admin','moderator','member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24),
  display_name text not null default 'New player',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'member',
  created_at timestamptz not null default now()
);

create table public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references auth.users(id) on delete cascade,
  addressee uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  check (requester <> addressee),
  unique(requester, addressee)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key(conversation_id,user_id)
);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.player_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins bigint not null default 0 check (coins >= 0),
  xp bigint not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  updated_at timestamptz not null default now()
);

create table public.user_inventory (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_code text not null,
  purchased_at timestamptz not null default now(),
  unique(user_id,item_code)
);

create table public.game_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_code text not null,
  score bigint not null default 0 check (score >= 0),
  created_at timestamptz not null default now()
);

-- New accounts get a member role and empty stats. Role is NOT user-editable.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, username, display_name)
  values (
    new.id,
    'player_' || substr(replace(new.id::text,'-',''),1,12),
    coalesce(new.raw_user_meta_data->>'display_name','New player')
  );
  insert into public.user_roles(user_id,role) values(new.id,'member');
  insert into public.player_stats(user_id) values(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_conversation_member(cid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = cid and cm.user_id = (select auth.uid())
  );
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.friendships enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.player_stats enable row level security;
alter table public.user_inventory enable row level security;
alter table public.game_scores enable row level security;

create policy "Profiles visible to signed-in users" on public.profiles
for select to authenticated using (true);
create policy "Users update own safe profile fields" on public.profiles
for update to authenticated using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Users can read own role" on public.user_roles
for select to authenticated using (user_id = (select auth.uid()));
-- Intentionally no client insert/update/delete policies for user_roles.

create policy "Friendship participants can read" on public.friendships
for select to authenticated using (requester = (select auth.uid()) or addressee = (select auth.uid()));
create policy "Users can request friendships" on public.friendships
for insert to authenticated with check (requester = (select auth.uid()) and status = 'pending');
create policy "Recipient can respond" on public.friendships
for update to authenticated using (addressee = (select auth.uid()))
with check (addressee = (select auth.uid()) and status in ('accepted','blocked'));

create policy "Members can read conversations" on public.conversations
for select to authenticated using (public.is_conversation_member(id));
create policy "Members can read membership" on public.conversation_members
for select to authenticated using (user_id = (select auth.uid()) or public.is_conversation_member(conversation_id));
create policy "Users can read messages in their conversations" on public.messages
for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "Members can send messages" on public.messages
for insert to authenticated with check (
  sender_id = (select auth.uid())
  and public.is_conversation_member(conversation_id)
);

create policy "Read own player stats" on public.player_stats
for select to authenticated using (user_id = (select auth.uid()));
-- Intentionally no client write policies for coins or XP. Use trusted server functions.
create policy "Read own inventory" on public.user_inventory
for select to authenticated using (user_id = (select auth.uid()));
create policy "Read scores" on public.game_scores
for select to authenticated using (true);
create policy "Submit own scores" on public.game_scores
for insert to authenticated with check (user_id = (select auth.uid()));

-- IMPORTANT:
-- 1. Do not add client write policies for roles, coins, XP or inventory.
-- 2. Create conversations/memberships through a trusted server-side function
--    that verifies an accepted friendship and adds exactly the two participants.
-- 3. Add rate limits, reporting, blocking enforcement and moderation workflows
--    before opening private messaging to the public.
-- 4. Assign the first owner only after account creation, using SQL Editor as project owner:
--    update public.user_roles set role='owner'
--    where user_id = 'THE_AUTH_USER_UUID';
-- 5. Keep database backups and test every RLS policy before launch.
