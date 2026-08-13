import type { UserRole } from '../types/user';

export type NavigationItem = {
  label: string;
  to: string;
  allowedRoles: UserRole[];
};

export const allRoles: UserRole[] = [
  'MASTER_ADMIN',
  'SUPERVISOR',
  'CLIENT_USER',
  'TECHNICIAN',
];

export const managementRoles: UserRole[] = ['MASTER_ADMIN', 'SUPERVISOR'];

export const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    allowedRoles: allRoles,
  },
  {
    label: 'Empresas',
    to: '/companies',
    allowedRoles: managementRoles,
  },
  {
    label: 'Usuários',
    to: '/users',
    allowedRoles: managementRoles,
  },
  {
    label: 'Salas',
    to: '/rooms',
    allowedRoles: allRoles,
  },
  {
    label: 'Equipamentos',
    to: '/equipments',
    allowedRoles: allRoles,
  },
  {
    label: 'Sensores',
    to: '/sensors',
    allowedRoles: ['MASTER_ADMIN', 'SUPERVISOR', 'CLIENT_USER'],
  },
  {
    label: 'Leituras',
    to: '/temperature-readings',
    allowedRoles: allRoles,
  },
  {
    label: 'Alertas',
    to: '/thermal-alerts',
    allowedRoles: allRoles,
  },
  {
    label: 'Temp. Equipamentos',
    to: '/equipment-temperature-readings',
    allowedRoles: ['MASTER_ADMIN', 'SUPERVISOR', 'TECHNICIAN'],
  },
  {
    label: 'Chamados',
    to: '/tasks',
    allowedRoles: ['MASTER_ADMIN', 'SUPERVISOR', 'TECHNICIAN'],
  },
  {
    label: 'Atendimentos',
    to: '/service-records',
    allowedRoles: ['MASTER_ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_USER'],
  },
  {
    label: 'Anexos',
    to: '/attachments',
    allowedRoles: allRoles,
  },
  {
    label: 'Relatórios',
    to: '/reports',
    allowedRoles: ['MASTER_ADMIN', 'SUPERVISOR', 'CLIENT_USER'],
  },
];

export function canAccessRoute(role: UserRole | undefined, pathname: string) {
  if (!role) {
    return false;
  }

  const route = navigationItems.find((item) => item.to === pathname);

  if (!route) {
    return false;
  }

  return route.allowedRoles.includes(role);
}

export function getAllowedNavigationItems(role: UserRole | undefined) {
  if (!role) {
    return [];
  }

  return navigationItems.filter((item) => item.allowedRoles.includes(role));
}
