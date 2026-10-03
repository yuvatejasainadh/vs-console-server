import { v4 as uuidv4 } from 'uuid';
import {
  DataStore,
  DeviceEntity,
  DeviceStatusHistoryEntity,
} from '../database/data-store';
import { UserRole } from '../roles/roles.enum';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser, PaginatedResult, PaginationQuery } from '../common/types';
import { ForbiddenError, NotFoundError, BadRequestError } from '../common/errors';
import { CreateDeviceDto, UpdateDeviceDto, DeactivateDeviceDto } from './device.dto';

export class DeviceService {
  private static instance: DeviceService;
  private store = DataStore.getInstance();
  private auditService = AuditService.getInstance();

  private constructor() {}

  static getInstance(): DeviceService {
    if (!DeviceService.instance) {
      DeviceService.instance = new DeviceService();
    }
    return DeviceService.instance;
  }

  async list(
    actor: AuthenticatedUser,
    query: PaginationQuery & { status?: 'ACTIVE' | 'INACTIVE'; search?: string }
  ): Promise<PaginatedResult<DeviceEntity>> {
    let devices = Array.from(this.store.devices.values());

    // If Tester, only show active devices unless specifically querying
    if (query.status) {
      devices = devices.filter((d) => d.status === query.status);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      devices = devices.filter(
        (d) =>
          d.device_name.toLowerCase().includes(s) ||
          d.model_number.toLowerCase().includes(s) ||
          d.manufacturer.toLowerCase().includes(s)
      );
    }

    devices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const total = devices.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const pagedData = devices.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: pagedData,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<DeviceEntity> {
    const device = this.store.devices.get(id);
    if (!device) {
      throw new NotFoundError('Device not found');
    }
    return device;
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateDeviceDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<DeviceEntity> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only Admins and Super Admins can manage devices.');
    }

    const now = new Date().toISOString();
    const device: DeviceEntity = {
      id: uuidv4(),
      device_name: dto.deviceName,
      model_number: dto.modelNumber,
      manufacturer: dto.manufacturer,
      android_version: dto.androidVersion,
      status: dto.status || 'ACTIVE',
      created_at: now,
      updated_at: now,
    };

    this.store.devices.set(device.id, device);

    await this.auditService.record({
      eventType: 'DEVICE_CREATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CREATE_DEVICE',
      resourceType: 'DEVICE',
      resourceId: device.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { deviceName: device.device_name, modelNumber: device.model_number },
    });

    return device;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateDeviceDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<DeviceEntity> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only Admins and Super Admins can manage devices.');
    }

    const device = await this.getById(actor, id);
    const prevStatus = device.status;

    if (dto.deviceName) device.device_name = dto.deviceName;
    if (dto.modelNumber) device.model_number = dto.modelNumber;
    if (dto.manufacturer) device.manufacturer = dto.manufacturer;
    if (dto.androidVersion) device.android_version = dto.androidVersion;

    if (dto.status && dto.status !== prevStatus) {
      device.status = dto.status;
      const history: DeviceStatusHistoryEntity = {
        id: uuidv4(),
        device_id: device.id,
        from_status: prevStatus,
        to_status: dto.status,
        changed_by: actor.id,
        reason: 'Manual status update',
        created_at: new Date().toISOString(),
      };
      this.store.deviceStatusHistory.set(history.id, history);
    }

    device.updated_at = new Date().toISOString();

    await this.auditService.record({
      eventType: 'DEVICE_UPDATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'UPDATE_DEVICE',
      resourceType: 'DEVICE',
      resourceId: device.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { updatedFields: Object.keys(dto) },
    });

    return device;
  }

  async deactivate(
    actor: AuthenticatedUser,
    id: string,
    dto: DeactivateDeviceDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<DeviceEntity> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only Admins and Super Admins can manage devices.');
    }

    const device = await this.getById(actor, id);
    if (device.status === 'INACTIVE') {
      throw new BadRequestError('Device is already inactive');
    }

    const now = new Date().toISOString();
    device.status = 'INACTIVE';
    device.updated_at = now;

    const history: DeviceStatusHistoryEntity = {
      id: uuidv4(),
      device_id: device.id,
      from_status: 'ACTIVE',
      to_status: 'INACTIVE',
      changed_by: actor.id,
      reason: dto.reason || 'Deactivated by administrator',
      created_at: now,
    };
    this.store.deviceStatusHistory.set(history.id, history);

    await this.auditService.record({
      eventType: 'DEVICE_DEACTIVATED',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'DEACTIVATE_DEVICE',
      resourceType: 'DEVICE',
      resourceId: device.id,
      requestId: meta?.requestId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      metadata: { reason: dto.reason },
    });

    return device;
  }
}
