import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

config({
  path: resolve(__dirname, '../.env'),
});

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

const apiKey = process.env.GOVEE_API_KEY?.trim();
const baseUrl = normalizeBaseUrl(
  process.env.GOVEE_API_BASE_URL ?? 'https://openapi.api.govee.com',
);

const temperatureUnit = (
  process.env.GOVEE_TEMPERATURE_UNIT ?? 'fahrenheit'
).toLowerCase();

async function main() {
  if (!apiKey) {
    throw new Error('GOVEE_API_KEY não está definido no .env do backend.');
  }

  const [, , command, sku, device] = process.argv;

  if (command === 'state') {
    if (!sku || !device) {
      throw new Error(
        'Uso: npm run govee:state -- H5179 "DEVICE_ID_RETORNADO_PELA_GOVEE"',
      );
    }

    await showDeviceState(sku, device);
    return;
  }

  await listDevices();
}

async function listDevices() {
  const response = await goveeRequest('/router/api/v1/user/devices', {
    method: 'GET',
  });

  const devices = extractDevices(response);

  console.log('');
  console.log('Dispositivos retornados pela Govee');
  console.log('===================================');

  if (devices.length === 0) {
    console.log('');
    console.log('Nenhum dispositivo foi retornado pela API.');
    console.log(
      'Confirme se a API key está correta e se o dispositivo aparece na conta Govee vinculada.',
    );
    return;
  }

  for (const [index, device] of devices.entries()) {
    const capabilities = device.capabilities ?? [];
    const instances = capabilities
      .map((capability) => capability.instance)
      .filter(Boolean);

    const hasTemperature = instances.includes('sensorTemperature');
    const hasHumidity = instances.includes('sensorHumidity');

    console.log('');
    console.log(`#${index + 1}`);
    console.log(`Nome: ${device.deviceName ?? '-'}`);
    console.log(`SKU/modelo: ${device.sku ?? '-'}`);
    console.log(`Device ID: ${device.device ?? '-'}`);
    console.log(`Tipo: ${device.type ?? '-'}`);
    console.log(`Temperatura: ${hasTemperature ? 'sim' : 'não'}`);
    console.log(`Umidade: ${hasHumidity ? 'sim' : 'não'}`);
    console.log(`Capacidades: ${instances.join(', ') || '-'}`);
  }

  console.log('');
  console.log('Para consultar o estado de um sensor específico, rode:');
  console.log('npm run govee:state -- SKU "DEVICE_ID"');
}

async function showDeviceState(sku: string, device: string) {
  const response = await goveeRequest('/router/api/v1/device/state', {
    method: 'POST',
    body: JSON.stringify({
      requestId: randomUUID(),
      payload: {
        sku,
        device,
      },
    }),
  });

  const capabilities = extractCapabilities(response);

  const online = getCapabilityValue(capabilities, 'online');
  const rawTemperature = toNumber(
    getCapabilityValue(capabilities, 'sensorTemperature'),
  );
  const rawHumidity = toNumber(
    getCapabilityValue(capabilities, 'sensorHumidity'),
  );

  console.log('');
  console.log('Estado do dispositivo Govee');
  console.log('===========================');
  console.log(`SKU/modelo: ${sku}`);
  console.log(`Device ID: ${device}`);
  console.log(`Online: ${String(online ?? '-')}`);
  console.log(`Temperatura bruta: ${rawTemperature ?? '-'}`);
  console.log(`Umidade bruta: ${rawHumidity ?? '-'}`);

  if (rawTemperature !== null) {
    console.log(
      `Temperatura para o CryoMap: ${formatNumber(
        normalizeTemperatureToCelsius(rawTemperature),
      )} °C`,
    );
    console.log(`Unidade configurada: ${temperatureUnit}`);
  }

  if (rawHumidity !== null) {
    console.log(`Umidade para o CryoMap: ${formatNumber(rawHumidity)} %`);
  }

  console.log('');
  console.log('Capacidades retornadas:');
  for (const capability of capabilities) {
    console.log(
      `- ${capability.instance ?? '-'}: ${JSON.stringify(
        capability.state?.value ?? null,
      )}`,
    );
  }
}

async function goveeRequest(
  path: string,
  options: {
    method: 'GET' | 'POST';
    body?: string;
  },
): Promise<GoveeApiResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      'Govee-API-Key': apiKey!,
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

  if (!isRecord(data)) {
    throw new Error('Resposta inesperada da Govee.');
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

function extractDevices(response: GoveeApiResponse): GoveeDevice[] {
  if (Array.isArray(response.data)) {
    return response.data.filter(isRecord).map(toDevice);
  }

  if (isRecord(response.data)) {
    const devices = response.data.devices;

    if (Array.isArray(devices)) {
      return devices.filter(isRecord).map(toDevice);
    }
  }

  if (isRecord(response.payload)) {
    const devices = response.payload.devices;

    if (Array.isArray(devices)) {
      return devices.filter(isRecord).map(toDevice);
    }
  }

  return [];
}

function extractCapabilities(response: GoveeApiResponse): GoveeCapability[] {
  if (isRecord(response.payload)) {
    const capabilities = response.payload.capabilities;

    if (Array.isArray(capabilities)) {
      return capabilities.filter(isRecord).map(toCapability);
    }
  }

  if (isRecord(response.data)) {
    const capabilities = response.data.capabilities;

    if (Array.isArray(capabilities)) {
      return capabilities.filter(isRecord).map(toCapability);
    }
  }

  return [];
}

function toDevice(value: Record<string, unknown>): GoveeDevice {
  const capabilities = Array.isArray(value.capabilities)
    ? value.capabilities.filter(isRecord).map(toCapability)
    : [];

  return {
    sku: asString(value.sku),
    device: asString(value.device),
    deviceName: asString(value.deviceName),
    type: asString(value.type),
    capabilities,
  };
}

function toCapability(value: Record<string, unknown>): GoveeCapability {
  const state = isRecord(value.state)
    ? {
        value: value.state.value,
      }
    : undefined;

  const parameters = isRecord(value.parameters)
    ? {
        unit: asString(value.parameters.unit),
      }
    : undefined;

  return {
    type: asString(value.type),
    instance: asString(value.instance),
    state,
    parameters,
  };
}

function getCapabilityValue(
  capabilities: GoveeCapability[],
  instance: string,
): unknown {
  return capabilities.find((capability) => capability.instance === instance)
    ?.state?.value;
}

function normalizeTemperatureToCelsius(value: number) {
  if (temperatureUnit === 'celsius') {
    return roundToTwoDecimals(value);
  }

  if (temperatureUnit === 'fahrenheit') {
    return roundToTwoDecimals(((value - 32) * 5) / 9);
  }

  if (value > 45) {
    return roundToTwoDecimals(((value - 32) * 5) / 9);
  }

  return roundToTwoDecimals(value);
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error('');
  console.error('Falha no diagnóstico Govee:');
  console.error(message);
  process.exitCode = 1;
});
