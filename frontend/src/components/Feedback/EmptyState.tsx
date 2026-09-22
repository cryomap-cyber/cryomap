import { EmptyState as CryoEmptyState } from '../ui/CryoUi';

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
    <CryoEmptyState
      title={title}
      description={description}
      compact={compact}
    />
  );
}