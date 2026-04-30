import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from '../activity/activity-log.entity';
import { Customer } from '../customers/customer.entity';
import { Note } from '../notes/note.entity';
import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        return {
          type: 'postgres' as const,
          url: databaseUrl,
          host: databaseUrl ? undefined : config.get<string>('POSTGRES_HOST', 'localhost'),
          port: databaseUrl ? undefined : config.get<number>('POSTGRES_PORT', 5432),
          username: databaseUrl ? undefined : config.get<string>('POSTGRES_USER', 'crm_user'),
          password: databaseUrl ? undefined : config.get<string>('POSTGRES_PASSWORD', 'crm_password'),
          database: databaseUrl ? undefined : config.get<string>('POSTGRES_DB', 'crm_db'),
          entities: [Organization, User, Customer, Note, ActivityLog],
          migrations: ['dist/database/migrations/*.js'],
          synchronize: false,
          ssl:
            config.get<string>('NODE_ENV') === 'production'
              ? { rejectUnauthorized: false }
              : false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}

