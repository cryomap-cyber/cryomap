import {
  type ReactNode,
  useEffect,
  useState,
} from 'react';

import './CollapsibleSection.css';

type CollapsibleSectionProps = {
  title: string;

  openDescription?: string;
  closedDescription?: string;

  openLabel?: string;
  closedLabel?: string;

  storageKey: string;

  defaultOpen?: boolean;
  defaultOpenOnMobile?: boolean;

  count?: number;

  children: ReactNode;

  className?: string;
  contentClassName?: string;

  variant?: 'section' | 'toolbar';
};

export function CollapsibleSection({
  title,
  openDescription,
  closedDescription,
  openLabel = 'Ocultar',
  closedLabel = 'Mostrar',
  storageKey,
  defaultOpen = true,
  defaultOpenOnMobile,
  count,
  children,
  className = '',
  contentClassName = '',
  variant = 'section',
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return defaultOpen;
    }

    const storedValue =
      window.localStorage.getItem(storageKey);

    if (storedValue !== null) {
      return storedValue === 'true';
    }

    if (defaultOpenOnMobile !== undefined) {
      const isMobile = window.matchMedia(
        '(max-width: 700px)',
      ).matches;

      if (isMobile) {
        return defaultOpenOnMobile;
      }
    }

    return defaultOpen;
  });

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      String(isOpen),
    );
  }, [isOpen, storageKey]);

  const description = isOpen
    ? openDescription
    : closedDescription;

  const rootClassName = [
    'collapsible-section',
    `collapsible-section--${variant}`,
    isOpen ? 'is-open' : 'is-closed',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const bodyClassName = [
    'collapsible-section__body',
    contentClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={rootClassName}>
      <div className="collapsible-section__header">
        <div className="collapsible-section__heading">
          <strong>{title}</strong>

          {description ? (
            <span>{description}</span>
          ) : null}
        </div>

        <button
          type="button"
          className="collapsible-section__toggle"
          aria-expanded={isOpen}
          onClick={() =>
            setIsOpen((current) => !current)
          }
        >
          <span>
            {isOpen ? openLabel : closedLabel}
          </span>

          {count !== undefined && count > 0 ? (
            <strong>{count}</strong>
          ) : null}
        </button>
      </div>

      {isOpen ? (
        <div className={bodyClassName}>
          {children}
        </div>
      ) : null}
    </section>
  );
}