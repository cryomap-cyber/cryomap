import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AttachmentsModule } from './attachments/attachments.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CompaniesModule } from './companies/companies.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { EquipmentTemperatureReadingsModule } from './equipment-temperature-readings/equipment-temperature-readings.module.js';
import { EquipmentsModule } from './equipments/equipments.module.js';
import { GoveeModule } from './govee/govee.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { SensorsModule } from './sensors/sensors.module.js';
import { ServiceProblemSuggestionsModule } from './service-problem-suggestions/service-problem-suggestions.module.js';
import { ServiceRecordsModule } from './service-records/service-records.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { TemperatureReadingsModule } from './temperature-readings/temperature-readings.module.js';
import { ThermalAlertsModule } from './thermal-alerts/thermal-alerts.module.js';
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
    SensorsModule,
    TemperatureReadingsModule,
    EquipmentTemperatureReadingsModule,
    TasksModule,
    ServiceRecordsModule,
    ServiceProblemSuggestionsModule,
    AttachmentsModule,
    DashboardModule,
    ThermalAlertsModule,
    ReportsModule,
    GoveeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
