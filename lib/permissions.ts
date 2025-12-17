import { UserRole, Permission, DEFAULT_PERMISSIONS } from './types';

export function hasPermission(
  role: UserRole | null | undefined,
  module: string,
  action: 'view' | 'create' | 'edit' | 'delete',
  customPermissions?: Permission[]
): boolean {
  if (!role) return false;
  
  // Use custom permissions if provided, otherwise use defaults
  const permissions = customPermissions || DEFAULT_PERMISSIONS[role] || [];
  const modulePermission = permissions.find(p => p.module === module);
  
  if (!modulePermission) return false;
  
  switch (action) {
    case 'view': return modulePermission.canView;
    case 'create': return modulePermission.canCreate;
    case 'edit': return modulePermission.canEdit;
    case 'delete': return modulePermission.canDelete;
    default: return false;
  }
}

export function canAccessModule(role: UserRole | null | undefined, module: string): boolean {
  return hasPermission(role, module, 'view');
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    sales: 'Sales',
    support: 'Support',
    viewer: 'Viewer',
  };
  return labels[role] || role;
}

export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    sales: 'bg-green-100 text-green-800',
    support: 'bg-yellow-100 text-yellow-800',
    viewer: 'bg-gray-100 text-gray-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}
