import { DataTypes } from "sequelize";
import { createId } from "@paralleldrive/cuid2";

export default (sequelize) => {
  const Customer = sequelize.define(
    "Customer",
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => createId(),
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone2: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Alternate / second phone number",
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "customers",
      timestamps: true,
      underscored: true,
    }
  );

  Customer.associate = (models) => {
    Customer.hasMany(models.Device, {
      foreignKey: "customerId",
      as: "devices",
    });
    Customer.hasMany(models.Repair, {
      foreignKey: "customerId",
      as: "repairs",
    });
  };

  return Customer;
};
