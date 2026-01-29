import { DataTypes } from "sequelize";
import { createId } from "@paralleldrive/cuid2";

export default (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => createId(),
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      commissionRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.2,
      },
      roleId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "users",
      timestamps: true,
      underscored: true,
    }
  );

  User.associate = (models) => {
    User.belongsTo(models.Role, {
      foreignKey: "roleId",
      as: "role",
    });
    User.hasMany(models.Repair, {
      foreignKey: "assignedToUserId",
      as: "repairs",
    });
    User.hasMany(models.InventoryUsage, {
      foreignKey: "createdByUserId",
      as: "inventoryUsages",
    });
    User.hasMany(models.RepairCharge, {
      foreignKey: "createdByUserId",
      as: "repairCharges",
    });
    User.hasMany(models.Payment, {
      foreignKey: "receivedByUserId",
      as: "payments",
    });
    User.hasMany(models.AuditLog, {
      foreignKey: "userId",
      as: "auditLogs",
    });
  };

  return User;
};
