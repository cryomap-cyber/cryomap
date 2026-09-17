import type {
  ButtonHTMLAttributes,
  ReactNode,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { LoaderCircle } from 'lucide-react';

import './CryoUi.css';

export type UiTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  meta?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  meta,
}: PageHeaderProps) {
  return (
    <header className="cm-page-header">
      <div className="cm-page-header__main">
        {Icon ? (
          <span className="cm-page-header__icon" aria-hidden="true">
            <Icon size={22} strokeWidth={2.1} />
          </span>
        ) : null}

        <div className="cm-page-header__copy">
          {eyebrow ? (
            <span className="cm-page-header__eyebrow">{eyebrow}</span>
          ) : null}

          <h1>{title}</h1>

          {description ? <p>{description}</p> : null}

          {meta ? <div className="cm-page-header__meta">{meta}</div> : null}
        </div>
      </div>

      {actions ? (
        <div className="cm-page-header__actions">{actions}</div>
      ) : null}
    </header>
  );
}

type MetaPillProps = {
  children: ReactNode;
  icon?: LucideIcon;
  tone?: UiTone;
};

export function MetaPill({
  children,
  icon: Icon,
  tone = 'neutral',
}: MetaPillProps) {
  return (
    <span className={`cm-meta-pill cm-meta-pill--${tone}`}>
      {Icon ? <Icon size={13} strokeWidth={2.1} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export function ActionButton({
  children,
  icon: Icon,
  variant = 'secondary',
  className = '',
  ...buttonProps
}: ActionButtonProps) {
  return (
    <button
      {...buttonProps}
      className={`cm-button cm-button--${variant} ${className}`.trim()}
    >
      {Icon ? <Icon size={17} strokeWidth={2.2} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}

type MetricCardProps = {
  label: string;
  value: number | string;
  detail?: string;
  icon: LucideIcon;
  tone?: UiTone;
};

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'info',
}: MetricCardProps) {
  return (
    <article className={`cm-metric-card cm-metric-card--${tone}`}>
      <div className="cm-metric-card__top">
        <span className="cm-metric-card__icon" aria-hidden="true">
          <Icon size={20} strokeWidth={2.15} />
        </span>
        <span className="cm-metric-card__label">{label}</span>
      </div>

      <strong className="cm-metric-card__value">{value}</strong>

      {detail ? (
        <span className="cm-metric-card__detail">{detail}</span>
      ) : null}
    </article>
  );
}

type SectionCardProps = {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  tone?: UiTone;
  className?: string;
};

export function SectionCard({
  children,
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
  tone = 'neutral',
  className = '',
}: SectionCardProps) {
  return (
    <article
      className={`cm-section-card cm-section-card--${tone} ${className}`.trim()}
    >
      <header className="cm-section-card__header">
        <div className="cm-section-card__title-wrap">
          {Icon ? (
            <span className="cm-section-card__icon" aria-hidden="true">
              <Icon size={19} strokeWidth={2.15} />
            </span>
          ) : null}

          <div>
            {eyebrow ? (
              <span className="cm-section-card__eyebrow">{eyebrow}</span>
            ) : null}

            <h2>{title}</h2>

            {description ? (
              <p className="cm-section-card__description">{description}</p>
            ) : null}
          </div>
        </div>

        {action ? (
          <div className="cm-section-card__action">{action}</div>
        ) : null}
      </header>

      <div className="cm-section-card__body">{children}</div>
    </article>
  );
}

type StatusBadgeProps = {
  children: ReactNode;
  tone?: UiTone;
};

export function StatusBadge({
  children,
  tone = 'neutral',
}: StatusBadgeProps) {
  return (
    <span className={`cm-status-badge cm-status-badge--${tone}`}>
      {children}
    </span>
  );
}

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
};

export function EmptyState({
  title,
  description,
  icon: Icon,
}: EmptyStateProps) {
  return (
    <div className="cm-empty-state">
      {Icon ? (
        <span className="cm-empty-state__icon" aria-hidden="true">
          <Icon size={22} strokeWidth={2} />
        </span>
      ) : null}

      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
  );
}

type LoadingStateProps = {
  title?: string;
  description?: string;
};

export function LoadingState({
  title = 'Carregando informações',
  description,
}: LoadingStateProps) {
  return (
    <div className="cm-loading-state" role="status" aria-live="polite">
      <span className="cm-loading-state__icon" aria-hidden="true">
        <LoaderCircle size={26} strokeWidth={2} />
      </span>

      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
  );
}

type InlineNoticeProps = {
  title: string;
  description?: string;
  tone?: UiTone;
  action?: ReactNode;
  icon?: LucideIcon;
};

export function InlineNotice({
  title,
  description,
  tone = 'info',
  action,
  icon: Icon,
}: InlineNoticeProps) {
  return (
    <div className={`cm-inline-notice cm-inline-notice--${tone}`}>
      {Icon ? (
        <span className="cm-inline-notice__icon" aria-hidden="true">
          <Icon size={20} strokeWidth={2.1} />
        </span>
      ) : null}

      <div className="cm-inline-notice__copy">
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>

      {action ? <div className="cm-inline-notice__action">{action}</div> : null}
    </div>
  );
}
