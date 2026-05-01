import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Multi-Tenant CRM API')
    .setDescription(
      [
        'Senior take-home API documentation for a minimal multi-tenant CRM built with NestJS, PostgreSQL, and TypeScript.',
        '',
        'Security model:',
        '- Authenticate with POST /auth/login.',
        '- Click Authorize and paste the accessToken value.',
        '- Tenant context comes from the JWT organizationId, never from client-provided organizationId fields.',
        '- Admin-only endpoints are marked [admin]. Shared read/workflow endpoints are marked [admin/member].',
        '',
        'Core requirements covered:',
        '- Users belong to exactly one organization.',
        '- Customers support pagination, search by name/email, assignment, soft delete, and restore.',
        '- Notes belong to both a customer and an organization and track createdBy.',
        '- Customer create/update/delete/restore/assign and note creation write activity logs internally.',
        '- Assignment is concurrency-safe and rejects assigning more than 5 active customers to one user.',
        '- Normal customer queries exclude soft-deleted rows; restore makes notes visible again.',
        '',
        'Demo credentials:',
        '- Admin: alice@acme.com / password123',
        '- Member: bob@acme.com / password123',
        '- Admin: carol@globex.com / password123',
        '- Member: dave@globex.com / password123',
        '',
        'Suggested Swagger test flow:',
        '1. Use POST /auth/login with an admin account.',
        '2. Click Authorize and paste only the access token value.',
        '3. Use GET /customers and GET /users to copy real IDs from the seeded database.',
        '4. Use POST /customers to create a customer, PATCH /customers/{id}/assign to test assignment, and POST /customers/{customerId}/notes to test notes.',
        '5. Bob and Dave are seeded with 5 active customers, so assigning another customer to either one demonstrates the max-5 rule with a 409 response.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

void bootstrap();
