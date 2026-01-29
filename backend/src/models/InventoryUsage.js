import { DataTypes } from "sequelize";
import { createId } from "@paralleldrive/cuid2";

export default (sequelize) => {
  const InventoryUsage = sequelize.define(
    "InventoryUsage",
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => createId(),
      },
      repairId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      inventoryId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      quantityUsed: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      unitPriceAtUse: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      createdByUserId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "inventory_usages",
      timestamps: true,
      updatedAt: false,
      underscored: true,
    }
  );

  InventoryUsage.associate = (models) => {
    InventoryUsage.belongsTo(models.Repair, {
      foreignKey: "repairId",
      as: "repair",
    });
    InventoryUsage.belongsTo(models.Inventory, {
      foreignKey: "inventoryId",
      as: "inventory",
    });
    InventoryUsage.belongsTo(models.User, {
      foreignKey: "createdByUserId",
      as: "createdBy",
    });
    InventoryUsage.hasMany(models.RepairCharge, {
      foreignKey: "sourceInventoryUsageId",
      as: "sourceRepairCharges",
    });
  };

  return InventoryUsage;
};
