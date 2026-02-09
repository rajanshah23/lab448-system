import { DataTypes } from "sequelize";
import { createId } from "@paralleldrive/cuid2";

export default (sequelize) => {
  const RepairCategory = sequelize.define(
    "RepairCategory",
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
      /** Flat rate (₹) for this repair type. Only leaf (Level 3) categories should have a value. */
      flatRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      /** 1 = Category Level 1, 2 = Category Level 2, 3 = Category Level 3 */
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "repair_categories",
      timestamps: true,
      underscored: true,
    }
  );

  RepairCategory.associate = (models) => {
    RepairCategory.belongsTo(models.RepairCategory, {
      foreignKey: "parentId",
      as: "parent",
    });
    RepairCategory.hasMany(models.RepairCategory, {
      foreignKey: "parentId",
      as: "children",
    });
    RepairCategory.hasMany(models.Repair, {
      foreignKey: "repairCategoryId",
      as: "repairs",
    });
  };

  return RepairCategory;
};
