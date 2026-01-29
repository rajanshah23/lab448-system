import { DataTypes } from "sequelize";
import { createId } from "@paralleldrive/cuid2";

export default (sequelize) => {
  const Role = sequelize.define(
    "Role",
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => createId(),
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      permissions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      tableName: "roles",
      timestamps: true,
      underscored: true,
    }
  );

  Role.associate = (models) => {
    Role.hasMany(models.User, {
      foreignKey: "roleId",
      as: "users",
    });
  };

  return Role;
};
