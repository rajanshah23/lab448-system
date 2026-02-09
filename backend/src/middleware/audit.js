import db from "../db.js";

export const logAudit = async ({
  userId,
  repairId,
  entityType,
  entityId,
  action,
  metadata,
}, transaction = null) => {
  try {
    await db.AuditLog.create({
      userId: userId || null,
      repairId: repairId || null,
      entityType,
      entityId,
      action,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
    }, { transaction });
  } catch (err) {
    console.error("Failed to write audit log", err);
  }
};

