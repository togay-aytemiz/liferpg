-- Migration: 008_add_hp
-- Description: Add HP (Health Points) and Max HP to profiles table.

alter table public.profiles
  add column hp integer not null default 100,
  add column max_hp integer not null default 100;
