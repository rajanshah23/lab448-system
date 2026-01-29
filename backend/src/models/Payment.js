import { DataTypes } from "sequelize";
import { createId } from "@paralleldrive/cuid2";

export default (sequelize) => {
  const Payment = sequelize.define(
    "Payment",
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
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      method: {
        type: DataTypes.ENUM("CASH", "CARD", "BANK_TRANSFER", "OTHER"),
        allowNull: false,
      },
      receivedByUserId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      receivedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "payments",
      timestamps: true,
      updatedAt: false,
      underscored: true,
    }
  );

  Payment.associate = (models) => {
    Payment.belongsTo(models.Repair, {
      foreignKey: "repairId",
      as: "repair",
    });
    Payment.belongsTo(models.User, {
      foreignKey: "receivedByUserId",
      as: "receivedBy",
    });
  };

  return Payment;
};
