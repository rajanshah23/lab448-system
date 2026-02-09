import { DataTypes } from "sequelize";
import { createId } from "@paralleldrive/cuid2";

export default (sequelize) => {
  const DeviceCategory = sequelize.define(
    "DeviceCategory",
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
      parentId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "device_categories",
      timestamps: true,
      underscored: true,
    }
  );

  DeviceCategory.associate = (models) => {
    DeviceCategory.belongsTo(models.DeviceCategory, {
      foreignKey: "parentId",
      as: "parent",
    });
    DeviceCategory.hasMany(models.DeviceCategory, {
      foreignKey: "parentId",
      as: "children",
    });
    DeviceCategory.hasMany(models.Device, {
      foreignKey: "categoryId",
      as: "devices",
    });
  };

  return DeviceCategory;
};
