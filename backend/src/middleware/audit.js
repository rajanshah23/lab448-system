import { prisma } from "../prisma.js";

export const logAudit = async (
  {
    userId,
    repairId,
    entityType,
    entityId,
    action,
    metadata,
  },
  db = prisma
) => {
  try {
    // Allow passing a transaction client (db) so callers inside a $transaction
    // can have the audit log insert participate in the same transaction and
    // see uncommitted records (e.g. repair created earlier in the tx).
    await db.auditLog.create({
      data: {
        userId: userId || null,
        repairId: repairId || null,
        entityType,
        entityId,
        action,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log", err);
  }
};

