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
    .setTitle('CRM API')
    .setDescription(
      [
        'Multi-tenant CRM system API.',
        '',
        'Demo credentials:',
        '- Admin: alice@acme.com / password123',
        '- Member: bob@acme.com / password123',
        '- Admin: carol@globex.com / password123',
        '- Member: dave@globex.com / password123',
        '',
        'Testing order:',
        '1. Use POST /auth/login with an admin account.',
        '2. Click Authorize and paste only the access token value.',
        '3. Use GET /customers to copy a real customer id from data[].id.',
        '4. Use GET /users to copy a real user id from id.',
        '5. Bob and Dave are seeded with 5 active customers, so assigning another customer to them demonstrates the max-5 concurrency rule.',
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
