-- The owner role.
--
-- Until now the highest role was 'admin', which every moderator holds. The
-- person who owns the platform is not one moderator among several, and the
-- distinction matters the first time there is more than one of them: an admin
-- can be added and removed, an owner is who the thing belongs to.
--
-- Adding a value to an enum cannot happen in the same transaction that first
-- uses it, so this file only adds the value. Everything that acts on it is in
-- 0007, which runs as its own transaction.
--
-- On a project created after this was written the value already exists, having
-- come from 0001, and this is a no-op.

alter type user_role add value if not exists 'owner';
