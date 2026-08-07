import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { getCompanies } from '../../services/companies';
import {
  createRoom,
  getRooms,
  inactivateRoom,
  updateRoom,
  type CreateRoomPayload,
} from '../../services/rooms';
import type { Company } from '../../types/company';
import type { Room, ThermalStatus } from '../../types/room';
import './Rooms.css';

type RoomFormData = {
  name: string;
  notes: string;
  companyId: string;
  minTemperature: string;
  maxTemperature: string;
  currentTemperature: string;
  mapX: string;
  mapY: string;
};

const emptyFormData: RoomFormData = {
  name: '',
  notes: '',
  companyId: '',
  minTemperature: '',
  maxTemperature: '',
  currentTemperature: '',
  mapX: '',
  mapY: '',
};

export function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<RoomFormData>(emptyFormData);

  async function handleRefresh() {
    setError('');
    setIsLoading(true);

    try {
      const [companiesData, roomsData] = await Promise.all([
        getCompanies(),
        getRooms(selectedCompanyId || undefined),
      ]);

      setCompanies(companiesData);
      setRooms(roomsData);
    } catch {
      setError('Não foi possível carregar as salas.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    Promise.all([getCompanies(), getRooms()])
      .then(([companiesData, roomsData]) => {
        if (!isMounted) {
          return;
        }

        setCompanies(companiesData);
        setRooms(roomsData);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar as salas.');
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

        setError('');
        setRooms(roomsData);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível filtrar as salas.');
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCompanyId]);

  const filteredRooms = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return rooms;
    }

    return rooms.filter((room) => {
      return [
        room.name,
        room.notes ?? '',
        room.company?.name ?? '',
        room.status,
        room.thermalStatus,
        String(room.currentTemperature ?? ''),
        String(room.minTemperature ?? ''),
        String(room.maxTemperature ?? ''),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [rooms, search]);

  const normalRooms = rooms.filter(
    (room) => room.thermalStatus === 'NORMAL',
  ).length;

  const warningRooms = rooms.filter(
    (room) => room.thermalStatus === 'WARNING',
  ).length;

  const criticalRooms = rooms.filter(
    (room) => room.thermalStatus === 'CRITICAL',
  ).length;

  const offlineRooms = rooms.filter(
    (room) => room.thermalStatus === 'OFFLINE',
  ).length;

  function openCreateForm() {
    setEditingRoom(null);
    setFormData({
      ...emptyFormData,
      companyId: selectedCompanyId,
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function openEditForm(room: Room) {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      notes: room.notes ?? '',
      companyId: room.companyId,
      minTemperature: formatNumberForInput(room.minTemperature),
      maxTemperature: formatNumberForInput(room.maxTemperature),
      currentTemperature: formatNumberForInput(room.currentTemperature),
      mapX: formatNumberForInput(room.mapX),
      mapY: formatNumberForInput(room.mapY),
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingRoom(null);
    setFormData(emptyFormData);
    setFormError('');
  }

  function updateFormField(field: keyof RoomFormData, value: string) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Informe o nome da sala.');
      return;
    }

    if (!formData.companyId) {
      setFormError('Selecione a empresa da sala.');
      return;
    }

    const minTemperature = optionalNumber(formData.minTemperature);
    const maxTemperature = optionalNumber(formData.maxTemperature);
    const currentTemperature = optionalNumber(formData.currentTemperature);
    const mapX = optionalNumber(formData.mapX);
    const mapY = optionalNumber(formData.mapY);

    if (
      minTemperature !== undefined &&
      maxTemperature !== undefined &&
      minTemperature > maxTemperature
    ) {
      setFormError('A temperatura mínima não pode ser maior que a máxima.');
      return;
    }

    const payload: CreateRoomPayload = {
      name: formData.name.trim(),
      companyId: formData.companyId,
      notes: optionalValue(formData.notes),
      minTemperature,
      maxTemperature,
      currentTemperature,
      mapX,
      mapY,
    };

    setIsSaving(true);

    try {
      if (editingRoom) {
        await updateRoom(editingRoom.id, payload);
      } else {
        await createRoom(payload);
      }

      closeForm();
      await handleRefresh();
    } catch (requestError) {
      setFormError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleInactivate(room: Room) {
    const confirmed = window.confirm(
      `Deseja realmente inativar a sala "${room.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await inactivateRoom(room.id);
      await handleRefresh();
    } catch {
      setError('Não foi possível inativar a sala.');
    }
  }

  if (isLoading) {
    return <p>Carregando salas...</p>;
  }

  return (
    <div className="rooms-page">
      <header className="rooms-header">
        <div>
          <span>Cadastros</span>
          <h1>Salas</h1>
          <p>Visualize os ambientes monitorados por sensores no CryoMap.</p>
        </div>

        <button type="button" onClick={openCreateForm}>
          Nova sala
        </button>
      </header>

      <section className="rooms-summary">
        <SummaryCard title="Total" value={rooms.length} />
        <SummaryCard title="Normal" value={normalRooms} />
        <SummaryCard title="Atenção" value={warningRooms} />
        <SummaryCard title="Críticas" value={criticalRooms} danger />
        <SummaryCard title="Offline" value={offlineRooms} />
      </section>

      {isFormOpen ? (
        <section className="room-form-panel">
          <div className="room-form-header">
            <div>
              <span>Sala</span>
              <h2>{editingRoom ? 'Editar sala' : 'Nova sala'}</h2>
            </div>

            <button type="button" onClick={closeForm}>
              Fechar
            </button>
          </div>

          <form className="room-form" onSubmit={handleSubmit}>
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
              Nome *
              <input
                value={formData.name}
                onChange={(event) =>
                  updateFormField('name', event.target.value)
                }
                placeholder="Ex: Câmara Fria 01"
              />
            </label>

            <label className="room-form-wide">
              Descrição
              <input
                value={formData.notes}
                onChange={(event) =>
                  updateFormField('notes', event.target.value)
                }
                placeholder="Ex: Câmara de congelados do setor A"
              />
            </label>

            <label>
              Temperatura mínima °C
              <input
                type="number"
                step="0.1"
                value={formData.minTemperature}
                onChange={(event) =>
                  updateFormField('minTemperature', event.target.value)
                }
                placeholder="-18"
              />
            </label>

            <label>
              Temperatura máxima °C
              <input
                type="number"
                step="0.1"
                value={formData.maxTemperature}
                onChange={(event) =>
                  updateFormField('maxTemperature', event.target.value)
                }
                placeholder="-12"
              />
            </label>

            <label>
              Temperatura atual °C
              <input
                type="number"
                step="0.1"
                value={formData.currentTemperature}
                onChange={(event) =>
                  updateFormField('currentTemperature', event.target.value)
                }
                placeholder="-15"
              />
            </label>

            <label>
              Posição X no mapa
              <input
                type="number"
                step="0.01"
                value={formData.mapX}
                onChange={(event) =>
                  updateFormField('mapX', event.target.value)
                }
                placeholder="0.25"
              />
            </label>

            <label>
              Posição Y no mapa
              <input
                type="number"
                step="0.01"
                value={formData.mapY}
                onChange={(event) =>
                  updateFormField('mapY', event.target.value)
                }
                placeholder="0.50"
              />
            </label>

            {formError ? (
              <strong className="room-form-error">{formError}</strong>
            ) : null}

            <div className="room-form-actions">
              <button type="button" onClick={closeForm}>
                Cancelar
              </button>

              <button type="submit" disabled={isSaving}>
                {isSaving
                  ? 'Salvando...'
                  : editingRoom
                    ? 'Salvar alterações'
                    : 'Cadastrar sala'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rooms-panel">
        <div className="rooms-panel-header">
          <div>
            <h2>Lista de salas</h2>
            <p>{filteredRooms.length} registro(s) encontrado(s)</p>
          </div>

          <div className="rooms-actions">
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

            <input
              type="search"
              placeholder="Buscar por sala, empresa, status..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <button type="button" onClick={handleRefresh}>
              Atualizar
            </button>
          </div>
        </div>

        {error ? (
          <div className="rooms-error">
            <strong>{error}</strong>

            <button type="button" onClick={handleRefresh}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        {!error && filteredRooms.length === 0 ? (
          <p className="rooms-empty">Nenhuma sala encontrada.</p>
        ) : null}

        {!error && filteredRooms.length > 0 ? (
          <div className="rooms-table-wrapper">
            <table className="rooms-table">
              <thead>
                <tr>
                  <th>Sala</th>
                  <th>Empresa</th>
                  <th>Temperatura atual</th>
                  <th>Limites</th>
                  <th>Status térmico</th>
                  <th>Status cadastro</th>
                  <th>Mapa</th>
                  <th>Criada em</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredRooms.map((room) => (
                  <tr key={room.id}>
                    <td>
                      <strong>{room.name}</strong>
                      <small>{room.notes || room.id}</small>
                    </td>

                    <td>{room.company?.name ?? room.companyId}</td>

                    <td>
                      <strong>
                        {formatTemperature(room.currentTemperature)}
                      </strong>
                    </td>

                    <td>
                      <span>
                        Mín: {formatTemperature(room.minTemperature)}
                      </span>
                      <small>
                        Máx: {formatTemperature(room.maxTemperature)}
                      </small>
                    </td>

                    <td>
                      <ThermalBadge status={room.thermalStatus} />
                    </td>

                    <td>
                      <span
                        className={
                          room.status === 'ACTIVE'
                            ? 'rooms-status active'
                            : 'rooms-status inactive'
                        }
                      >
                        {room.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>

                    <td>
                      <span>X: {formatCoordinate(room.mapX)}</span>
                      <small>Y: {formatCoordinate(room.mapY)}</small>
                    </td>

                    <td>{formatDate(room.createdAt)}</td>

                    <td>
                      <div className="room-row-actions">
                        <button type="button" onClick={() => openEditForm(room)}>
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={room.status === 'INACTIVE'}
                          onClick={() => handleInactivate(room)}
                        >
                          Inativar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
      className={danger ? 'rooms-summary-card danger' : 'rooms-summary-card'}
    >
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

type ThermalBadgeProps = {
  status: ThermalStatus;
};

function ThermalBadge({ status }: ThermalBadgeProps) {
  const labels: Record<ThermalStatus, string> = {
    NORMAL: 'Normal',
    WARNING: 'Atenção',
    CRITICAL: 'Crítica',
    OFFLINE: 'Offline',
  };

  return (
    <span className={`thermal-badge ${status.toLowerCase()}`}>
      {labels[status]}
    </span>
  );
}

function formatTemperature(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${Number(value).toFixed(1)} °C`;
}

function formatCoordinate(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  return Number(value).toFixed(2);
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('pt-BR');
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

    if (
      typeof data === 'object' &&
      data !== null &&
      'message' in data
    ) {
      const message = data.message;

      if (typeof message === 'string') {
        return message;
      }

      if (Array.isArray(message)) {
        return message.join(' | ');
      }
    }
  }

  return 'Não foi possível salvar a sala.';
}
