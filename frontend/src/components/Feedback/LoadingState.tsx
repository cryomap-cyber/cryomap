import { LoadingState as CryoLoadingState } from '../ui/CryoUi';

type LoadingStateProps = {
  title?: string;
  description?: string;
  compact?: boolean;
};

export function LoadingState({
  title = 'Carregando...',
  description = 'Buscando dados atualizados do CryoMap.',
  compact = false,
}: LoadingStateProps) {
  return (
    <CryoLoadingState
      title={title}
      description={description}
      compact={compact}
    />
  );
}