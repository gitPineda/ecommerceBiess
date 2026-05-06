import brand from './brand.json';

export const ROLE_OPTIONS = [
  {
    id: brand.roles.customer,
    label: 'Cliente',
    description: 'Compra productos y consulta sus pedidos.',
  },
  {
    id: brand.roles.seller,
    label: 'Vendedor',
    description: 'Gestiona sus productos y revisa sus ventas.',
  },
  {
    id: brand.roles.admin,
    label: 'Administrador',
    description: 'Gestiona catalogo, usuarios, categorias y empresa.',
  },
  {
    id: brand.roles.superadmin,
    label: 'Superadministrador',
    description: 'Tiene acceso total sobre la administracion.',
  },
];

export function isAdminRole(role) {
  return role === brand.roles.admin || role === brand.roles.superadmin;
}

export function getRoleLabel(role) {
  return (
    ROLE_OPTIONS.find((option) => option.id === role)?.label ||
    role ||
    'Sin rol'
  );
}
