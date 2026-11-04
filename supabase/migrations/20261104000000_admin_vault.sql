-- ============================================================
-- Admin Personal Vault
-- A secure personal storage area for each admin/teacher where they
-- can keep passwords, links, notes, API keys and general secrets,
-- protected by a PIN.  Secret values are encrypted in the browser
-- with a PIN-derived key; only opaque ciphertext is stored here.
-- ============================================================

-- Per-user PIN record.  `pin_hash` is a salted SHA-256 hash of the
-- PIN (used to verify the unlock screen).  `key_salt` is the salt
-- used by PBKDF2 to re-derive the AES-GCM key that encrypts values.
CREATE TABLE IF NOT EXISTS admin_vault_pins (
    user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    pin_hash   TEXT NOT NULL,
    pin_salt   TEXT NOT NULL,
    key_salt   TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vault items.  `value` and `entries` hold encrypted JSON blobs.
--   - For simple categories (Note / API Key / General) we store one
--     encrypted value in `value_enc`.
--   - For Password / Link we store an array of entries
--     (product name + value + note) in `entries_enc`.
CREATE TABLE IF NOT EXISTS admin_vault_items (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category    TEXT NOT NULL DEFAULT 'General',
    label       TEXT NOT NULL,
    note        TEXT,
    value_enc   JSONB,
    entries_enc JSONB,
    is_pinned   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_vault_items_user_idx ON admin_vault_items(user_id, created_at DESC);

ALTER TABLE admin_vault_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_vault_items ENABLE ROW LEVEL SECURITY;

-- A user can only read / write their own PIN and their own vault items.
DROP POLICY IF EXISTS "Vault pins are owned by user." ON admin_vault_pins;
CREATE POLICY "Vault pins are owned by user." ON admin_vault_pins
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Vault items are owned by user." ON admin_vault_items;
CREATE POLICY "Vault items are owned by user." ON admin_vault_items
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
