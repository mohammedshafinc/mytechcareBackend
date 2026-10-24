-- Telecom module and its submodules (definitions only, features come later).
-- Idempotent: safe to re-apply.
INSERT INTO modules(code,name,created_at) VALUES
('TELECOM','Telecom','1970-01-01T00:00:00.000Z')
ON CONFLICT(code) DO UPDATE SET name=excluded.name;
INSERT INTO submodules(code,name,module_code,created_at) VALUES
('TELECOM_SALES','Sales','TELECOM','1970-01-01T00:00:00.000Z'),
('TELECOM_SERVICE','Service','TELECOM','1970-01-01T00:00:00.000Z'),
('TELECOM_SIM_RECHARGE','SIM & Recharge','TELECOM','1970-01-01T00:00:00.000Z'),
('TELECOM_ACCOUNTS','Accounts','TELECOM','1970-01-01T00:00:00.000Z'),
('TELECOM_REPORTS','Reports','TELECOM','1970-01-01T00:00:00.000Z')
ON CONFLICT(code) DO UPDATE SET name=excluded.name,module_code=excluded.module_code;
