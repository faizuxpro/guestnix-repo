import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  adminBillingAuditLogs,
  coupons,
  guidebooks,
  payments,
  profiles,
  properties,
  subscriptions,
} from "@/lib/db/schema";
import { invalidateAllGuideServable } from "@/lib/billing/guide-access";

const COUPON_CODE_RE = /^[A-Za-z0-9_-]{3,64}$/;

const couponBaseSchema = z.object({
  code: z.string().trim().min(3).max(64).regex(COUPON_CODE_RE),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.coerce.number().int().positive(),
  appliesTo: z.string().trim().min(1).max(64).default("all"),
  maxRedemptions: z.coerce.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  active: z.boolean().default(true),
});

function validateCouponDiscount(
  value: { discountType?: "percent" | "fixed"; discountValue?: number },
  ctx: z.RefinementCtx
) {
    if (
      value.discountType === "percent" &&
      typeof value.discountValue === "number" &&
      value.discountValue > 100
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Percent discounts must be between 1 and 100.",
      });
    }
}

const couponInputSchema = couponBaseSchema.superRefine(validateCouponDiscount);
const couponPatchSchema = couponBaseSchema
  .partial()
  .superRefine(validateCouponDiscount);

const archiveCouponSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

const trialPatchSchema = z.object({
  trialEndsAt: z.string().datetime().nullable(),
  reason: z.string().trim().min(3).max(500),
});

export class AdminBillingError extends Error {
  constructor(
    message: string,
    public status = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = "AdminBillingError";
  }
}

function serializeDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function couponSnapshot(row: typeof coupons.$inferSelect) {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discountType,
    discountValue: row.discountValue,
    appliesTo: row.appliesTo,
    maxRedemptions: row.maxRedemptions,
    redemptionCount: row.redemptionCount,
    expiresAt: serializeDate(row.expiresAt),
    active: row.active,
    archivedAt: serializeDate(row.archivedAt),
  };
}

function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase();
}

async function assertUniqueCouponCode(code: string, exceptId?: string) {
  const normalized = normalizeCouponCode(code);
  const [existing] = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(
      exceptId
        ? sql`lower(${coupons.code}) = ${normalized.toLowerCase()} and ${coupons.id} <> ${exceptId}`
        : sql`lower(${coupons.code}) = ${normalized.toLowerCase()}`
    )
    .limit(1);

  if (existing) {
    throw new AdminBillingError("A coupon with that code already exists.", 409);
  }
}

async function writeAudit(input: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}) {
  await db.insert(adminBillingAuditLogs).values({
    actorUserId: input.actorUserId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    before: input.before ?? {},
    after: input.after ?? {},
    reason: input.reason ?? null,
  });
}

export async function listAdminCoupons() {
  const [couponRows, usageRows] = await Promise.all([
    db.select().from(coupons).orderBy(desc(coupons.createdAt)),
    db
      .select({
        code: sql<string>`lower(${payments.couponCode})`,
        paymentCount: sql<number>`count(*)::int`,
        amountTotal: sql<number>`coalesce(sum(${payments.amount}), 0)::int`,
        lastUsedAt: sql<Date | null>`max(${payments.createdAt})`,
      })
      .from(payments)
      .where(sql`${payments.couponCode} is not null and ${payments.couponCode} <> ''`)
      .groupBy(sql`lower(${payments.couponCode})`),
  ]);

  const usage = new Map(
    usageRows.map((row) => [
      row.code,
      {
        paymentCount: Number(row.paymentCount ?? 0),
        amountTotal: Number(row.amountTotal ?? 0),
        lastUsedAt: serializeDate(row.lastUsedAt),
      },
    ])
  );

  return couponRows.map((row) => ({
    ...couponSnapshot(row),
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    usage: usage.get(row.code.toLowerCase()) ?? {
      paymentCount: 0,
      amountTotal: 0,
      lastUsedAt: null,
    },
  }));
}

