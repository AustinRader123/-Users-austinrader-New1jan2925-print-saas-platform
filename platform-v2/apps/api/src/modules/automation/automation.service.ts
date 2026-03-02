import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAutomationRuleDto, RunAutomationDto, UpdateAutomationRuleDto } from './automation.dto';

@Injectable()
export class AutomationService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, storeId?: string) {
    return this.prisma.automationRule.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(storeId ? { storeId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  create(tenantId: string, dto: CreateAutomationRuleDto) {
    return this.prisma.automationRule.create({
      data: {
        tenantId,
        storeId: dto.storeId,
        name: dto.name.trim(),
        triggerType: dto.triggerType.trim(),
        conditions: dto.conditions ?? {},
        actions: dto.actions,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateAutomationRuleDto) {
    const existing = await this.prisma.automationRule.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('automation rule not found');
    }

    return this.prisma.automationRule.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        conditions: dto.conditions,
        actions: dto.actions,
        isActive: dto.isActive,
      },
    });
  }

  async run(tenantId: string, id: string, dto: RunAutomationDto) {
    const rule = await this.prisma.automationRule.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!rule) {
      throw new NotFoundException('automation rule not found');
    }

    if (!rule.isActive) {
      return {
        ruleId: rule.id,
        executed: false,
        reason: 'rule inactive',
      };
    }

    const context = dto.context ?? {};
    const conditions = (rule.conditions ?? {}) as Record<string, unknown>;
    if (!this.matchesConditions(conditions, context)) {
      return {
        ruleId: rule.id,
        executed: false,
        reason: 'conditions not met',
      };
    }

    const actionList = this.normalizeActions(rule.actions);
    const sideEffects: Array<Record<string, unknown>> = [];

    await this.prisma.$transaction(async (tx: any) => {
      for (const action of actionList) {
        if (action.type === 'NOTIFY') {
          const notification = await tx.notification.create({
            data: {
              tenantId,
              storeId: dto.storeId ?? rule.storeId,
              channel: action.channel || 'IN_APP',
              subject: action.subject || `Automation: ${rule.name}`,
              body: action.body || JSON.stringify(context),
              status: 'QUEUED',
            },
            select: { id: true, channel: true, status: true, createdAt: true },
          });
          sideEffects.push({ type: 'NOTIFICATION', notification });
          continue;
        }

        if (action.type === 'LOG') {
          const log = await tx.activityLog.create({
            data: {
              tenantId,
              storeId: dto.storeId ?? rule.storeId,
              entityType: 'AUTOMATION_RULE',
              entityId: rule.id,
              action: action.action || 'RULE_EXECUTED',
              payload: {
                ruleName: rule.name,
                triggerType: rule.triggerType,
                context,
                message: action.message || 'automation run',
              },
            },
            select: { id: true, action: true, createdAt: true },
          });
          sideEffects.push({ type: 'ACTIVITY_LOG', log });
          continue;
        }
      }
    });

    return {
      ruleId: rule.id,
      executed: true,
      actionCount: actionList.length,
      sideEffects,
    };
  }

  private matchesConditions(conditions: Record<string, unknown>, context: Record<string, unknown>) {
    for (const [key, value] of Object.entries(conditions)) {
      if (context[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private normalizeActions(actions: unknown) {
    if (Array.isArray(actions)) {
      return actions as Array<Record<string, any>>;
    }

    if (actions && typeof actions === 'object' && Array.isArray((actions as any).steps)) {
      return (actions as any).steps as Array<Record<string, any>>;
    }

    if (actions && typeof actions === 'object') {
      return [actions as Record<string, any>];
    }

    return [];
  }
}
