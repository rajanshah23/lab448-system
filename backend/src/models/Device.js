import { DataTypes } from "sequelize";
import { createId } from "@paralleldrive/cuid2";

export default (sequelize) => {
  const Device = sequelize.define(
    "Device",
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
      categoryId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      brand: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      model: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      serialNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "devices",
      timestamps: true,
      underscored: true,
    }
  );

  Device.associate = (models) => {
    Device.belongsTo(models.Customer, {
      foreignKey: "customerId",
      as: "customer",
    });
    Device.belongsTo(models.DeviceCategory, {
      foreignKey: "categoryId",
      as: "category",
    });
    Device.hasMany(models.Repair, {
      foreignKey: "deviceId",
      as: "repairs",
    });
  };

  return Device;
};
