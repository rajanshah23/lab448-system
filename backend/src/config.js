import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 4000;
export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
export const JWT_EXPIRES_IN = "8h";

export const REPAIR_STATUS = {
  INTAKE: "INTAKE",
  TO_REPAIR: "TO_REPAIR",
  IN_REPAIR: "IN_REPAIR",
  REPAIRED: "REPAIRED",
  UNREPAIRABLE: "UNREPAIRABLE",
  DELIVERED: "DELIVERED",
};

//  Added missing transitions
export const ALLOWED_STATUS_TRANSITIONS = {
  INTAKE: ["TO_REPAIR"],
  // Allow reverting back to INTAKE from TO_REPAIR to support manual corrections
  TO_REPAIR: ["IN_REPAIR", "INTAKE"],
  IN_REPAIR: ["REPAIRED", "UNREPAIRABLE"],
  REPAIRED: ["DELIVERED"],
  UNREPAIRABLE: ["DELIVERED"],
  DELIVERED: [],
};

export const PERMISSIONS = {
  // Legacy (kept for backward compatibility)
  VIEW_DASHBOARD: "view:dashboard",
  MANAGE_INVENTORY: "manage:inventory",
  INTAKE_REPAIR: "repair:intake",
  UPDATE_REPAIR_STATUS: "repair:update_status",
  USE_INVENTORY: "repair:use_inventory",
  MANAGE_BILLING: "repair:billing",
  TAKE_PAYMENT: "repair:payment",
  MANAGE_USERS: "users:manage",
  // New permission keys
  REPAIR_VIEW: "repair:view",
  REPAIR_VIEW_ALL: "repair:view_all",
  REPAIR_CREATE: "repair:create",
  REPAIR_ADD_NOTES: "repair:add_notes",
  INVENTORY_REQUEST: "inventory:request",
  INVENTORY_MANAGE: "inventory:manage",
  INVENTORY_ASSIGN: "inventory:assign_to_repair",
  PAYMENT_RECEIVE: "payment:receive",
  PAYMENT_MANAGE: "payment:manage",
  REPAIR_VIEW_BILLING: "repair:view_billing",
  REPORTS_FINANCIAL: "reports:financial",
  REPORTS_OPERATIONS: "reports:operations",
  USER_VIEW: "user:view",
  ADMIN_WILDCARD: "*:*",
};

export const ROLE_CODES = {
  TECHNICIAN: "TECHNICIAN",
  FRONT_DESK: "FRONT_DESK",
  LOGISTICS: "LOGISTICS",
  FINANCE: "FINANCE",
  MANAGER: "MANAGER",
  ADMIN: "ADMIN",
};

export const TECHNICIAN_LEVELS = {
  JUNIOR: { display: "Repair Soldier" },
  SENIOR: { display: "Repair Sergeant" },
  EXPERT: { display: "Repair Commander" },
  MASTER: { display: "Repair General" },
};

// ——— SMS (Aakash) ———
// Placeholders: {{customerName}}, {{qrToken}}, {{date}}. Override via SMS_INTAKE_MESSAGE, SMS_REPAIRED_MESSAGE, SMS_UNREPAIRABLE_MESSAGE in .env
export const SMS_MESSAGES = {
  INTAKE:
    process.env.SMS_INTAKE_MESSAGE ||
    "Hi {{customerName}}, your device has been received for repair on {{date}}. ID: {{qrToken}}. We'll update you when it's ready. - Lab448",
  REPAIRED:
    process.env.SMS_REPAIRED_MESSAGE ||
    "Your device repair is complete. ID: {{qrToken}}. Please collect it from our store. - Lab448",
  UNREPAIRABLE:
    process.env.SMS_UNREPAIRABLE_MESSAGE ||
    "We're sorry we couldn't repair your device with ID {{qrToken}}. Please collect it from our store. - Lab448",
};

export function formatSmsMessage(template, data = {}) {
  let out = template;
  for (const [key, value] of Object.entries(data)) {
    out = out.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, "g"),
      value != null ? String(value) : "",
    );
  }
  return out;
}
