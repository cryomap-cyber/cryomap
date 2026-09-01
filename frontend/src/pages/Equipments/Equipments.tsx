import { type FormEvent, useEffect, useMemo, useState } from 'react';

import { EmptyState } from '../../components/Feedback/EmptyState';
import { LoadingState } from '../../components/Feedback/LoadingState';
import { getCompanies } from '../../services/companies';
import {
  createEquipment,
  getEquipments,
  inactivateEquipment,
  updateEquipment,
  type CreateEquipmentPayload,
} from '../../services/equipments';
import { getRooms } from '../../services/rooms';
import type { Company } from '../../types/company';
import type {
  Equipment,
  EquipmentLatestMeasurement,
  EquipmentStatus,
  RefrigerantFluid,
} from '../../types/equipment';
import type { Room } from '../../types/room';
import './Equipments.css';

const refrigerantFluidOptions: {
  value: RefrigerantFluid;
  label: string;
}[] = [
  {
    value: 'R22',
    label: 'R22',
  },
  {
    value: 'R32',
    label: 'R32',
  },
  {
    value: 'R410A',
    label: 'R410A',
  },
  {
    value: 'R134A',
    label: 'R134A',
  },
  {
    value: 'R404A',
    label: 'R404A',
  },
  {
    value: 'R407C',
    label: 'R407C',
  },
];

type EquipmentFormData = {
  companyId: string;
  roomId: string;
  name: string;
  code: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  refrigerantFluid: RefrigerantFluid | '';
  setpoint: string;
  delta: string;
  status: EquipmentStatus;
  notes: string;
};

const emptyFormData: EquipmentFormData = {
  companyId: '',
  roomId: '',
  name: '',
  code: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  refrigerantFluid: '',
  setpoint: '',
  delta: '',
  status: 'ACTIVE',
  notes: '',
};

