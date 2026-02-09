import { DataTypes } from "sequelize";

/**
 * Stores the daily sequence counter for human-readable QR tokens.
 * One row per calendar day (in GMT+5:15); lastValue is incremented for each new repair that day.
 * Token format: LAB + YYMMDD + 4-digit sequence (e.g. LAB2501310001).
 */
export default (sequelize) => {
  const QrDailySequence = sequelize.define(
    "QrDailySequence",
    {
      dateKey: {
        type: DataTypes.STRING(6),
        primaryKey: true,
        comment: "YYMMDD in GMT+5:15 (e.g. 250131)",
      },
      lastValue: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Last daily sequence number used for this date",
      },
    },
    {
      tableName: "qr_daily_sequences",
      timestamps: false,
      underscored: true,
    }
  );

  return QrDailySequence;
};
