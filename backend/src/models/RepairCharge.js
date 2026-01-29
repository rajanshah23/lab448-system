import { DataTypes } from "sequelize";
import { createId } from "@paralleldrive/cuid2";

export default (sequelize) => {
  const RepairCharge = sequelize.define(
    "RepairCharge",
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
      type: {
        type: DataTypes.ENUM("INVENTORY", "FLAT", "DISCOUNT", "OTHER"),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      sourceInventoryUsageId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      createdByUserId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "repair_charges",
      timestamps: true,
      updatedAt: false,
      underscored: true,
    }
  );

  RepairCharge.associate = (models) => {
    RepairCharge.belongsTo(models.Repair, {
      foreignKey: "repairId",
      as: "repair",
    });
    RepairCharge.belongsTo(models.InventoryUsage, {
      foreignKey: "sourceInventoryUsageId",
      as: "sourceInventoryUsage",
    });
    RepairCharge.belongsTo(models.User, {
      foreignKey: "createdByUserId",
      as: "createdBy",
    });
  };

  return RepairCharge;
};
