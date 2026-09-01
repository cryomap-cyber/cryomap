import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    const httpServer = app.getHttpServer() as Server;

    return request(httpServer)
      .get('/')
      .expect(200)
      .expect('CryoMap API is running! Database connected. App settings: 0');
  });

  afterEach(async () => {
    await app.close();
  });
});