export async function createAdminCoupon(body: unknown, actorUserId: string) {
  const parsed = couponInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new AdminBillingError("Invalid coupon.", 400, parsed.error.flatten());
  }

  const code = normalizeCouponCode(parsed.data.code);
  await assertUniqueCouponCode(code);

  const [created] = await db
    .insert(coupons)
    .values({
      code,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      appliesTo: parsed.data.appliesTo,
      maxRedemptions: parsed.data.maxRedemptions ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      active: parsed.data.active,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning();

  await writeAudit({
    actorUserId,
    action: "coupon.create",
    targetType: "coupon",
    targetId: created.id,
    after: couponSnapshot(created),
  });

  return created;
}

export async function updateAdminCoupon(
  id: string,
  body: unknown,
  actorUserId: string
) {
  const parsed = couponPatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new AdminBillingError("Invalid coupon update.", 400, parsed.error.flatten());
  }

  const [existing] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  if (!existing) throw new AdminBillingError("Coupon not found.", 404);

  const patch: Partial<typeof coupons.$inferInsert> = {
    updatedAt: new Date(),
    updatedBy: actorUserId,
  };

  if (parsed.data.code !== undefined) {
    const code = normalizeCouponCode(parsed.data.code);
    await assertUniqueCouponCode(code, id);
    patch.code = code;
  }
  if (parsed.data.discountType !== undefined) patch.discountType = parsed.data.discountType;
  if (parsed.data.discountValue !== undefined) patch.discountValue = parsed.data.discountValue;
  if (parsed.data.appliesTo !== undefined) patch.appliesTo = parsed.data.appliesTo;
  if (parsed.data.maxRedemptions !== undefined)
    patch.maxRedemptions = parsed.data.maxRedemptions;
  if (parsed.data.expiresAt !== undefined)
    patch.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  if (parsed.data.active !== undefined) patch.active = parsed.data.active;

  const [updated] = await db
    .update(coupons)
    .set(patch)
    .where(eq(coupons.id, id))
    .returning();

  await writeAudit({
    actorUserId,
    action: "coupon.update",
    targetType: "coupon",
    targetId: id,
    before: couponSnapshot(existing),
    after: couponSnapshot(updated),
  });

  return updated;
}

export async function archiveAdminCoupon(
  id: string,
  body: unknown,
  actorUserId: string
) {
  const parsed = archiveCouponSchema.safeParse(body ?? {});
  if (!parsed.success) {
    throw new AdminBillingError("Invalid archive request.", 400, parsed.error.flatten());
  }

  const [existing] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  if (!existing) throw new AdminBillingError("Coupon not found.", 404);

  const [updated] = await db
    .update(coupons)
    .set({
      active: false,
      archivedAt: existing.archivedAt ?? new Date(),
      updatedAt: new Date(),
      updatedBy: actorUserId,
    })
    .where(eq(coupons.id, id))
    .returning();

  await writeAudit({
    actorUserId,
    action: "coupon.archive",
    targetType: "coupon",
    targetId: id,
    before: couponSnapshot(existing),
    after: couponSnapshot(updated),
    reason: parsed.data.reason,
  });

  return { ok: true };
}

