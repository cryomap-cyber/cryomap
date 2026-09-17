import { type FormEvent, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';

import cryomapLogo from '../../assets/cryomap-logo.png';
import { useAuth } from '../../contexts/useAuth';
import './Login.css';

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError('Email ou senha inválidos.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero" aria-hidden="true">
        <div className="login-hero-card">
          <div className="login-hero-brand">
            <img src={cryomapLogo} alt="" />

            <div>
              <strong>CryoMap</strong>
              <span>PCM & Monitoramento Térmico</span>
            </div>
          </div>

          <div className="login-hero-copy">
            <span className="login-kicker">Operação inteligente</span>

            <h1>Monitoramento térmico e gestão operacional.</h1>

            <p>
              Acompanhe ambientes, sensores, equipamentos, tarefas,
              atendimentos, alertas e relatórios em uma única plataforma.
            </p>
          </div>

          <div className="login-hero-footer">
            <span>Monitoramento</span>
            <span>Manutenção</span>
            <span>Operação</span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <form
          className="login-form"
          onSubmit={handleSubmit}
          autoComplete="on"
        >
          <div className="login-mobile-brand">
            <div className="login-logo">
              <img src={cryomapLogo} alt="CryoMap" />
            </div>

            <div className="login-mobile-brand-copy">
              <strong>CryoMap</strong>
              <span>Monitoramento e operação</span>
            </div>
          </div>

          <div className="login-heading">
            <span className="login-kicker">Acesso</span>
            <h2>Bem-vindo ao CryoMap</h2>
            <p>Entre com seu usuário e senha para continuar.</p>
          </div>

          <div className="login-fields">
            <label className="login-field">
              <span>Email</span>

              <input
                type="email"
                value={email}
                autoComplete="email"
                inputMode="email"
                placeholder="seu@email.com"
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="login-field">
              <span>Senha</span>

              <div className="login-password-field">
                <input
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={password}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  onChange={(event) => setPassword(event.target.value)}
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  aria-label={
                    isPasswordVisible
                      ? 'Ocultar senha'
                      : 'Mostrar senha'
                  }
                  aria-pressed={isPasswordVisible}
                  onClick={() =>
                    setIsPasswordVisible((current) => !current)
                  }
                >
                  {isPasswordVisible ? (
                    <EyeOff size={19} strokeWidth={2} />
                  ) : (
                    <Eye size={19} strokeWidth={2} />
                  )}
                </button>
              </div>
            </label>
          </div>

          {error ? (
            <strong className="login-error" role="alert">
              {error}
            </strong>
          ) : null}

          <button
            type="submit"
            className="login-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="login-support-copy">
            Acesso exclusivo para usuários cadastrados no CryoMap.
          </p>
        </form>
      </section>
    </main>
  );
}
