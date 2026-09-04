import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GoveeService } from '../src/govee/govee.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TemperatureReadingsService } from '../src/temperature-readings/temperature-readings.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

config({
  path: resolve(__dirname, '../.env'),
});

async function main() {
  const configService = new ConfigService();
  const prismaService = new PrismaService(configService);
  const temperatureReadingsService = new TemperatureReadingsService(
    prismaService,
  );
  const goveeService = new GoveeService(
    configService,
    prismaService,
    temperatureReadingsService,
  );

  try {
    await prismaService.$connect();

    const result = await goveeService.syncSensors();

    console.log('');
    console.log('Sincronização Govee concluída');
    console.log('=============================');
    console.log(`Sensores CryoMap considerados: ${result.totalSensors}`);
    console.log(`Dispositivos Govee encontrados: ${result.totalGoveeDevices}`);
    console.log(`Leituras gravadas: ${result.readingsCreated}`);
    console.log(`Sensores offline: ${result.offlineSensors}`);
    console.log(`Sensores ignorados: ${result.skippedSensors}`);
    console.log(`Falhas: ${result.failedSensors}`);

    if (result.details.length > 0) {
      console.log('');
      console.log('Detalhes:');

      for (const detail of result.details) {
        console.log(`- ${detail}`);
      }
    }
  } finally {
    await prismaService.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('');
  console.error('Falha na sincronização Govee:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
