import { DataTypes } from "sequelize";
import { createId } from "@paralleldrive/cuid2";

export default (sequelize) => {
  const Repair = sequelize.define(
    "Repair",
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => createId(),
      },
      customerId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      deviceId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      assignedToUserId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          "INTAKE",
          "TO_REPAIR",
          "IN_REPAIR",
          "REPAIRED",
          "UNREPAIRABLE",
          "DELIVERED",
        ),
        allowNull: false,
        defaultValue: "INTAKE",
      },
      qrToken: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      intakeNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      repairCategoryId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      flatChargeAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      totalCharges: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      staffShareAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      shopShareAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      isLocked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      intakeAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      toRepairAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      inRepairAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      smsIntakeSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When intake SMS was sent (once per repair)",
      },
      smsRepairedSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When repaired SMS was sent (once per repair)",
      },
    },
    {
      tableName: "repairs",
      timestamps: true,
      underscored: true,
    },
  );

  Repair.associate = (models) => {
    Repair.belongsTo(models.Customer, {
      foreignKey: "customerId",
      as: "customer",
    });
    Repair.belongsTo(models.Device, {
      foreignKey: "deviceId",
      as: "device",
    });
    Repair.belongsTo(models.User, {
      foreignKey: "assignedToUserId",
      as: "assignedTo",
    });
    Repair.belongsTo(models.RepairCategory, {
      foreignKey: "repairCategoryId",
      as: "repairCategory",
    });
    Repair.hasMany(models.RepairCharge, {
      foreignKey: "repairId",
      as: "charges",
    });
    Repair.hasMany(models.InventoryUsage, {
      foreignKey: "repairId",
      as: "inventoryUsage",
    });
    Repair.hasMany(models.Payment, {
      foreignKey: "repairId",
      as: "payments",
    });
    Repair.hasMany(models.AuditLog, {
      foreignKey: "repairId",
      as: "auditLogs",
    });
  };

  return Repair;
};
