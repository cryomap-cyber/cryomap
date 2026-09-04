import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  Prisma,
  ReadingSource,
  SensorStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TemperatureReadingsService } from '../temperature-readings/temperature-readings.service.js';

type GoveeCapability = {
  type?: string;
  instance?: string;
  state?: {
    value?: unknown;
  };
  parameters?: {
    unit?: string;
  };
};

type GoveeDevice = {
  sku?: string;
  device?: string;
  deviceName?: string;
  type?: string;
  capabilities?: GoveeCapability[];
};

type GoveeApiResponse = {
  code?: number | string;
  message?: string;
  msg?: string;
  data?: unknown;
  payload?: unknown;
};

type SyncResult = {
  totalSensors: number;
  totalGoveeDevices: number;
  readingsCreated: number;
  offlineSensors: number;
  skippedSensors: number;
  failedSensors: number;
  details: string[];
};

const sensorForSyncSelect = {
  id: true,
  companyId: true,
  roomId: true,
  code: true,
  status: true,
  company: {
    select: {
      name: true,
    },
  },
  room: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.SensorSelect;

@Injectable()
export class GoveeService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly temperatureReadingsService: TemperatureReadingsService,
  ) {}

  async syncSensors(): Promise<SyncResult> {
    const devices = await this.listDevices();
    const devicesById = new Map(
      devices
        .filter((device) => device.device && device.sku)
        .map((device) => [this.normalizeCode(device.device!), device]),
    );

    const sensors = await this.prisma.sensor.findMany({
      where: {
        deletedAt: null,
        status: {
          in: [SensorStatus.ACTIVE, SensorStatus.OFFLINE],
        },
      },
      select: sensorForSyncSelect,
      orderBy: {
        code: 'asc',
      },
    });

    const result: SyncResult = {
      totalSensors: sensors.length,
      totalGoveeDevices: devices.length,
      readingsCreated: 0,
      offlineSensors: 0,
      skippedSensors: 0,
      failedSensors: 0,
      details: [],
    };

    for (const sensor of sensors) {
      const normalizedSensorCode = this.normalizeCode(sensor.code);
      const goveeDevice = devicesById.get(normalizedSensorCode);

      if (!goveeDevice?.sku || !goveeDevice.device) {
        result.skippedSensors += 1;
        result.details.push(
          `IGNORADO | ${sensor.code} | Não encontrado na conta Govee`,
        );
        continue;
      }

      try {
        const state = await this.getDeviceState(goveeDevice.sku, goveeDevice.device);

        if (state.online === false) {
          await this.prisma.sensor.update({
            where: {
              id: sensor.id,
            },
            data: {
              status: SensorStatus.OFFLINE,
            },
          });

          result.offlineSensors += 1;
          result.details.push(
            `OFFLINE | ${sensor.code} | ${sensor.company.name} / ${sensor.room.name}`,
          );
          continue;
        }

        if (state.temperatureCelsius === null) {
          result.skippedSensors += 1;
          result.details.push(
            `IGNORADO | ${sensor.code} | Temperatura não retornada pela Govee`,
          );
          continue;
        }

        await this.temperatureReadingsService.create({
          companyId: sensor.companyId,
          roomId: sensor.roomId,
          sensorId: sensor.id,
          temperature: state.temperatureCelsius,
          humidity: state.humidity ?? undefined,
          source: ReadingSource.API,
          readAt: new Date().toISOString(),
        });

        await this.prisma.sensor.update({
          where: {
            id: sensor.id,
          },
          data: {
            status: SensorStatus.ACTIVE,
          },
        });

        result.readingsCreated += 1;
        result.details.push(
          `OK | ${sensor.code} | ${sensor.company.name} / ${sensor.room.name} | ${state.temperatureCelsius} °C | ${
            state.humidity ?? '-'
          } %`,
        );
      } catch (error) {
        result.failedSensors += 1;
        result.details.push(
          `FALHA | ${sensor.code} | ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return result;
  }

  private async listDevices() {
    const response = await this.goveeRequest('/router/api/v1/user/devices', {
      method: 'GET',
    });

    return this.extractDevices(response);
  }

  private async getDeviceState(sku: string, device: string) {
    const response = await this.goveeRequest('/router/api/v1/device/state', {
      method: 'POST',
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        payload: {
          sku,
          device,
        },
      }),
    });

    const capabilities = this.extractCapabilities(response);

    const onlineValue = this.getCapabilityValue(capabilities, 'online');
    const rawTemperature = this.toNumber(
      this.getCapabilityValue(capabilities, 'sensorTemperature'),
    );
    const rawHumidity = this.toNumber(
      this.getCapabilityValue(capabilities, 'sensorHumidity'),
    );

    return {
      online: typeof onlineValue === 'boolean' ? onlineValue : null,
      temperatureCelsius:
        rawTemperature === null
          ? null
          : this.normalizeTemperatureToCelsius(rawTemperature),
      humidity: rawHumidity,
    };
  }

  private async goveeRequest(
    path: string,
    options: {
      method: 'GET' | 'POST';
      body?: string;
    },
  ): Promise<GoveeApiResponse> {
    const apiKey = this.configService.get<string>('GOVEE_API_KEY')?.trim();

    if (!apiKey) {
      throw new Error('GOVEE_API_KEY não está definido no .env do backend');
    }

    const baseUrl = this.normalizeBaseUrl(
      this.configService.get<string>('GOVEE_API_BASE_URL') ??
        'https://openapi.api.govee.com',
    );

    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        'Govee-API-Key': apiKey,
      },
      body: options.body,
    });

    const responseText = await response.text();

    let data: unknown;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`Resposta inválida da Govee: ${responseText}`);
    }

    if (!this.isRecord(data)) {
      throw new Error('Resposta inesperada da Govee');
    }

    const parsed = data as GoveeApiResponse;

    if (!response.ok) {
      throw new Error(
        `Erro HTTP ${response.status} ao chamar Govee: ${
          parsed.message ?? parsed.msg ?? responseText
        }`,
      );
    }

    if (parsed.code !== undefined && Number(parsed.code) !== 200) {
      throw new Error(
        `Erro da Govee: ${parsed.code} - ${parsed.message ?? parsed.msg ?? '-'}`,
      );
    }

    return parsed;
  }

  private extractDevices(response: GoveeApiResponse): GoveeDevice[] {
    if (Array.isArray(response.data)) {
      return response.data.filter(this.isRecord).map((item) => this.toDevice(item));
    }

    if (this.isRecord(response.data)) {
      const devices = response.data.devices;

      if (Array.isArray(devices)) {
        return devices.filter(this.isRecord).map((item) => this.toDevice(item));
      }
    }

    if (this.isRecord(response.payload)) {
      const devices = response.payload.devices;

      if (Array.isArray(devices)) {
        return devices.filter(this.isRecord).map((item) => this.toDevice(item));
      }
    }

    return [];
  }

  private extractCapabilities(response: GoveeApiResponse): GoveeCapability[] {
    if (this.isRecord(response.payload)) {
      const capabilities = response.payload.capabilities;

      if (Array.isArray(capabilities)) {
        return capabilities
          .filter(this.isRecord)
          .map((item) => this.toCapability(item));
      }
    }

    if (this.isRecord(response.data)) {
      const capabilities = response.data.capabilities;

      if (Array.isArray(capabilities)) {
        return capabilities
          .filter(this.isRecord)
          .map((item) => this.toCapability(item));
      }
    }

    return [];
  }

  private toDevice(value: Record<string, unknown>): GoveeDevice {
    const capabilities = Array.isArray(value.capabilities)
      ? value.capabilities
          .filter(this.isRecord)
          .map((item) => this.toCapability(item))
      : [];

    return {
      sku: this.asString(value.sku),
      device: this.asString(value.device),
      deviceName: this.asString(value.deviceName),
      type: this.asString(value.type),
      capabilities,
    };
  }

  private toCapability(value: Record<string, unknown>): GoveeCapability {
    const state = this.isRecord(value.state)
      ? {
          value: value.state.value,
        }
      : undefined;

    const parameters = this.isRecord(value.parameters)
      ? {
          unit: this.asString(value.parameters.unit),
        }
      : undefined;

    return {
      type: this.asString(value.type),
      instance: this.asString(value.instance),
      state,
      parameters,
    };
  }

  private getCapabilityValue(
    capabilities: GoveeCapability[],
    instance: string,
  ): unknown {
    return capabilities.find((capability) => capability.instance === instance)
      ?.state?.value;
  }

  private normalizeTemperatureToCelsius(value: number) {
    const configuredUnit = (
      this.configService.get<string>('GOVEE_TEMPERATURE_UNIT') ?? 'fahrenheit'
    ).toLowerCase();

    if (configuredUnit === 'celsius') {
      return this.roundToTwoDecimals(value);
    }

    if (configuredUnit === 'fahrenheit') {
      return this.roundToTwoDecimals(((value - 32) * 5) / 9);
    }

    if (value > 45) {
      return this.roundToTwoDecimals(((value - 32) * 5) / 9);
    }

    return this.roundToTwoDecimals(value);
  }

  private normalizeBaseUrl(value: string) {
    return value.trim().replace(/\/+$/, '');
  }

  private normalizeCode(value: string) {
    return value.trim().toUpperCase();
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private asString(value: unknown) {
    return typeof value === 'string' ? value : undefined;
  }

  private toNumber(value: unknown) {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);

      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private roundToTwoDecimals(value: number) {
    return Math.round(value * 100) / 100;
  }
}
