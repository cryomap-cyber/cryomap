import './LoadingState.css';

type LoadingStateProps = {
  title?: string;
  description?: string;
};

export function LoadingState({
  title = 'Carregando...',
  description = 'Buscando dados atualizados do CryoMap.',
}: LoadingStateProps) {
  return (
    <section className="loading-state" role="status" aria-live="polite">
      <div className="loading-state-orb" aria-hidden="true">
        <span />
      </div>

      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
    </section>
  );
}
