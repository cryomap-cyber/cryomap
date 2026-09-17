import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Building2,
  CirclePause,
  Fan,
  Gauge,
  MapPin,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Thermometer,
  TriangleAlert,
  Wrench,
} from 'lucide-react';

import { CollapsibleSection } from '../../components/CollapsibleSection/CollapsibleSection';
import {
  ActionButton,
  EmptyState,
  InlineNotice,
  LoadingState,
  MetaPill,
  MetricCard,
  PageHeader,
  StatusBadge,
  type UiTone,
} from '../../components/ui/CryoUi';
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

  const activeFilterCount = [
    selectedCompanyId,
    selectedRoomId,
    search.trim(),
  ].filter(Boolean).length;

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
        title="Carregando equipamentos"
        description="Buscando equipamentos cadastrados e medições técnicas recentes."
      />
    );
  }

  const attentionEquipments =
    stoppedEquipments + maintenanceEquipments + offlineEquipments;

  return (
    <div className="equipments-page">
      <PageHeader
        eyebrow="Cadastros"
        title="Equipamentos"
        description="Gerencie máquinas e equipamentos e consulte a última medição técnica registrada. Sensores permanecem vinculados às salas, nunca aos equipamentos."
        icon={Wrench}
        actions={
          <ActionButton
            type="button"
            icon={Plus}
            variant="primary"
            onClick={openCreateForm}
          >
            Novo equipamento
          </ActionButton>
        }
        meta={
          <>
            <MetaPill icon={Wrench}>{equipments.length} equipamento(s)</MetaPill>

            <MetaPill
              icon={attentionEquipments > 0 ? TriangleAlert : Activity}
              tone={attentionEquipments > 0 ? 'warning' : 'success'}
            >
              {attentionEquipments > 0
                ? `${attentionEquipments} requer(em) atenção`
                : 'Operação estável'}
            </MetaPill>

            <MetaPill icon={Gauge}>
              {equipmentsWithMeasurement} com medição técnica
            </MetaPill>
          </>
        }
      />

      <CollapsibleSection
        title="Resumo dos equipamentos"
        openDescription="Indicadores gerais dos equipamentos estão visíveis."
        closedDescription="Indicadores gerais estão ocultos para liberar espaço na tela."
        openLabel="Ocultar resumo"
        closedLabel="Mostrar resumo"
        storageKey="cryomap.equipments.summary-open"
        defaultOpen
        defaultOpenOnMobile={false}
        className="equipments-summary-disclosure"
        contentClassName="equipments-summary"
        variant="section"
      >
        <MetricCard
          label="Total"
          value={equipments.length}
          detail="Equipamentos carregados"
          icon={Wrench}
          tone="info"
        />

        <MetricCard
          label="Ativos"
          value={activeEquipments}
          detail="Cadastro operacional"
          icon={Activity}
          tone="success"
        />

        <MetricCard
          label="Rodando"
          value={runningEquipments}
          detail="Em operação"
          icon={Fan}
          tone="success"
        />

        <MetricCard
          label="Parados"
          value={stoppedEquipments}
          detail="Equipamentos interrompidos"
          icon={CirclePause}
          tone={stoppedEquipments > 0 ? 'danger' : 'success'}
        />

        <MetricCard
          label="Manutenção"
          value={maintenanceEquipments}
          detail="Em intervenção"
          icon={Wrench}
          tone={maintenanceEquipments > 0 ? 'warning' : 'neutral'}
        />

        <MetricCard
          label="Offline"
          value={offlineEquipments}
          detail="Sem operação disponível"
          icon={Power}
          tone="neutral"
        />

        <MetricCard
          label="Inativos"
          value={inactiveEquipments}
          detail="Fora do cadastro ativo"
          icon={Power}
          tone="neutral"
        />

        <MetricCard
          label="Com medição"
          value={equipmentsWithMeasurement}
          detail="Última medição técnica disponível"
          icon={Thermometer}
          tone="info"
        />
      </CollapsibleSection>

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
              <p>
                Configure identificação, vínculo, fluido refrigerante e
                parâmetros operacionais do equipamento.
              </p>
            </div>

            <ActionButton
              type="button"
              variant="ghost"
              onClick={closeForm}
            >
              Fechar
            </ActionButton>
          </div>

          <InlineNotice
            tone="info"
            icon={Thermometer}
            title="Medições técnicas"
            description="Equipamentos não possuem sensores próprios. Temperaturas, pressões e demais parâmetros técnicos são registrados manualmente."
          />

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
              <ActionButton
                type="button"
                variant="secondary"
                onClick={closeForm}
              >
                Cancelar
              </ActionButton>

              <ActionButton
                type="submit"
                variant="primary"
                disabled={isSaving}
              >
                {isSaving
                  ? 'Salvando...'
                  : editingEquipment
                    ? 'Salvar alterações'
                    : 'Cadastrar equipamento'}
              </ActionButton>
            </div>
          </form>
        </section>
      ) : null}

      <section className="equipments-panel">
        <div className="equipments-panel-header">
          <div>
            <span>Cadastro técnico</span>
            <h2>Lista de equipamentos</h2>
            <p>
              {filteredEquipments.length} registro(s) exibido(s) de{' '}
              {equipments.length} carregado(s)
            </p>
          </div>

          <ActionButton
            type="button"
            icon={RefreshCw}
            onClick={() => void handleRefresh()}
          >
            Atualizar
          </ActionButton>
        </div>

        <CollapsibleSection
          title="Filtros"
          openDescription="Refine a lista por empresa, sala ou busca textual."
          closedDescription={
            activeFilterCount > 0
              ? `${activeFilterCount} filtro(s) ativo(s).`
              : 'Nenhum filtro específico selecionado.'
          }
          openLabel="Ocultar filtros"
          closedLabel="Filtros"
          storageKey="cryomap.equipments.filters-open"
          defaultOpen={false}
          defaultOpenOnMobile={false}
          count={activeFilterCount}
          className="equipments-filters-disclosure"
          contentClassName="equipments-filter-area"
          variant="toolbar"
        >
          <div className="equipments-actions">
            <label className="equipments-filter-field">
              <span>Empresa</span>
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
            </label>

            <label className="equipments-filter-field">
              <span>Sala</span>
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
            </label>

            <label className="equipments-filter-field equipments-search-field">
              <span>
                <Search size={13} strokeWidth={2.1} aria-hidden="true" />
                Busca
              </span>
              <input
                type="search"
                placeholder="Buscar por nome, código, fluido, pressão..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
        </CollapsibleSection>

        {error ? (
          <InlineNotice
            tone="danger"
            icon={TriangleAlert}
            title={error}
            description="Tente atualizar os equipamentos ou reveja os filtros selecionados."
            action={
              <ActionButton
                type="button"
                icon={RefreshCw}
                variant="danger"
                onClick={() => void handleRefresh()}
              >
                Tentar novamente
              </ActionButton>
            }
          />
        ) : null}

        {!error && filteredEquipments.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="Nenhum equipamento encontrado"
            description="Cadastre um equipamento ou ajuste os filtros para visualizar resultados."
          />
        ) : null}

        {!error && filteredEquipments.length > 0 ? (
          <>
            <div className="equipments-mobile-list">
              {filteredEquipments.map((equipment) => (
                <EquipmentMobileCard
                  key={equipment.id}
                  equipment={equipment}
                  onEdit={openEditForm}
                  onInactivate={handleInactivate}
                />
              ))}
            </div>

            <div className="equipments-table-wrapper">
              <table className="equipments-table">
                <thead>
                  <tr>
                    <th>Equipamento</th>
                    <th>Local</th>
                    <th>Especificação</th>
                    <th>Configuração</th>
                    <th>Última medição</th>
                    <th>Pressões</th>
                    <th>Operação</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEquipments.map((equipment) => {
                    const latestMeasurement = getLatestMeasurement(equipment);

                    return (
                      <tr key={equipment.id}>
                        <td>
                          <div className="equipment-table-primary">
                            <strong>{equipment.name}</strong>
                            <span>{equipment.code}</span>
                            <small>
                              {equipment.notes || 'Sem observações'}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="equipment-table-location">
                            <span>
                              <Building2 size={13} strokeWidth={2} />
                              {equipment.company?.name ?? equipment.companyId}
                            </span>

                            <span>
                              <MapPin size={13} strokeWidth={2} />
                              {equipment.room?.name ?? 'Sem sala vinculada'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="equipment-table-spec">
                            <strong>
                              {equipment.manufacturer ?? 'Fabricante não informado'}
                            </strong>
                            <span>{equipment.model ?? 'Modelo não informado'}</span>
                            <small>
                              Série: {equipment.serialNumber ?? '-'} · Fluido:{' '}
                              {formatRefrigerantFluid(
                                equipment.refrigerantFluid,
                              )}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="equipment-table-config">
                            <span>
                              Setpoint{' '}
                              <strong>
                                {formatTemperature(equipment.setpoint)}
                              </strong>
                            </span>

                            <span>
                              Delta{' '}
                              <strong>{formatTemperature(equipment.delta)}</strong>
                            </span>
                          </div>
                        </td>

                        <td>
                          <EquipmentMeasurementSummary
                            equipment={equipment}
                            measurement={latestMeasurement}
                          />
                        </td>

                        <td>
                          <div className="equipment-table-pressures">
                            <span>
                              Descarga{' '}
                              <strong>
                                {formatPressure(
                                  latestMeasurement?.dischargePressure,
                                )}
                              </strong>
                            </span>

                            <span>
                              Sucção{' '}
                              <strong>
                                {formatPressure(
                                  latestMeasurement?.suctionPressure,
                                )}
                              </strong>
                            </span>

                            <small>
                              Super{' '}
                              {formatTemperature(latestMeasurement?.superheating)}
                              {' · '}
                              Sub{' '}
                              {formatTemperature(latestMeasurement?.subcooling)}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="equipment-table-operation">
                            <EquipmentStatusBadge status={equipment.status} />

                            <span>
                              <Fan size={13} strokeWidth={2} />
                              {formatAirFlow(latestMeasurement?.airFlow)}
                            </span>

                            <small>
                              Criado em {formatDate(equipment.createdAt)}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="equipment-row-actions">
                            <button
                              type="button"
                              className="equipment-icon-action"
                              title="Editar equipamento"
                              aria-label={`Editar equipamento ${equipment.name}`}
                              onClick={() => openEditForm(equipment)}
                            >
                              <Pencil size={15} strokeWidth={2} />
                            </button>

                            <button
                              type="button"
                              className="equipment-icon-action equipment-icon-action--danger"
                              title="Inativar equipamento"
                              aria-label={`Inativar equipamento ${equipment.name}`}
                              disabled={equipment.status === 'INACTIVE'}
                              onClick={() => void handleInactivate(equipment)}
                            >
                              <Power size={15} strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

type EquipmentMobileCardProps = {
  equipment: Equipment;
  onEdit: (equipment: Equipment) => void;
  onInactivate: (equipment: Equipment) => Promise<void>;
};

function EquipmentMobileCard({
  equipment,
  onEdit,
  onInactivate,
}: EquipmentMobileCardProps) {
  const latestMeasurement = getLatestMeasurement(equipment);

  return (
    <article
      className={`equipment-mobile-card equipment-mobile-card--${equipment.status.toLowerCase()}`}
    >
      <div className="equipment-mobile-card-header">
        <div>
          <span>{equipment.code}</span>
          <strong>{equipment.name}</strong>
          <small>{equipment.company?.name ?? equipment.companyId}</small>
        </div>

        <EquipmentStatusBadge status={equipment.status} />
      </div>

      <div className="equipment-mobile-card-measurement">
        <span>Última temperatura técnica</span>
        <strong>
          {formatTemperature(
            latestMeasurement?.temperature ?? equipment.currentTemperature,
          )}
        </strong>
        <small>
          {latestMeasurement
            ? formatDateTime(latestMeasurement.measuredAt)
            : 'Sem medição técnica registrada'}
        </small>
      </div>

      <div className="equipment-mobile-card-meta">
        <div>
          <span>Sala</span>
          <strong>{equipment.room?.name ?? 'Sem sala vinculada'}</strong>
        </div>

        <div>
          <span>Fabricante / modelo</span>
          <strong>
            {[equipment.manufacturer, equipment.model]
              .filter(Boolean)
              .join(' · ') || '-'}
          </strong>
        </div>

        <div>
          <span>Setpoint / delta</span>
          <strong>
            {formatTemperature(equipment.setpoint)} /{' '}
            {formatTemperature(equipment.delta)}
          </strong>
        </div>

        <div>
          <span>Fluido</span>
          <strong>{formatRefrigerantFluid(equipment.refrigerantFluid)}</strong>
        </div>
      </div>

      <div className="equipment-mobile-card-technical">
        <div>
          <span>Descarga</span>
          <strong>
            {formatPressure(latestMeasurement?.dischargePressure)}
          </strong>
        </div>

        <div>
          <span>Sucção</span>
          <strong>{formatPressure(latestMeasurement?.suctionPressure)}</strong>
        </div>

        <div>
          <span>Super / Sub</span>
          <strong>
            {formatTemperature(latestMeasurement?.superheating)} /{' '}
            {formatTemperature(latestMeasurement?.subcooling)}
          </strong>
        </div>

        <div>
          <span>Vazão</span>
          <strong>{formatAirFlow(latestMeasurement?.airFlow)}</strong>
        </div>
      </div>

      {equipment.notes ? (
        <p className="equipment-mobile-card-notes">{equipment.notes}</p>
      ) : null}

      <div className="equipment-mobile-card-actions">
        <ActionButton
          type="button"
          icon={Pencil}
          variant="secondary"
          onClick={() => onEdit(equipment)}
        >
          Editar
        </ActionButton>

        <ActionButton
          type="button"
          icon={Power}
          variant="danger"
          disabled={equipment.status === 'INACTIVE'}
          onClick={() => void onInactivate(equipment)}
        >
          Inativar
        </ActionButton>
      </div>
    </article>
  );
}

type EquipmentMeasurementSummaryProps = {
  equipment: Equipment;
  measurement: EquipmentLatestMeasurement | null;
};

function EquipmentMeasurementSummary({
  equipment,
  measurement,
}: EquipmentMeasurementSummaryProps) {
  const temperature = measurement?.temperature ?? equipment.currentTemperature;

  return (
    <div className="equipment-measurement-summary">
      <Thermometer size={15} strokeWidth={2.1} />

      <div>
        <strong>{formatTemperature(temperature)}</strong>
        <small>
          {measurement
            ? formatDateTime(measurement.measuredAt)
            : 'Sem medição técnica'}
        </small>

        {measurement ? (
          <span>
            Linha líquida{' '}
            {formatTemperature(measurement.liquidLineTemperature)} · Evap.{' '}
            {formatTemperature(measurement.evaporationTemperature)}
          </span>
        ) : null}
      </div>
    </div>
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
    <StatusBadge tone={getEquipmentStatusTone(status)}>
      {labels[status]}
    </StatusBadge>
  );
}

function getEquipmentStatusTone(status: EquipmentStatus): UiTone {
  if (status === 'ACTIVE' || status === 'RUNNING') {
    return 'success';
  }

  if (status === 'STOPPED') {
    return 'danger';
  }

  if (status === 'MAINTENANCE') {
    return 'warning';
  }

  return 'neutral';
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

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
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
