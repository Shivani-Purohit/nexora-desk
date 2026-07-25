/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Supertest response bodies are typed as any. */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type RegistrationResponse = {
  user: {
    id: string;
    email: string;
    memberships: Array<{
      role: string;
      organization: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
  };
  accessToken: string;
};

describe('Tickets API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let organizationId: string;
  let userId: string;

  const uniqueValue = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  const email = `ticket-e2e-${uniqueValue}@nexora.test`;
  const organizationSlug = `ticket-e2e-${uniqueValue}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);

    const registrationResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'NexoraDesk!2026',
        firstName: 'Ticket',
        lastName: 'Tester',
        organizationName: 'Ticket E2E Organization',
        organizationSlug,
      })
      .expect(201);

    const registration =
      registrationResponse.body as RegistrationResponse;

    accessToken = registration.accessToken;
    userId = registration.user.id;
    organizationId =
      registration.user.memberships[0].organization.id;
  });

  afterAll(async () => {
    if (organizationId) {
      await prisma.ticket.deleteMany({
        where: {
          organizationId,
        },
      });

      await prisma.ticketCounter.deleteMany({
        where: {
          organizationId,
        },
      });

      await prisma.membership.deleteMany({
        where: {
          organizationId,
        },
      });

      await prisma.organization.deleteMany({
        where: {
          id: organizationId,
        },
      });
    }

    if (userId) {
      await prisma.user.deleteMany({
        where: {
          id: userId,
        },
      });
    }

    await app.close();
  });

  it('rejects ticket access without authentication', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/tickets`)
      .expect(401);
  });

  it('rejects an invalid ticket request', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/tickets`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subject: 'No',
        unexpectedField: true,
      })
      .expect(400);
  });

  it('creates, lists, retrieves, and resolves a ticket', async () => {
    const createResponse = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/tickets`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subject: '  BAS-IP mobile calling issue  ',
        description:
          '  Mobile application is not receiving calls.  ',
        priority: 'HIGH',
        source: 'MANUAL',
        category: 'TROUBLESHOOTING',
        requesterName: '  Test Client  ',
        requesterEmail: 'CLIENT@EXAMPLE.COM',
        requesterPhone: '+919876543210',
      })
      .expect(201);

    expect(createResponse.body).toEqual(
      expect.objectContaining({
        organizationId,
        number: 1,
        subject: 'BAS-IP mobile calling issue',
        description:
          'Mobile application is not receiving calls.',
        status: 'OPEN',
        priority: 'HIGH',
        source: 'MANUAL',
        category: 'TROUBLESHOOTING',
        requesterName: 'Test Client',
        requesterEmail: 'client@example.com',
        requesterPhone: '+919876543210',
        createdById: userId,
      }),
    );

    const listResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/organizations/${organizationId}/tickets`,
      )
      .query({
        status: 'OPEN',
        priority: 'HIGH',
        search: 'mobile',
        page: 1,
        limit: 10,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listResponse.body).toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            number: 1,
            subject: 'BAS-IP mobile calling issue',
          }),
        ]),
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      }),
    );

    const getResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/organizations/${organizationId}/tickets/1`,
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getResponse.body).toEqual(
      expect.objectContaining({
        number: 1,
        organizationId,
        subject: 'BAS-IP mobile calling issue',
      }),
    );

    const updateResponse = await request(app.getHttpServer())
      .patch(
        `/api/v1/organizations/${organizationId}/tickets/1`,
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        status: 'RESOLVED',
      })
      .expect(200);

    expect(updateResponse.body).toEqual(
      expect.objectContaining({
        number: 1,
        status: 'RESOLVED',
        resolvedAt: expect.any(String),
        closedAt: null,
      }),
    );
  });

  it('returns 404 for an unknown ticket number', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/tickets/999`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(response.body).toEqual(
      expect.objectContaining({
        message: 'Ticket not found',
        statusCode: 404,
        path: `/api/v1/organizations/${organizationId}/tickets/999`,
        timestamp: expect.any(String),
      }),
    );
  });
});
