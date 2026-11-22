-- 00-create-roles.sql
-- Initializes migrator (table owner) and app_api (runtime user with NOBYPASSRLS)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migrator') THEN
    CREATE ROLE migrator WITH LOGIN PASSWORD 'migrator_password' CREATEDB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_api') THEN
    CREATE ROLE app_api WITH LOGIN PASSWORD 'app_api_password' NOSUPERUSER NOCREATEDB NOBYPASSRLS;
  END IF;
END $$;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO migrator;
ALTER SCHEMA public OWNER TO migrator;
