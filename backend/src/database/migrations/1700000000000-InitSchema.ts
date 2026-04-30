import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.query(`CREATE TYPE user_role AS ENUM ('admin', 'member')`);

    await queryRunner.query(`
      CREATE TABLE organizations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name varchar NOT NULL,
        email varchar NOT NULL UNIQUE,
        password_hash varchar NOT NULL,
        role user_role NOT NULL DEFAULT 'member',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE customers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name varchar NOT NULL,
        email varchar NOT NULL,
        phone varchar NULL,
        assigned_to uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE notes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        content text NOT NULL,
        created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE activity_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        entity_type varchar NOT NULL,
        entity_id uuid NOT NULL,
        action varchar NOT NULL,
        performed_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        metadata jsonb NULL,
        timestamp timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query('CREATE INDEX idx_users_org ON users (organization_id)');
    await queryRunner.query('CREATE INDEX idx_customers_org_deleted ON customers (organization_id, deleted_at)');
    await queryRunner.query(`
      CREATE INDEX idx_customers_org_search
      ON customers (organization_id, name, email)
      WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_customers_assigned_active
      ON customers (assigned_to, deleted_at)
      WHERE deleted_at IS NULL
    `);
    await queryRunner.query('CREATE INDEX idx_notes_customer ON notes (customer_id)');
    await queryRunner.query('CREATE INDEX idx_activity_entity ON activity_logs (entity_type, entity_id)');
    await queryRunner.query('CREATE INDEX idx_activity_org ON activity_logs (organization_id, timestamp DESC)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_activity_org');
    await queryRunner.query('DROP INDEX IF EXISTS idx_activity_entity');
    await queryRunner.query('DROP INDEX IF EXISTS idx_notes_customer');
    await queryRunner.query('DROP INDEX IF EXISTS idx_customers_assigned_active');
    await queryRunner.query('DROP INDEX IF EXISTS idx_customers_org_search');
    await queryRunner.query('DROP INDEX IF EXISTS idx_customers_org_deleted');
    await queryRunner.query('DROP INDEX IF EXISTS idx_users_org');
    await queryRunner.query('DROP TABLE IF EXISTS activity_logs');
    await queryRunner.query('DROP TABLE IF EXISTS notes');
    await queryRunner.query('DROP TABLE IF EXISTS customers');
    await queryRunner.query('DROP TABLE IF EXISTS users');
    await queryRunner.query('DROP TABLE IF EXISTS organizations');
    await queryRunner.query('DROP TYPE IF EXISTS user_role');
  }
}

