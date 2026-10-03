import { UserRole } from '../roles/roles.enum';
import { Permission } from './permissions.enum';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),

  [UserRole.ADMIN]: [
    Permission.WORK_VIEW,
    Permission.WORK_ASSIGN_SELF,
    Permission.WORK_ASSIGN_DEVELOPER,
    Permission.WORK_UPDATE,
    Permission.WORK_REVIEW,

    Permission.TEST_VIEW,
    Permission.TEST_ASSIGN,
    Permission.TEST_REVIEW,
    Permission.TEST_APPROVE,
    Permission.TEST_RETEST,

    Permission.DEVICE_VIEW,
    Permission.DEVICE_CREATE,
    Permission.DEVICE_UPDATE,
    Permission.DEVICE_DEACTIVATE,

    Permission.RDS_VIEW,
    Permission.RDS_MANAGE,
    Permission.RDS_USERS_MANAGE,
    Permission.RDS_MIGRATIONS,
    Permission.RDS_BACKUP,
    Permission.RDS_RESTORE,
    Permission.RDS_DATA_MANAGE,

    Permission.EXPORT_CREATE,
    Permission.EXPORT_VIEW,
    Permission.EXPORT_DOWNLOAD,

    Permission.AUDIT_VIEW,
    // Note: Admin cannot WORK_ASSIGN_ADMIN, AUDIT_VIEW_ALL, USER_MANAGE (for admin accounts), ROLE_MANAGE
  ],

  [UserRole.DEVELOPER]: [
    Permission.WORK_VIEW,
    Permission.WORK_UPDATE,
    Permission.WORK_DOCUMENT,
    Permission.TEST_VIEW,
    Permission.TEST_ASSIGN, // Developer can assign and monitor testing objectives
  ],

  [UserRole.TESTER]: [
    Permission.TEST_VIEW,
    Permission.TEST_EXECUTE,
    Permission.TEST_SUBMIT,
    Permission.DEVICE_VIEW, // Tester can view compatible devices to select one in Quick Test
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}
