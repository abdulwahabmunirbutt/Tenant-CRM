import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantIntegrityAndQueryIndexes1700000000002 implements MigrationInterface {
  name = 'AddTenantIntegrityAndQueryIndexes1700000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE users ADD CONSTRAINT uq_users_id_org UNIQUE (id, organization_id)');
    await queryRunner.query('ALTER TABLE customers ADD CONSTRAINT uq_customers_id_org UNIQUE (id, organization_id)');

    await queryRunner.query('ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_assigned_to_fkey');
    await queryRunner.query('ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_customer_id_fkey');
    await queryRunner.query('ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_created_by_fkey');
    await queryRunner.query('ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_performed_by_fkey');

    await queryRunner.query(`
      ALTER TABLE customers
      ADD CONSTRAINT fk_customers_assigned_user_same_org
      FOREIGN KEY (assigned_to, organization_id)
      REFERENCES users(id, organization_id)
      ON DELETE SET NULL (assigned_to)
    `);

    await queryRunner.query(`
      ALTER TABLE notes
      ADD CONSTRAINT fk_notes_customer_same_org
      FOREIGN KEY (customer_id, organization_id)
      REFERENCES customers(id, organization_id)
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE notes
      ADD CONSTRAINT fk_notes_created_by_same_org
      FOREIGN KEY (created_by, organization_id)
      REFERENCES users(id, organization_id)
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE activity_logs
      ADD CONSTRAINT fk_activity_performed_by_same_org
      FOREIGN KEY (performed_by, organization_id)
      REFERENCES users(id, organization_id)
      ON DELETE RESTRICT
    `);

    await queryRunner.query('DROP INDEX IF EXISTS idx_customers_org_deleted');
    await queryRunner.query('DROP INDEX IF EXISTS idx_customers_assigned_active');

    await queryRunner.query(`
      CREATE INDEX idx_customers_org_active_created
      ON customers (organization_id, created_at DESC, id DESC)
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_customers_assignment_limit_active
      ON customers (organization_id, assigned_to)
      WHERE deleted_at IS NULL AND assigned_to IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_notes_org_customer_created
      ON notes (organization_id, customer_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_activity_org_entity
      ON activity_logs (organization_id, entity_type, entity_id, timestamp DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_activity_org_entity');
    await queryRunner.query('DROP INDEX IF EXISTS idx_notes_org_customer_created');
    await queryRunner.query('DROP INDEX IF EXISTS idx_customers_assignment_limit_active');
    await queryRunner.query('DROP INDEX IF EXISTS idx_customers_org_active_created');

    await queryRunner.query('ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS fk_activity_performed_by_same_org');
    await queryRunner.query('ALTER TABLE notes DROP CONSTRAINT IF EXISTS fk_notes_created_by_same_org');
    await queryRunner.query('ALTER TABLE notes DROP CONSTRAINT IF EXISTS fk_notes_customer_same_org');
    await queryRunner.query('ALTER TABLE customers DROP CONSTRAINT IF EXISTS fk_customers_assigned_user_same_org');

    await queryRunner.query(`
      ALTER TABLE customers
      ADD CONSTRAINT customers_assigned_to_fkey
      FOREIGN KEY (assigned_to)
      REFERENCES users(id)
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE notes
      ADD CONSTRAINT notes_customer_id_fkey
      FOREIGN KEY (customer_id)
      REFERENCES customers(id)
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE notes
      ADD CONSTRAINT notes_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES users(id)
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE activity_logs
      ADD CONSTRAINT activity_logs_performed_by_fkey
      FOREIGN KEY (performed_by)
      REFERENCES users(id)
      ON DELETE RESTRICT
    `);

    await queryRunner.query('ALTER TABLE customers DROP CONSTRAINT IF EXISTS uq_customers_id_org');
    await queryRunner.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_id_org');

    await queryRunner.query('CREATE INDEX idx_customers_org_deleted ON customers (organization_id, deleted_at)');
    await queryRunner.query(`
      CREATE INDEX idx_customers_assigned_active
      ON customers (assigned_to, deleted_at)
      WHERE deleted_at IS NULL
    `);
  }
}
