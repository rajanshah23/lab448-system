import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// Create Sequelize instance
export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Import models
import Role from "./Role.js";
import User from "./User.js";
import Customer from "./Customer.js";
import DeviceCategory from "./DeviceCategory.js";
import Device from "./Device.js";
import Repair from "./Repair.js";
import RepairCategory from "./RepairCategory.js";
import QrDailySequence from "./QrDailySequence.js";
import Inventory from "./Inventory.js";
import InventoryUsage from "./InventoryUsage.js";
import RepairCharge from "./RepairCharge.js";
import Payment from "./Payment.js";
import AuditLog from "./AuditLog.js";

// Initialize models
const models = {
  Role: Role(sequelize),
  User: User(sequelize),
  Customer: Customer(sequelize),
  DeviceCategory: DeviceCategory(sequelize),
  Device: Device(sequelize),
  Repair: Repair(sequelize),
  RepairCategory: RepairCategory(sequelize),
  QrDailySequence: QrDailySequence(sequelize),
  Inventory: Inventory(sequelize),
  InventoryUsage: InventoryUsage(sequelize),
  RepairCharge: RepairCharge(sequelize),
  Payment: Payment(sequelize),
  AuditLog: AuditLog(sequelize),
};

// Define associations
Object.values(models).forEach((model) => {
  if (model.associate) {
    model.associate(models);
  }
});

export default models;
