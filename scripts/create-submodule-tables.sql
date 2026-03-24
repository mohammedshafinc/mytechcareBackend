-- Submodules catalog table
CREATE TABLE IF NOT EXISTS submodules (
    id            SERIAL PRIMARY KEY,
    code          VARCHAR(50) NOT NULL UNIQUE,
    name          VARCHAR(255),
    module_code   VARCHAR(50) NOT NULL REFERENCES modules(code),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submodules_module_code ON submodules(module_code);

-- Per-user submodule assignments (admin users only)
CREATE TABLE IF NOT EXISTS user_submodules (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    submodule_code  VARCHAR(50) NOT NULL REFERENCES submodules(code),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_submodule UNIQUE (user_id, submodule_code)
);

CREATE INDEX IF NOT EXISTS idx_user_submodules_user_id ON user_submodules(user_id);
