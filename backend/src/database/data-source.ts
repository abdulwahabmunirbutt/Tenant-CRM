import 'reflect-metadata';
import { join } from 'path';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { ActivityLog } from '../activity/activity-log.entity';
import { Customer } from '../customers/customer.entity';
import { Note } from '../notes/note.entity';
import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';

config({ path: '../.env' });
config();

const databaseUrl = process.env.DATABASE_URL;

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  host: databaseUrl ? undefined : process.env.POSTGRES_HOST ?? 'localhost',
  port: databaseUrl ? undefined : Number(process.env.POSTGRES_PORT ?? 5432),
  username: databaseUrl ? undefined : process.env.POSTGRES_USER ?? 'crm_user',
  password: databaseUrl ? undefined : process.env.POSTGRES_PASSWORD ?? 'crm_password',
  database: databaseUrl ? undefined : process.env.POSTGRES_DB ?? 'crm_db',
  entities: [Organization, User, Customer, Note, ActivityLog],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  synchronize: false,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