export function Equipments() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(
    null,
  );
  const [formData, setFormData] = useState<EquipmentFormData>(emptyFormData);

  async function handleRefresh() {
    setError('');
    setIsLoading(true);

    try {
      const [companiesData, roomsData, equipmentsData] = await Promise.all([
        getCompanies(),
        getRooms(selectedCompanyId || undefined),
        getEquipments({
          companyId: selectedCompanyId || undefined,
          roomId: selectedRoomId || undefined,
        }),
      ]);

      setCompanies(companiesData);
      setRooms(roomsData);
      setEquipments(equipmentsData);
    } catch {
      setError('Não foi possível carregar os equipamentos.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    Promise.all([getCompanies(), getRooms(), getEquipments()])
      .then(([companiesData, roomsData, equipmentsData]) => {
        if (!isMounted) {
          return;
        }

        setCompanies(companiesData);
        setRooms(roomsData);
        setEquipments(equipmentsData);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar os equipamentos.');
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getRooms(selectedCompanyId || undefined)
      .then((roomsData) => {
        if (!isMounted) {
          return;
        }

        setRooms(roomsData);

        if (
          selectedRoomId &&
          !roomsData.some((room) => room.id === selectedRoomId)
        ) {
          setSelectedRoomId('');
        }
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar as salas do filtro.');
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCompanyId, selectedRoomId]);

  useEffect(() => {
    let isMounted = true;

    getEquipments({
      companyId: selectedCompanyId || undefined,
      roomId: selectedRoomId || undefined,
    })
      .then((equipmentsData) => {
        if (!isMounted) {
          return;
        }

        setError('');
        setEquipments(equipmentsData);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível filtrar os equipamentos.');
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCompanyId, selectedRoomId]);

  const filteredEquipments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return equipments;
    }

    return equipments.filter((equipment) => {
      const latestMeasurement = getLatestMeasurement(equipment);

      return [
        equipment.name,
        equipment.code,
        equipment.manufacturer ?? '',
        equipment.model ?? '',
        equipment.serialNumber ?? '',
        equipment.refrigerantFluid ?? '',
        equipment.company?.name ?? '',
        equipment.room?.name ?? '',
        equipment.status,
        equipment.notes ?? '',
        String(equipment.setpoint ?? ''),
        String(equipment.delta ?? ''),
        String(equipment.currentTemperature ?? ''),
        String(latestMeasurement?.temperature ?? ''),
        String(latestMeasurement?.dischargePressure ?? ''),
        String(latestMeasurement?.suctionPressure ?? ''),
        String(latestMeasurement?.liquidLineTemperature ?? ''),
        String(latestMeasurement?.evaporationTemperature ?? ''),
        String(latestMeasurement?.superheating ?? ''),
        String(latestMeasurement?.subcooling ?? ''),
        String(latestMeasurement?.airFlow ?? ''),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [equipments, search]);

  const formRooms = useMemo(() => {
    if (!formData.companyId) {
      return rooms;
    }

    return rooms.filter((room) => room.companyId === formData.companyId);
  }, [rooms, formData.companyId]);

  const activeEquipments = equipments.filter(
    (equipment) => equipment.status === 'ACTIVE',
  ).length;

  const runningEquipments = equipments.filter(
    (equipment) => equipment.status === 'RUNNING',
  ).length;

  const stoppedEquipments = equipments.filter(
    (equipment) => equipment.status === 'STOPPED',
  ).length;

  const maintenanceEquipments = equipments.filter(
    (equipment) => equipment.status === 'MAINTENANCE',
  ).length;

  const offlineEquipments = equipments.filter(
    (equipment) => equipment.status === 'OFFLINE',
  ).length;

  const inactiveEquipments = equipments.filter(
    (equipment) => equipment.status === 'INACTIVE',
  ).length;

  const equipmentsWithMeasurement = equipments.filter(
    (equipment) => getLatestMeasurement(equipment) !== null,
  ).length;

  function openCreateForm() {
    setEditingEquipment(null);
    setFormData({
      ...emptyFormData,
      companyId: selectedCompanyId,
      roomId: selectedRoomId,
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function openEditForm(equipment: Equipment) {
    setEditingEquipment(equipment);
    setFormData({
      companyId: equipment.companyId,
      roomId: equipment.roomId ?? '',
      name: equipment.name,
      code: equipment.code,
      manufacturer: equipment.manufacturer ?? '',
      model: equipment.model ?? '',
      serialNumber: equipment.serialNumber ?? '',
      refrigerantFluid: equipment.refrigerantFluid ?? '',
      setpoint: formatNumberForInput(equipment.setpoint),
      delta: formatNumberForInput(equipment.delta),
      status: equipment.status,
      notes: equipment.notes ?? '',
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingEquipment(null);
    setFormData(emptyFormData);
    setFormError('');
  }

  function updateFormField<K extends keyof EquipmentFormData>(
    field: K,
    value: EquipmentFormData[K],
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
      ...(field === 'companyId' ? { roomId: '' } : {}),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError('');

    if (!formData.companyId) {
      setFormError('Selecione a empresa do equipamento.');
      return;
    }

    if (!formData.name.trim()) {
      setFormError('Informe o nome do equipamento.');
      return;
    }

    if (!formData.code.trim()) {
      setFormError('Informe o código do equipamento.');
      return;
    }

    const setpoint = optionalNumber(formData.setpoint);
    const delta = optionalNumber(formData.delta);

    const payload: CreateEquipmentPayload = {
      companyId: formData.companyId,
      roomId: editingEquipment
        ? formData.roomId || null
        : optionalValue(formData.roomId),
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      manufacturer: optionalValue(formData.manufacturer),
      model: optionalValue(formData.model),
      serialNumber: optionalValue(formData.serialNumber),
      refrigerantFluid: optionalRefrigerantFluid(formData.refrigerantFluid),
      setpoint,
      delta,
      notes: optionalValue(formData.notes),
    };

    setIsSaving(true);

    try {
      if (editingEquipment) {
        await updateEquipment(editingEquipment.id, {
          ...payload,
          status: formData.status,
        });
      } else {
        await createEquipment(payload);
      }

      closeForm();
      await handleRefresh();
    } catch (requestError) {
      setFormError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleInactivate(equipment: Equipment) {
    const confirmed = window.confirm(
      `Deseja realmente inativar o equipamento "${equipment.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await inactivateEquipment(equipment.id);
      await handleRefresh();
    } catch {
      setError('Não foi possível inativar o equipamento.');
    }
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Carregando equipamentos..."
        description="Buscando equipamentos cadastrados."
      />
    );
  }

  return (
    <div className="equipments-page">
      <header className="equipments-header">
        <div>
          <span>Cadastros</span>
          <h1>Equipamentos</h1>
          <p>
            Visualize máquinas e equipamentos cadastrados, com resumo da última
            medição técnica registrada. Sensores ficam vinculados às salas, não
            aos equipamentos.
          </p>
        </div>

        <button type="button" onClick={openCreateForm}>
          Novo equipamento
        </button>
      </header>

      <section className="equipments-summary">
        <SummaryCard title="Total" value={equipments.length} />
        <SummaryCard title="Ativos" value={activeEquipments} />
        <SummaryCard title="Rodando" value={runningEquipments} />
        <SummaryCard title="Parados" value={stoppedEquipments} danger />
        <SummaryCard title="Manutenção" value={maintenanceEquipments} />
        <SummaryCard title="Offline" value={offlineEquipments} />
        <SummaryCard title="Inativos" value={inactiveEquipments} />
        <SummaryCard title="Com medição" value={equipmentsWithMeasurement} />
      </section>

      {isFormOpen ? (
        <section className="equipment-form-panel">
          <div className="equipment-form-header">
            <div>
              <span>Equipamento</span>
              <h2>
                {editingEquipment
                  ? 'Editar equipamento'
                  : 'Novo equipamento'}
              </h2>
            </div>

            <button type="button" onClick={closeForm}>
              Fechar
            </button>
          </div>

          <form className="equipment-form" onSubmit={handleSubmit}>
            <label>
              Empresa *
              <select
                value={formData.companyId}
                onChange={(event) =>
                  updateFormField('companyId', event.target.value)
                }
              >
                <option value="">Selecione uma empresa</option>

                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Sala
              <select
                value={formData.roomId}
                onChange={(event) =>
                  updateFormField('roomId', event.target.value)
                }
              >
                <option value="">Sem sala vinculada</option>

                {formRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Nome *
              <input
                value={formData.name}
                onChange={(event) =>
                  updateFormField('name', event.target.value)
                }
                placeholder="Ex: Compressor 01"
              />
            </label>

            <label>
              Código *
              <input
                value={formData.code}
                onChange={(event) =>
                  updateFormField('code', event.target.value)
                }
                placeholder="Ex: COMP-001"
              />
            </label>

            <label>
              Fabricante
              <input
                value={formData.manufacturer}
                onChange={(event) =>
                  updateFormField('manufacturer', event.target.value)
                }
                placeholder="Ex: Bitzer"
              />
            </label>

            <label>
              Modelo
              <input
                value={formData.model}
                onChange={(event) =>
                  updateFormField('model', event.target.value)
                }
                placeholder="Ex: 4NES-14Y"
              />
            </label>

            <label>
              Número de série
              <input
                value={formData.serialNumber}
                onChange={(event) =>
                  updateFormField('serialNumber', event.target.value)
                }
                placeholder="Ex: SN123456"
              />
            </label>

            <label>
              Fluido refrigerante
              <select
                value={formData.refrigerantFluid}
                onChange={(event) =>
                  updateFormField(
                    'refrigerantFluid',
                    event.target.value as EquipmentFormData['refrigerantFluid'],
                  )
                }
              >
                <option value="">Não informado</option>

                {refrigerantFluidOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Setpoint °C
              <input
                type="number"
                step="0.1"
                value={formData.setpoint}
                onChange={(event) =>
                  updateFormField('setpoint', event.target.value)
                }
                placeholder="Ex: -18"
              />
            </label>

            <label>
              Delta °C
              <input
                type="number"
                step="0.1"
                value={formData.delta}
                onChange={(event) =>
                  updateFormField('delta', event.target.value)
                }
                placeholder="Ex: 2"
              />
            </label>

            {editingEquipment ? (
              <label>
                Status
                <select
                  value={formData.status}
                  onChange={(event) =>
                    updateFormField(
                      'status',
                      event.target.value as EquipmentStatus,
                    )
                  }
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="RUNNING">Rodando</option>
                  <option value="STOPPED">Parado</option>
                  <option value="MAINTENANCE">Manutenção</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
              </label>
            ) : null}

            <label className="equipment-form-wide">
              Observações
              <input
                value={formData.notes}
                onChange={(event) =>
                  updateFormField('notes', event.target.value)
                }
                placeholder="Observações do equipamento"
              />
            </label>

            {formError ? (
              <strong className="equipment-form-error">{formError}</strong>
            ) : null}

            <div className="equipment-form-actions">
              <button type="button" onClick={closeForm}>
                Cancelar
              </button>

              <button type="submit" disabled={isSaving}>
                {isSaving
                  ? 'Salvando...'
                  : editingEquipment
                    ? 'Salvar alterações'
                    : 'Cadastrar equipamento'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="equipments-panel">
        <div className="equipments-panel-header">
          <div>
            <h2>Lista de equipamentos</h2>
            <p>{filteredEquipments.length} registro(s) encontrado(s)</p>
          </div>

          <div className="equipments-actions">
            <select
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
            >
              <option value="">Todas as empresas</option>

              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>

            <select
              value={selectedRoomId}
              onChange={(event) => setSelectedRoomId(event.target.value)}
            >
              <option value="">Todas as salas</option>

              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>

            <input
              type="search"
              placeholder="Buscar por nome, código, fluido, pressão..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <button type="button" onClick={() => void handleRefresh()}>
              Atualizar
            </button>
          </div>
        </div>

        {error ? (
          <div className="equipments-error">
            <strong>{error}</strong>

            <button type="button" onClick={() => void handleRefresh()}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        {!error && filteredEquipments.length === 0 ? (
          <EmptyState
            title="Nenhum equipamento encontrado."
            description="Cadastre um equipamento ou ajuste os filtros para visualizar resultados."
          />
        ) : null}

        {!error && filteredEquipments.length > 0 ? (
          <div className="equipments-table-wrapper">
            <table className="equipments-table">
              <thead>
                <tr>
                  <th>Equipamento</th>
                  <th>Código</th>
                  <th>Empresa</th>
                  <th>Sala</th>
                  <th>Fabricante / Modelo</th>
                  <th>Nº de série</th>
                  <th>Fluido</th>
                  <th>Setpoint / Delta</th>
                  <th>Última medição</th>
                  <th>Pressões</th>
                  <th>Super/Sub</th>
                  <th>Vazão</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredEquipments.map((equipment) => {
                  const latestMeasurement = getLatestMeasurement(equipment);

                  return (
                    <tr key={equipment.id}>
                      <td>
                        <strong>{equipment.name}</strong>
                        <small>{equipment.notes || equipment.id}</small>
                      </td>

                      <td>{equipment.code}</td>

                      <td>{equipment.company?.name ?? equipment.companyId}</td>

                      <td>{equipment.room?.name ?? '-'}</td>

                      <td>
                        <span>{equipment.manufacturer ?? '-'}</span>
                        <small>{equipment.model ?? '-'}</small>
                      </td>

                      <td>{equipment.serialNumber ?? '-'}</td>

                      <td>
                        {formatRefrigerantFluid(equipment.refrigerantFluid)}
                      </td>

                      <td>
                        <span>
                          Setpoint: {formatTemperature(equipment.setpoint)}
                        </span>
                        <small>
                          Delta: {formatTemperature(equipment.delta)}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {formatTemperature(
                            latestMeasurement?.temperature ??
                              equipment.currentTemperature,
                          )}
                        </strong>
                        <small>
                          {latestMeasurement
                            ? formatDateTime(latestMeasurement.measuredAt)
                            : 'Sem medição técnica'}
                        </small>
                      </td>

                      <td>
                        <span>
                          Descarga:{' '}
                          {formatPressure(
                            latestMeasurement?.dischargePressure,
                          )}
                        </span>
                        <small>
                          Sucção:{' '}
                          {formatPressure(latestMeasurement?.suctionPressure)}
                        </small>
                      </td>

                      <td>
                        <span>
                          Super:{' '}
                          {formatTemperature(latestMeasurement?.superheating)}
                        </span>
                        <small>
                          Sub:{' '}
                          {formatTemperature(latestMeasurement?.subcooling)}
                        </small>
                      </td>

                      <td>{formatAirFlow(latestMeasurement?.airFlow)}</td>

                      <td>
                        <EquipmentStatusBadge status={equipment.status} />
                      </td>

                      <td>{formatDate(equipment.createdAt)}</td>

                      <td>
                        <div className="equipment-row-actions">
                          <button
                            type="button"
                            onClick={() => openEditForm(equipment)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            disabled={equipment.status === 'INACTIVE'}
                            onClick={() => void handleInactivate(equipment)}
                          >
                            Inativar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

type SummaryCardProps = {
  title: string;
  value: number;
  danger?: boolean;
};

function SummaryCard({ title, value, danger = false }: SummaryCardProps) {
  return (
    <article
      className={
        danger ? 'equipments-summary-card danger' : 'equipments-summary-card'
      }
    >
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

type EquipmentStatusBadgeProps = {
  status: EquipmentStatus;
};

function EquipmentStatusBadge({ status }: EquipmentStatusBadgeProps) {
  const labels: Record<EquipmentStatus, string> = {
    ACTIVE: 'Ativo',
    RUNNING: 'Rodando',
    STOPPED: 'Parado',
    MAINTENANCE: 'Manutenção',
    OFFLINE: 'Offline',
    INACTIVE: 'Inativo',
  };

  return (
    <span className={`equipment-status ${status.toLowerCase()}`}>
      {labels[status]}
    </span>
  );
}

function getLatestMeasurement(
  equipment: Equipment,
): EquipmentLatestMeasurement | null {
  return equipment.equipmentTemperatureReadings?.[0] ?? null;
}

function formatRefrigerantFluid(value?: RefrigerantFluid | null) {
  if (!value) {
    return '-';
  }

  return value;
}

function formatTemperature(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${Number(value).toFixed(1)} °C`;
}

function formatPressure(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(value)} psi`;
}

function formatAirFlow(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(value)} m³/h`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('pt-BR');
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('pt-BR');
}

function formatNumberForInput(value?: number | null) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function optionalValue(value: string) {
  const normalized = value.trim();

  return normalized || undefined;
}

function optionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const normalized = Number(value);

  if (Number.isNaN(normalized)) {
    return undefined;
  }

  return normalized;
}

function optionalRefrigerantFluid(value: RefrigerantFluid | '') {
  return value || undefined;
}

function getRequestErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    const data = error.response.data;

    if (typeof data === 'object' && data !== null && 'message' in data) {
      const message = data.message;

      if (typeof message === 'string') {
        return message;
      }

      if (Array.isArray(message)) {
        return message.join(' | ');
      }
    }
  }

  return 'Não foi possível salvar o equipamento.';
}