export async function getAdminCouponUsage(id: string) {
  const [coupon] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  if (!coupon) throw new AdminBillingError("Coupon not found.", 404);

  const usage = await db
    .select({
      id: payments.id,
      provider: payments.provider,
      providerSaleId: payments.providerSaleId,
      userId: payments.userId,
      email: payments.email,
      userEmail: profiles.email,
      fullName: profiles.fullName,
      plan: payments.plan,
      amount: payments.amount,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .leftJoin(profiles, eq(payments.userId, profiles.id))
    .where(sql`lower(${payments.couponCode}) = ${coupon.code.toLowerCase()}`)
    .orderBy(desc(payments.createdAt))
    .limit(100);

  return {
    coupon: couponSnapshot(coupon),
    usage: usage.map((row) => ({
      ...row,
      createdAt: serializeDate(row.createdAt),
    })),
  };
}

export async function listAdminTrials() {
  const [
    userRows,
    guidebookStats,
    propertyStats,
    paymentStats,
  ] = await Promise.all([
    db
      .select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
        createdAt: profiles.createdAt,
        profileUpdatedAt: profiles.updatedAt,
        plan: subscriptions.plan,
        status: subscriptions.status,
        billingInterval: subscriptions.billingInterval,
        trialEndsAt: subscriptions.trialEndsAt,
        subscriptionUpdatedAt: subscriptions.updatedAt,
      })
      .from(profiles)
      .leftJoin(subscriptions, eq(subscriptions.userId, profiles.id))
      .orderBy(desc(profiles.createdAt))
      .limit(300),
    db
      .select({
        userId: guidebooks.userId,
        guidebookCount: sql<number>`count(*)::int`,
        publishedCount: sql<number>`count(*) filter (where ${guidebooks.status} = 'published')::int`,
        lastAt: sql<Date | null>`max(${guidebooks.updatedAt})`,
      })
      .from(guidebooks)
      .groupBy(guidebooks.userId),
    db
      .select({
        userId: properties.userId,
        propertyCount: sql<number>`count(*)::int`,
        lastAt: sql<Date | null>`max(${properties.updatedAt})`,
      })
      .from(properties)
      .groupBy(properties.userId),
    db
      .select({
        userId: payments.userId,
        paymentCount: sql<number>`count(*)::int`,
        lastAt: sql<Date | null>`max(${payments.createdAt})`,
      })
      .from(payments)
      .where(sql`${payments.userId} is not null`)
      .groupBy(payments.userId),
  ]);

  const guidebooksByUser = new Map(guidebookStats.map((row) => [row.userId, row]));
  const propertiesByUser = new Map(propertyStats.map((row) => [row.userId, row]));
  const paymentsByUser = new Map(
    paymentStats.flatMap((row) => (row.userId ? [[row.userId, row] as const] : []))
  );
  const now = Date.now();

  return userRows.map((row) => {
    const guidebook = guidebooksByUser.get(row.id);
    const property = propertiesByUser.get(row.id);
    const payment = paymentsByUser.get(row.id);
    const trialEndsAt = row.trialEndsAt instanceof Date ? row.trialEndsAt : null;
    const trialDaysLeft =
      row.status === "trialing" && trialEndsAt
        ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now) / 86_400_000))
        : null;
    const lastActivityAt = [
      row.profileUpdatedAt,
      row.subscriptionUpdatedAt,
      guidebook?.lastAt,
      property?.lastAt,
      payment?.lastAt,
    ]
      .map((value) => (value ? new Date(value).getTime() : 0))
      .filter(Boolean)
      .sort((a, b) => b - a)[0];

    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      createdAt: serializeDate(row.createdAt),
      plan: row.plan,
      status: row.status ?? "none",
      billingInterval: row.billingInterval ?? "month",
      trialEndsAt: serializeDate(row.trialEndsAt),
      trialDaysLeft,
      propertyCount: Number(property?.propertyCount ?? 0),
      guidebookCount: Number(guidebook?.guidebookCount ?? 0),
      publishedGuidebookCount: Number(guidebook?.publishedCount ?? 0),
      paymentCount: Number(payment?.paymentCount ?? 0),
      lastActivityAt: lastActivityAt ? new Date(lastActivityAt).toISOString() : null,
    };
  });
}

export async function updateAdminTrial(
  userId: string,
  body: unknown,
  actorUserId: string
) {
  const parsed = trialPatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new AdminBillingError("Invalid trial update.", 400, parsed.error.flatten());
  }

  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  if (!profile) throw new AdminBillingError("User not found.", 404);

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (!existing) {
    throw new AdminBillingError("This user has no subscription or trial row.", 404);
  }

  const trialEndsAt = parsed.data.trialEndsAt
    ? new Date(parsed.data.trialEndsAt)
    : null;
  const before = {
    userId,
    status: existing.status,
    plan: existing.plan,
    billingInterval: existing.billingInterval,
    trialEndsAt: serializeDate(existing.trialEndsAt),
  };

  const [updated] = await db
    .update(subscriptions)
    .set({
      trialEndsAt,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId))
    .returning();

  const after = {
    userId,
    status: updated.status,
    plan: updated.plan,
    billingInterval: updated.billingInterval,
    trialEndsAt: serializeDate(updated.trialEndsAt),
  };

  await writeAudit({
    actorUserId,
    action: "trial.update",
    targetType: "user",
    targetId: userId,
    before,
    after,
    reason: parsed.data.reason,
  });

  invalidateAllGuideServable();
  return after;
}
