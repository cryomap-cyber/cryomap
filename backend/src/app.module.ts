import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CompaniesModule } from './companies/companies.module.js';
import { EquipmentsModule } from './equipments/equipments.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    UsersModule,
    RoomsModule,
    EquipmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
