import { DataTypes } from "sequelize";
import { createId } from "@paralleldrive/cuid2";

export default (sequelize) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => createId(),
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      repairId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      entityType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      entityId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: "audit_logs",
      timestamps: true,
      updatedAt: false,
      underscored: true,
    }
  );

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
    AuditLog.belongsTo(models.Repair, {
      foreignKey: "repairId",
      as: "repair",
    });
  };

  return AuditLog;
};
