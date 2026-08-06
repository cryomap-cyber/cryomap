import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import cryomapLogo from '../../assets/cryomap-logo.png';
import { useAuth } from '../../contexts/useAuth';
import './Login.css';

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('admin@cryomap.local');
  const [password, setPassword] = useState('Admin@123456');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      <section className="login-hero">
        <div className="login-hero-card">
          <span className="login-kicker">CryoMap</span>

          <h1>Monitoramento térmico e gestão operacional.</h1>

          <p>
            Acompanhe salas, sensores, equipamentos, tarefas, atendimentos,
            alertas e relatórios em uma plataforma única.
          </p>
        </div>
      </section>

      <section className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-logo">
             <img src={cryomapLogo} alt="CryoMap" />
              </div>
          <div>
            <span className="login-kicker">Acesso</span>
            <h2>Entrar no CryoMap</h2>
            <p>Use o usuário Master Admin criado no backend.</p>
          </div>

          <label>
            Email
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <strong className="login-error">{error}</strong>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
