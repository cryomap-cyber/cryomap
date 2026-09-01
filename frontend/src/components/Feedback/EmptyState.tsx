import './EmptyState.css';

type EmptyStateProps = {
  title?: string;
  description?: string;
  compact?: boolean;
};

export function EmptyState({
  title = 'Nenhum registro encontrado.',
  description = 'Ajuste os filtros ou cadastre novas informações para visualizar dados aqui.',
  compact = false,
}: EmptyStateProps) {
  return (
    <section
      className={compact ? 'empty-state compact' : 'empty-state'}
      role="status"
    >
      <div className="empty-state-icon" aria-hidden="true">
        <span />
      </div>

      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
    </section>
  );
}
