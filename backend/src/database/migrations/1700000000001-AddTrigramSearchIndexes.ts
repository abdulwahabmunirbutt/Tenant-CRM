import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrigramSearchIndexes1700000000001 implements MigrationInterface {
  name = 'AddTrigramSearchIndexes1700000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
    await queryRunner.query('DROP INDEX IF EXISTS idx_customers_org_search');
    await queryRunner.query(`
      CREATE INDEX idx_customers_name_trgm_active
      ON customers USING gin (name gin_trgm_ops)
      WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_customers_email_trgm_active
      ON customers USING gin (email gin_trgm_ops)
      WHERE deleted_at IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_customers_email_trgm_active');
    await queryRunner.query('DROP INDEX IF EXISTS idx_customers_name_trgm_active');
    await queryRunner.query(`
      CREATE INDEX idx_customers_org_search
      ON customers (organization_id, name, email)
      WHERE deleted_at IS NULL
    `);
  }
}

