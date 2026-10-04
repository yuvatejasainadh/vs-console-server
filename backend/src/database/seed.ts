import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  DataStore,
  UserEntity,
  DeviceEntity,
  WorkItemEntity,
  TestingObjectiveEntity,
  DatabaseBackupEntity,
  DatabaseUserEntity,
} from './data-store';
import { UserRole } from '../roles/roles.enum';
import { PASSWORD_SALT_ROUNDS } from '../config/constants';
import { Logger } from '../common/logger';

export async function seedDevelopmentData(store: DataStore = DataStore.getInstance()): Promise<{
  users: Record<string, UserEntity>;
  devices: DeviceEntity[];
  workItems: WorkItemEntity[];
  objectives: TestingObjectiveEntity[];
}> {
  const now = new Date().toISOString();

  // 1. Users
  const superAdminPass = await bcrypt.hash('SuperAdmin123!', PASSWORD_SALT_ROUNDS);
  const adminPass = await bcrypt.hash('AdminPass123!', PASSWORD_SALT_ROUNDS);
  const devPass = await bcrypt.hash('DevPass123!', PASSWORD_SALT_ROUNDS);
  const testerPass = await bcrypt.hash('TesterPass123!', PASSWORD_SALT_ROUNDS);

  const sainadh: UserEntity = {
    id: '11111111-1111-4111-a111-111111111111',
    email: 'sainadh@voiceshield.internal',
    password_hash: superAdminPass,
    display_name: 'Sainadh',
    role: UserRole.SUPER_ADMIN,
    status: 'ACTIVE',
    failed_login_attempts: 0,
    locked_until: null,
    last_login_at: now,
    created_at: now,
    updated_at: now,
  };

  const sainadhProd: UserEntity = {
    id: '11111111-1111-4111-a111-111111111112',
    email: 'sainadh@voiceshield.ai',
    password_hash: '$2a$12$rndt2CcnDURye4ndX6rWquhnDJ6a/thMWaoOOXD4u/Q7bMQApkwm6',
    display_name: 'Sainadh',
    role: UserRole.SUPER_ADMIN,
    status: 'ACTIVE',
    failed_login_attempts: 0,
    locked_until: null,
    last_login_at: now,
    created_at: now,
    updated_at: now,
  };

  const adminUser: UserEntity = {
    id: '22222222-2222-4222-a222-222222222222',
    email: 'admin@voiceshield.internal',
    password_hash: adminPass,
    display_name: 'Admin User',
    role: UserRole.ADMIN,
    status: 'ACTIVE',
    failed_login_attempts: 0,
    locked_until: null,
    last_login_at: now,
    created_at: now,
    updated_at: now,
  };

  const devOne: UserEntity = {
    id: '33333333-3333-4333-a333-333333333333',
    email: 'dev1@voiceshield.internal',
    password_hash: devPass,
    display_name: 'Developer One',
    role: UserRole.DEVELOPER,
    status: 'ACTIVE',
    failed_login_attempts: 0,
    locked_until: null,
    last_login_at: now,
    created_at: now,
    updated_at: now,
  };

  const devTwo: UserEntity = {
    id: '44444444-4444-4444-a444-444444444444',
    email: 'dev2@voiceshield.internal',
    password_hash: devPass,
    display_name: 'Developer Two',
    role: UserRole.DEVELOPER,
    status: 'ACTIVE',
    failed_login_attempts: 0,
    locked_until: null,
    last_login_at: now,
    created_at: now,
    updated_at: now,
  };

  const testerOne: UserEntity = {
    id: '55555555-5555-4555-a555-555555555555',
    email: 'tester1@voiceshield.internal',
    password_hash: testerPass,
    display_name: 'Tester One',
    role: UserRole.TESTER,
    status: 'ACTIVE',
    failed_login_attempts: 0,
    locked_until: null,
    last_login_at: now,
    created_at: now,
    updated_at: now,
  };

  store.users.set(sainadh.id, sainadh);
  store.users.set(sainadhProd.id, sainadhProd);
  store.users.set(adminUser.id, adminUser);
  store.users.set(devOne.id, devOne);
  store.users.set(devTwo.id, devTwo);
  store.users.set(testerOne.id, testerOne);

  // 2. Compatible Devices
  const devices: DeviceEntity[] = [
    {
      id: 'd1111111-1111-4111-a111-111111111111',
      device_name: 'Pixel 8 Pro',
      model_number: 'GC3VE',
      manufacturer: 'Google',
      android_version: 'Android 14 (API 34)',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'd2222222-2222-4222-a222-222222222222',
      device_name: 'Galaxy S24 Ultra',
      model_number: 'SM-S928B',
      manufacturer: 'Samsung',
      android_version: 'Android 14 (OneUI 6.1)',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'd3333333-3333-4333-a333-333333333333',
      device_name: 'Xiaomi 13 Pro',
      model_number: '2210132G',
      manufacturer: 'Xiaomi',
      android_version: 'Android 13 (HyperOS 1.0)',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    },
  ];

  devices.forEach((d) => store.devices.set(d.id, d));

  // 3. Work Items
  const workItem1: WorkItemEntity = {
    id: 'w1111111-1111-4111-a111-111111111111',
    title: 'Implement VoiceShield On-Device Scam Classifier Interop Module',
    description:
      'Write native C++ FFI interop layer for low-latency call stream pattern matching on Android ARM64.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    assigned_to: devOne.id,
    assigned_by: sainadh.id,
    created_at: now,
    updated_at: now,
  };

  const workItem2: WorkItemEntity = {
    id: 'w2222222-2222-4222-a222-222222222222',
    title: 'Fix Bluetooth SCO Audio Focus Lifecycle Transitions',
    description:
      'Ensure audio stream focus release gracefully handles incoming cellular interruptions.',
    priority: 'CRITICAL',
    status: 'ASSIGNED',
    assigned_to: devTwo.id,
    assigned_by: adminUser.id,
    created_at: now,
    updated_at: now,
  };

  store.workItems.set(workItem1.id, workItem1);
  store.workItems.set(workItem2.id, workItem2);

  // 4. Testing Objectives
  const obj1: TestingObjectiveEntity = {
    id: 'o1111111-1111-4111-a111-111111111111',
    title: 'Validate VoiceShield real-time scam detection across supported Android devices',
    description:
      'Manually execute test scenarios for live audio pattern matching on Google Pixel and Samsung devices.',
    target_area: 'Real-Time Audio Stream Analysis',
    assigned_to: testerOne.id,
    created_by: devOne.id,
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
  };

  store.testingObjectives.set(obj1.id, obj1);

  // 5. Database Backups
  const backup1: DatabaseBackupEntity = {
    id: 'b1111111-1111-4111-a111-111111111111',
    backup_name: 'voiceshield-rds-snapshot-daily-latest',
    storage_key: 'backups/rds/voiceshield_snap_daily.dump',
    size_bytes: 14285714,
    created_by: 'SYSTEM_AUTOMATION',
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  };
  store.databaseBackups.set(backup1.id, backup1);

  // 6. Database Users
  const dbUsers: DatabaseUserEntity[] = [
    {
      id: uuidv4(),
      username: 'voiceshield_admin',
      role: 'rds_superuser',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv4(),
      username: 'voiceshield_app',
      role: 'readwrite',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv4(),
      username: 'voiceshield_readonly',
      role: 'readonly',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    },
  ];
  dbUsers.forEach((u) => store.databaseUsers.set(u.id, u));

  // Seed Audit Logs
  store.auditLogs.set('a1', {
    id: uuidv4(),
    event_type: 'SYSTEM_BOOTSTRAP',
    actor_id: sainadh.id,
    actor_role: UserRole.SUPER_ADMIN,
    action: 'INITIALIZE_DEV_DATA',
    resource_type: 'SYSTEM',
    created_at: now,
  });

  return {
    users: {
      sainadh,
      sainadhProd,
      adminUser,
      devOne,
      devTwo,
      testerOne,
    },
    devices,
    workItems: [workItem1, workItem2],
    objectives: [obj1],
  };
}
