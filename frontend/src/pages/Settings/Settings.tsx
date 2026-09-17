import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Briefcase,
  Building2,
  Camera,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { isAxiosError } from 'axios';

import { useAuth } from '../../contexts/useAuth';
import {
  getOwnProfile,
  getOwnProfileImage,
  removeOwnProfileImage,
  updateOwnProfile,
  uploadOwnProfileImage,
} from '../../services/profile';
import type { AuthUser } from '../../types/auth';
import './Settings.css';

type Feedback = {
  type: 'success' | 'error';
  text: string;
} | null;

const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const maxProfileImageSize = 5 * 1024 * 1024;

export function SettingsPage() {
  const { user, refreshUser } = useAuth();

  const [profile, setProfile] = useState<AuthUser | null>(user);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? '');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImageBusy, setIsImageBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentRole = profile?.role ?? user?.role;
  const canEditProfile =
    currentRole === 'MASTER_ADMIN' || currentRole === 'SUPERVISOR';

  useEffect(() => {
    let isMounted = true;

    getOwnProfile()
      .then((profileData) => {
        if (!isMounted) {
          return;
        }

        applyProfile(profileData);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setFeedback({
          type: 'error',
          text: getErrorMessage(
            error,
            'Não foi possível carregar os dados do perfil.',
          ),
        });
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
    let objectUrl: string | null = null;

    if (!profile?.hasProfileImage) {
      setProfileImageUrl(null);
      return;
    }

    setProfileImageUrl(null);

    getOwnProfileImage()
      .then((blob) => {
        if (!isMounted) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setProfileImageUrl(objectUrl);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setProfileImageUrl(null);
      });

    return () => {
      isMounted = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [profile]);

  function applyProfile(profileData: AuthUser) {
    setProfile(profileData);
    setName(profileData.name ?? '');
    setEmail(profileData.email ?? '');
    setPhone(profileData.phone ?? '');
    setJobTitle(profileData.jobTitle ?? '');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEditProfile) {
      return;
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 2) {
      setFeedback({
        type: 'error',
        text: 'Informe um nome com pelo menos 2 caracteres.',
      });
      return;
    }

    if (!normalizedEmail) {
      setFeedback({
        type: 'error',
        text: 'Informe um email válido.',
      });
      return;
    }

    setFeedback(null);
    setIsSaving(true);

    try {
      const updatedProfile = await updateOwnProfile({
        name: normalizedName,
        email: normalizedEmail,
        phone: phone.trim() || null,
        jobTitle: jobTitle.trim() || null,
      });

      applyProfile(updatedProfile);
      await refreshUser();

      setFeedback({
        type: 'success',
        text: 'Perfil atualizado com sucesso.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(
          error,
          'Não foi possível atualizar o perfil.',
        ),
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleSelectProfileImage() {
    fileInputRef.current?.click();
  }

  async function handleProfileImageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    if (!allowedImageTypes.has(file.type)) {
      setFeedback({
        type: 'error',
        text: 'Use uma imagem JPEG, PNG ou WebP.',
      });
      return;
    }

    if (file.size > maxProfileImageSize) {
      setFeedback({
        type: 'error',
        text: 'A foto de perfil deve ter no máximo 5 MB.',
      });
      return;
    }

    setFeedback(null);
    setIsImageBusy(true);

    try {
      const updatedProfile = await uploadOwnProfileImage(file);

      applyProfile(updatedProfile);
      await refreshUser();

      setFeedback({
        type: 'success',
        text: 'Foto de perfil atualizada.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(
          error,
          'Não foi possível enviar a foto de perfil.',
        ),
      });
    } finally {
      setIsImageBusy(false);
    }
  }

  async function handleRemoveProfileImage() {
    if (!profile?.hasProfileImage || isImageBusy) {
      return;
    }

    setFeedback(null);
    setIsImageBusy(true);

    try {
      const updatedProfile = await removeOwnProfileImage();

      applyProfile(updatedProfile);
      await refreshUser();

      setFeedback({
        type: 'success',
        text: 'Foto de perfil removida.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getErrorMessage(
          error,
          'Não foi possível remover a foto de perfil.',
        ),
      });
    } finally {
      setIsImageBusy(false);
    }
  }

  const initials = getUserInitials(profile?.name ?? user?.name);

  return (
    <div className="settings-page">
      <header className="settings-page-header">
        <div>
          <span className="settings-kicker">Conta</span>
          <h1>Configurações</h1>
          <p>
            Consulte seus dados de conta e gerencie sua foto de perfil no
            CryoMap.
          </p>
        </div>
      </header>

      {feedback ? (
        <div
          className={`settings-feedback settings-feedback--${feedback.type}`}
          role={feedback.type === 'error' ? 'alert' : 'status'}
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="settings-layout">
        <section className="settings-card settings-profile-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <UserRound size={20} strokeWidth={2.1} />
            </div>

            <div>
              <h2>Perfil</h2>
              <p>
                {canEditProfile
                  ? 'Atualize as informações exibidas no CryoMap.'
                  : 'Seus dados cadastrais são exibidos abaixo para consulta.'}
              </p>
            </div>
          </div>

          <div className="settings-profile-photo">
            <div className="settings-avatar">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="Foto de perfil" />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="settings-photo-copy">
              <strong>Foto de perfil</strong>
              <span>JPEG, PNG ou WebP. Máximo de 5 MB.</span>

              <div className="settings-photo-actions">
                <button
                  type="button"
                  className="settings-button settings-button--secondary"
                  onClick={handleSelectProfileImage}
                  disabled={isImageBusy}
                >
                  <Camera size={17} strokeWidth={2.1} />
                  {profile?.hasProfileImage ? 'Alterar foto' : 'Adicionar foto'}
                </button>

                {profile?.hasProfileImage ? (
                  <button
                    type="button"
                    className="settings-button settings-button--danger"
                    onClick={handleRemoveProfileImage}
                    disabled={isImageBusy}
                  >
                    <Trash2 size={17} strokeWidth={2.1} />
                    Remover
                  </button>
                ) : null}
              </div>

              <input
                ref={fileInputRef}
                className="settings-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProfileImageChange}
              />
            </div>
          </div>

          <form className="settings-form" onSubmit={handleSubmit}>
            <label className="settings-field">
              <span>Nome</span>
              <div
                className={
                  canEditProfile
                    ? 'settings-input-wrap'
                    : 'settings-input-wrap is-readonly'
                }
              >
                <UserRound size={17} strokeWidth={2} />
                <input
                  type="text"
                  value={name}
                  maxLength={120}
                  onChange={(event) => setName(event.target.value)}
                  readOnly={!canEditProfile}
                  aria-readonly={!canEditProfile}
                  disabled={isLoading || isSaving}
                />
              </div>
            </label>

            <label className="settings-field">
              <span>Email</span>
              <div
                className={
                  canEditProfile
                    ? 'settings-input-wrap'
                    : 'settings-input-wrap is-readonly'
                }
              >
                <Mail size={17} strokeWidth={2} />
                <input
                  type="email"
                  value={email}
                  maxLength={120}
                  onChange={(event) => setEmail(event.target.value)}
                  readOnly={!canEditProfile}
                  aria-readonly={!canEditProfile}
                  disabled={isLoading || isSaving}
                />
              </div>
              <small>
                {canEditProfile
                  ? 'Este email é usado para acesso ao CryoMap.'
                  : 'O email de acesso é gerenciado por um administrador ou supervisor.'}
              </small>
            </label>

            <label className="settings-field">
              <span>Telefone</span>
              <div
                className={
                  canEditProfile
                    ? 'settings-input-wrap'
                    : 'settings-input-wrap is-readonly'
                }
              >
                <Phone size={17} strokeWidth={2} />
                <input
                  type="text"
                  value={phone}
                  maxLength={30}
                  placeholder="(00) 00000-0000"
                  onChange={(event) => setPhone(event.target.value)}
                  readOnly={!canEditProfile}
                  aria-readonly={!canEditProfile}
                  disabled={isLoading || isSaving}
                />
              </div>
            </label>

            <label className="settings-field">
              <span>Cargo / função</span>
              <div
                className={
                  canEditProfile
                    ? 'settings-input-wrap'
                    : 'settings-input-wrap is-readonly'
                }
              >
                <Briefcase size={17} strokeWidth={2} />
                <input
                  type="text"
                  value={jobTitle}
                  maxLength={80}
                  placeholder="Ex.: Supervisor de manutenção"
                  onChange={(event) => setJobTitle(event.target.value)}
                  readOnly={!canEditProfile}
                  aria-readonly={!canEditProfile}
                  disabled={isLoading || isSaving}
                />
              </div>
            </label>

            <div className="settings-field">
              <span>Empresa</span>
              <div className="settings-input-wrap is-readonly">
                <Building2 size={17} strokeWidth={2} />
                <input
                  type="text"
                  value={profile?.company?.name ?? 'Acesso global'}
                  readOnly
                  aria-readonly="true"
                />
              </div>
            </div>

            <div className="settings-field">
              <span>Perfil de acesso</span>
              <div className="settings-input-wrap is-readonly">
                <ShieldCheck size={17} strokeWidth={2} />
                <input
                  type="text"
                  value={formatRole(profile?.role ?? user?.role)}
                  readOnly
                  aria-readonly="true"
                />
              </div>
            </div>

            {canEditProfile ? (
              <div className="settings-form-actions">
                <button
                  type="submit"
                  className="settings-button settings-button--primary"
                  disabled={isLoading || isSaving}
                >
                  <Save size={17} strokeWidth={2.1} />
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            ) : null}
          </form>
        </section>

        <aside className="settings-card settings-account-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <ShieldCheck size={20} strokeWidth={2.1} />
            </div>

            <div>
              <h2>Conta</h2>
              <p>Informações administrativas da sua sessão.</p>
            </div>
          </div>

          <dl className="settings-account-list">
            <div>
              <dt>Status</dt>
              <dd>
                <span
                  className={
                    profile?.status === 'ACTIVE'
                      ? 'settings-status settings-status--active'
                      : 'settings-status'
                  }
                >
                  {formatStatus(profile?.status)}
                </span>
              </dd>
            </div>

            <div>
              <dt>Perfil</dt>
              <dd>{formatRole(profile?.role ?? user?.role)}</dd>
            </div>

            <div>
              <dt>Empresa</dt>
              <dd>{profile?.company?.name ?? 'Acesso global'}</dd>
            </div>

            <div>
              <dt>Último acesso</dt>
              <dd>{formatDateTime(profile?.lastLoginAt)}</dd>
            </div>

            <div>
              <dt>Conta criada em</dt>
              <dd>{formatDateTime(profile?.createdAt)}</dd>
            </div>
          </dl>

          <div className="settings-account-note">
            <strong>Segurança da conta</strong>
            <p>
              {canEditProfile
                ? 'Empresa, perfil de acesso, status e senha seguem fluxos administrativos próprios para evitar alterações acidentais.'
                : 'Nome, email, telefone, cargo, empresa e permissões são gerenciados por administradores e supervisores. Você pode alterar apenas sua foto de perfil nesta tela.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function getUserInitials(name?: string | null) {
  if (!name?.trim()) {
    return 'CM';
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatRole(role?: string) {
  const labels: Record<string, string> = {
    MASTER_ADMIN: 'Administrador master',
    SUPERVISOR: 'Supervisor',
    CLIENT_USER: 'Usuário cliente',
    TECHNICIAN: 'Técnico',
  };

  if (!role) {
    return 'Não identificado';
  }

  return labels[role] ?? role;
}

function formatStatus(status?: string) {
  const labels: Record<string, string> = {
    ACTIVE: 'Ativo',
    INACTIVE: 'Inativo',
    BLOCKED: 'Bloqueado',
  };

  if (!status) {
    return 'Não identificado';
  }

  return labels[status] ?? status;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Não informado';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Não informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) {
    return fallback;
  }

  const message = error.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(' ');
  }

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return fallback;
}
