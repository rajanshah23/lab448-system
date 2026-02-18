import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../utils/apiClient.js";
import { REPAIR_STATUS } from "../constants/statuses.js";
import { useAuth } from "../state/AuthContext.jsx";
import { PERMISSIONS } from "../constants/permissions.js";

const PrintIcon = ({ size = 20, style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const ConfirmationModal = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
  actionType,
}) => {
  const modalRef = useRef(null);
  const yesButtonRef = useRef(null);
  const noButtonRef = useRef(null);

  const getModalColors = () => {
    switch(actionType) {
      case 'REPAIRED':
        return {
          bg: "linear-gradient(145deg, #064e3b, #065f46)",
          border: "rgba(16, 185, 129, 0.3)",
          shadow: "rgba(16, 185, 129, 0.2)",
          gradient: "linear-gradient(135deg, #10b981, #059669)",
          icon: "✅"
        };
      case 'UNREPAIRABLE':
        return {
          bg: "linear-gradient(145deg, #7f1d1d, #991b1b)",
          border: "rgba(220, 38, 38, 0.3)",
          shadow: "rgba(220, 38, 38, 0.2)",
          gradient: "linear-gradient(135deg, #ef4444, #dc2626)",
          icon: "❌"
        };
      case 'DELIVERED':
        return {
          bg: "linear-gradient(145deg, #1e3a8a, #1e40af)",
          border: "rgba(59, 130, 246, 0.3)",
          shadow: "rgba(59, 130, 246, 0.2)",
          gradient: "linear-gradient(135deg, #3b82f6, #2563eb)",
          icon: "🚚"
        };
      default:
        return {
          bg: "linear-gradient(145deg, #2d1a1a, #1a0f0f)",
          border: "rgba(239, 68, 68, 0.3)",
          shadow: "rgba(239, 68, 68, 0.2)",
          gradient: "linear-gradient(135deg, #f87171, #ef4444)",
          icon: "⚠️"
        };
    }
  };

  const colors = getModalColors();

  useEffect(() => {
    if (isOpen && modalRef.current) {
      noButtonRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();

      if (document.activeElement === yesButtonRef.current) {
        noButtonRef.current?.focus();
      } else {
        yesButtonRef.current?.focus();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (document.activeElement === yesButtonRef.current) {
        onConfirm();
      } else if (document.activeElement === noButtonRef.current) {
        onCancel();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          background: colors.bg,
          borderRadius: "16px",
          padding: "28px",
          maxWidth: "420px",
          width: "90%",
          border: `1px solid ${colors.border}`,
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px ${colors.shadow} inset`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontSize: "28px" }}>{colors.icon}</span>
          <h3
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 700,
              background: colors.gradient,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Confirm Action
          </h3>
        </div>

        <p
          style={{
            margin: "0 0 24px 0",
            color: "#cbd5e1",
            fontSize: "15px",
            lineHeight: "1.5",
          }}
        >
          {message}
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            marginTop: "8px",
          }}
        >
          <button
            ref={yesButtonRef}
            onClick={onConfirm}
            className="btn btn-primary"
            style={{
              padding: "12px 28px",
              fontSize: "15px",
              fontWeight: 600,
              background: colors.gradient,
              border:
                document.activeElement === yesButtonRef.current
                  ? "2px solid #fff"
                  : "none",
              borderRadius: "10px",
              color: "#fff",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow:
                document.activeElement === yesButtonRef.current
                  ? `0 0 0 3px ${colors.border.replace('0.3', '0.5')}`
                  : "none",
              minWidth: "100px",
            }}
          >
            Yes
          </button>
          <button
            ref={noButtonRef}
            onClick={onCancel}
            className="btn btn-ghost"
            style={{
              padding: "12px 28px",
              fontSize: "15px",
              fontWeight: 500,
              background: "rgba(255, 255, 255, 0.05)",
              border:
                document.activeElement === noButtonRef.current
                  ? "2px solid #3b82f6"
                  : "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              color: "#f1f5f9",
              cursor: "pointer",
              transition: "all 0.2s",
              minWidth: "100px",
            }}
          >
            No
          </button>
        </div>

        <div
          style={{
            marginTop: "20px",
            fontSize: "12px",
            color: "#94a3b8",
            textAlign: "center",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: "16px",
          }}
        >
          <span
            style={{
              background: "rgba(255,255,255,0.05)",
              padding: "4px 8px",
              borderRadius: "4px",
            }}
          >
            ← → arrows to switch · Enter to select · Esc to cancel
          </span>
        </div>
      </div>
    </div>
  );
};

const RepairWorkspacePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [repair, setRepair] = useState(null);
  const [itemKey, setItemKey] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [lookupItem, setLookupItem] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [invError, setInvError] = useState("");

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationActionType, setConfirmationActionType] = useState("");
  const [focusedButtonIndex, setFocusedButtonIndex] = useState(0);
  const statusDivRef = useRef(null);
  const actionButtonsRef = useRef([]);

  const qrPrintRef = useRef(null);

  const printQrContent = (ref) => {
    if (!ref?.current) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<!DOCTYPE html><html><head><title>QR Code</title><style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;background:#fff;}.token{font-family:monospace;margin-top:12px;font-size:14px;color:#333;}</style></head><body>${ref.current.innerHTML}</body></html>`,
    );
    win.document.close();
    win.onload = () => {
      win.print();
      win.close();
    };
  };

  const load = async () => {
    const res = await api.get(`/repairs/${id}`);
    setRepair(res.data);
  };

  useEffect(() => {
    load();
  }, [id]);

  const doLookup = async () => {
    const key = (itemKey || "").toString().trim();
    if (!key) {
      setLookupItem(null);
      setLookupError("");
      return;
    }
    setLookupError("");
    setLookupItem(null);
    try {
      const res = await api.get("/inventory/lookup", { params: { key } });
      setLookupItem(res.data);
    } catch {
      setLookupItem(null);
      setLookupError("Item not found");
    }
  };

  useEffect(() => {
    const t = setTimeout(doLookup, 400);
    return () => clearTimeout(t);
  }, [itemKey]);

  const transitionTo = async (newStatus) => {
    setStatusError("");
    try {
      await api.post(`/repairs/${id}/transition`, { newStatus });
      await load();
      setShowConfirmation(false);
      setPendingAction(null);

      if (newStatus === REPAIR_STATUS.REPAIRED) {
        setTimeout(() => {
          navigate(`/dashboard/technician`);
        }, 500);
      } else if (newStatus === REPAIR_STATUS.DELIVERED) {
        setTimeout(() => {
          navigate(`/dashboard/technician`);
        }, 500);
      }
    } catch (err) {
      setStatusError(err.response?.data?.message || "Failed to change status");
      setShowConfirmation(false);
      setPendingAction(null);
    }
  };

  const handleStatusAction = useCallback((action) => {
    let message = "";
    let actionType = "";
    if (action.status === REPAIR_STATUS.REPAIRED) {
      message = "Are you sure you want to mark this item as REPAIRED?";
      actionType = "REPAIRED";
    } else if (action.status === REPAIR_STATUS.UNREPAIRABLE) {
      message = "Are you sure you want to mark this item as UNREPAIRABLE?";
      actionType = "UNREPAIRABLE";
    } else if (action.status === REPAIR_STATUS.DELIVERED) {
      message = "Are you sure you want to mark this item as DELIVERED?";
      actionType = "DELIVERED";
    }

    setConfirmationMessage(message);
    setConfirmationActionType(actionType);
    setPendingAction(action);
    setShowConfirmation(true);
  }, []);

  const handleConfirm = () => {
    if (pendingAction) {
      transitionTo(pendingAction.status);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setPendingAction(null);
    setTimeout(() => statusDivRef.current?.focus(), 100);
  };

  const addInventoryUsage = async () => {
    setInvError("");
    const key = (itemKey || "").toString().trim();
    if (!key) {
      setInvError("Enter item ID or SKU");
      return;
    }
    try {
      await api.post(`/repairs/${id}/use-inventory`, {
        itemKey: key,
        quantity: Number(quantity) || 1,
      });
      setItemKey("");
      setQuantity(1);
      setLookupItem(null);
      setLookupError("");
      await load();
    } catch (err) {
      setInvError(err.response?.data?.message || "Failed to use inventory");
    }
  };

  useEffect(() => {
    if (!repair) return;

    const nextActions = [];
    if (repair.status === REPAIR_STATUS.IN_REPAIR) {
      nextActions.push({
        label: "Mark as repaired",
        status: REPAIR_STATUS.REPAIRED,
      });
      nextActions.push({
        label: "Mark as unrepairable",
        status: REPAIR_STATUS.UNREPAIRABLE,
      });
    } else if (
      repair.status === REPAIR_STATUS.REPAIRED ||
      repair.status === REPAIR_STATUS.UNREPAIRABLE
    ) {
      nextActions.push({
        label: "Mark as delivered",
        status: REPAIR_STATUS.DELIVERED,
      });
    }

    const handleKeyDown = (e) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        showConfirmation
      ) {
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();

        if (
          statusDivRef.current &&
          document.activeElement !== statusDivRef.current
        ) {
          statusDivRef.current.focus();
          setFocusedButtonIndex(0);
          return;
        }

        if (nextActions.length > 0) {
          if (e.key === "ArrowDown") {
            setFocusedButtonIndex((prev) => (prev + 1) % nextActions.length);
          } else if (e.key === "ArrowUp") {
            setFocusedButtonIndex(
              (prev) => (prev - 1 + nextActions.length) % nextActions.length,
            );
          }
        }
      } else if (
        e.key === "Enter" &&
        statusDivRef.current === document.activeElement
      ) {
        e.preventDefault();
        if (nextActions[focusedButtonIndex]) {
          handleStatusAction(nextActions[focusedButtonIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [repair, focusedButtonIndex, showConfirmation, handleStatusAction]);

  if (!repair) {
    return (
      <div className="content">
        <p className="muted">Loading repair...</p>
      </div>
    );
  }

  const nextActions = [];
  if (repair.status === REPAIR_STATUS.IN_REPAIR) {
    nextActions.push({
      label: "Mark as repaired",
      status: REPAIR_STATUS.REPAIRED,
    });
    nextActions.push({
      label: "Mark as unrepairable",
      status: REPAIR_STATUS.UNREPAIRABLE,
    });
  } else if (
    repair.status === REPAIR_STATUS.REPAIRED ||
    repair.status === REPAIR_STATUS.UNREPAIRABLE
  ) {
    nextActions.push({
      label: "Mark as delivered",
      status: REPAIR_STATUS.DELIVERED,
    });
  }

  const deviceIssue = repair.device?.description?.trim() || "—";

  const getStatusColors = (status) => {
    switch(status) {
      case REPAIR_STATUS.REPAIRED:
        return {
          bg: "rgba(16, 185, 129, 0.2)",
          text: "#10b981",
          border: "rgba(16, 185, 129, 0.3)"
        };
      case REPAIR_STATUS.UNREPAIRABLE:
        return {
          bg: "rgba(239, 68, 68, 0.2)",
          text: "#ef4444",
          border: "rgba(239, 68, 68, 0.3)"
        };
      case REPAIR_STATUS.DELIVERED:
        return {
          bg: "rgba(59, 130, 246, 0.2)",
          text: "#3b82f6",
          border: "rgba(59, 130, 246, 0.3)"
        };
      default:
        return {
          bg: "rgba(255,255,255,0.06)",
          text: "var(--text)",
          border: "rgba(255,255,255,0.1)"
        };
    }
  };

  const getButtonGradient = (status) => {
    switch(status) {
      case REPAIR_STATUS.REPAIRED:
        return "linear-gradient(135deg, #10b981, #059669)";
      case REPAIR_STATUS.UNREPAIRABLE:
        return "linear-gradient(135deg, #ef4444, #dc2626)";
      case REPAIR_STATUS.DELIVERED:
        return "linear-gradient(135deg, #3b82f6, #2563eb)";
      default:
        return "linear-gradient(135deg, var(--accent), var(--accent-2))";
    }
  };

  const statusColors = getStatusColors(repair.status);

  return (
    <div className="content">
      <ConfirmationModal
        isOpen={showConfirmation}
        message={confirmationMessage}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        actionType={confirmationActionType}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "8px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>
            🔧 Repair dashboard
          </h2>
          <p className="muted small" style={{ marginTop: "4px" }}>
            {repair.customer?.name} · {repair.device?.brand}{" "}
            {repair.device?.model}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "18px",
        }}
      >
        <div className="card" style={{ padding: "18px" }}>
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--muted)",
            }}
          >
            👤 Customer
          </h3>
          <div style={{ fontSize: "15px", fontWeight: 500 }}>
            {repair.customer?.name}
          </div>
          <div className="small muted" style={{ marginTop: "4px" }}>
            {repair.customer?.phone}
            {repair.customer?.email ? ` · ${repair.customer.email}` : ""}
          </div>
          <div className="small muted" style={{ marginTop: "10px" }}>
            QR:{" "}
            <span style={{ fontFamily: "monospace", color: "var(--text)" }}>
              {repair.qrToken}
            </span>
          </div>
          <div
            style={{
              marginTop: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: "6px",
                borderRadius: "8px",
                display: "inline-block",
              }}
            >
              <QRCodeSVG value={repair.qrToken} size={100} level="M" />
            </div>
            <button
              type="button"
              onClick={() => printQrContent(qrPrintRef)}
              title="Print QR"
              className="btn btn-ghost"
              style={{ padding: "6px" }}
            >
              <PrintIcon size={18} />
            </button>
          </div>
          <div ref={qrPrintRef} style={{ display: "none" }}>
            <div
              style={{
                background: "#fff",
                padding: "8px",
                display: "inline-block",
              }}
            >
              <QRCodeSVG value={repair.qrToken} size={140} level="M" />
            </div>
            <span
              className="small"
              style={{
                display: "block",
                marginTop: "8px",
                fontFamily: "monospace",
              }}
            >
              {repair.qrToken}
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--muted)",
            }}
          >
            Device
          </h3>
          <div style={{ fontSize: "15px", fontWeight: 500 }}>
            {repair.device?.brand} {repair.device?.model}
          </div>
          <div className="small muted" style={{ marginTop: "4px" }}>
            Serial: {repair.device?.serialNumber || "—"}
          </div>
          <div
            style={{
              marginTop: "12px",
              padding: "12px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="small muted" style={{ marginBottom: "4px" }}>
              Issue
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "var(--text)",
                whiteSpace: "pre-wrap",
              }}
            >
              {deviceIssue}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{ padding: "18px" }}
          ref={statusDivRef}
          tabIndex={0}
          onFocus={() => setFocusedButtonIndex(0)}
          onBlur={() => setFocusedButtonIndex(0)}
        >
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--muted)",
            }}
          >
            Status
            <span style={{ 
              marginLeft: "8px", 
              fontSize: "11px", 
              color: "#3b82f6", 
              background: "rgba(59,130,246,0.1)", 
              padding: "2px 6px", 
              borderRadius: "4px" 
            }}>
              Use ↓↑ arrows
            </span>
          </h3>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 12px",
              borderRadius: "8px",
              background: statusColors.bg,
              fontSize: "13px",
              fontWeight: 500,
              color: statusColors.text,
              border: `1px solid ${statusColors.border}`,
            }}
          >
            {repair.status.replace("_", " ")}
          </div>
          {statusError && (
            <div
              className="small"
              style={{ color: "#f87171", marginTop: "8px" }}
            >
              {statusError}
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "12px",
            }}
          >
            {nextActions.map((a, index) => (
              <button
                key={a.status}
                ref={(el) => (actionButtonsRef.current[index] = el)}
                type="button"
                onClick={() => handleStatusAction(a)}
                className="btn btn-primary"
                style={{
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  outline: "none",
                  border:
                    focusedButtonIndex === index &&
                    statusDivRef.current === document.activeElement
                      ? "2px solid #fff"
                      : "none",
                  transform:
                    focusedButtonIndex === index &&
                    statusDivRef.current === document.activeElement
                      ? "scale(1.02)"
                      : "scale(1)",
                  transition: "all 0.2s",
                  background: getButtonGradient(a.status),
                  color: "#fff",
                  borderRadius: "8px",
                  cursor: "pointer",
                  boxShadow: focusedButtonIndex === index &&
                    statusDivRef.current === document.activeElement
                      ? "0 0 0 3px rgba(255,255,255,0.3)"
                      : "none",
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
          {nextActions.length > 0 && (
            <div
              className="small muted"
              style={{ marginTop: "8px", fontSize: "11px" }}
            >
              Press Enter to select highlighted option
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: "18px" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 600 }}>
          📦 Inventory usage
        </h3>
        {hasPermission(PERMISSIONS.USE_INVENTORY) && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div style={{ minWidth: "200px", flex: "1 1 200px" }}>
              <label
                className="small muted"
                style={{ display: "block", marginBottom: "6px" }}
              >
                Item key or ID
              </label>
              <input
                type="text"
                value={itemKey}
                onChange={(e) => setItemKey(e.target.value)}
                placeholder="Enter item ID or SKU"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.015)",
                }}
                autoComplete="off"
              />
              {lookupItem && (
                <div
                  className="small"
                  style={{ marginTop: "6px", color: "#10b981" }}
                >
                  ✓ {lookupItem.name} · stock {lookupItem.quantity} · ₹
                  {Number(lookupItem.unitPrice).toFixed(2)}
                </div>
              )}
              {lookupError && itemKey.trim() && (
                <div
                  className="small"
                  style={{ marginTop: "6px", color: "#f87171" }}
                >
                  {lookupError}
                </div>
              )}
            </div>
            <div>
              <label
                className="small muted"
                style={{ display: "block", marginBottom: "6px" }}
              >
                Qty
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{
                  width: "72px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.015)",
                }}
              />
            </div>
            <button
              type="button"
              onClick={addInventoryUsage}
              className="btn btn-primary"
              style={{
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 600,
                background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                border: "none",
                color: "#fff",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Add item
            </button>
          </div>
        )}
        {invError && (
          <div
            className="small"
            style={{ color: "#f87171", marginBottom: "12px" }}
          >
            {invError}
          </div>
        )}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th
                  className="small muted"
                  style={{
                    textAlign: "left",
                    padding: "10px 8px",
                    fontWeight: 600,
                  }}
                >
                  When
                </th>
                <th
                  className="small muted"
                  style={{
                    textAlign: "left",
                    padding: "10px 8px",
                    fontWeight: 600,
                  }}
                >
                  Item
                </th>
                <th
                  className="small muted"
                  style={{
                    textAlign: "left",
                    padding: "10px 8px",
                    fontWeight: 600,
                  }}
                >
                  Qty
                </th>
                <th
                  className="small muted"
                  style={{
                    textAlign: "right",
                    padding: "10px 8px",
                    fontWeight: 600,
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {(repair.inventoryUsage || []).map((u) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <td style={{ padding: "10px 8px" }}>
                    {new Date(u.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    {u.inventory?.name ?? "—"}
                  </td>
                  <td style={{ padding: "10px 8px" }}>{u.quantityUsed}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>
                    ₹{(Number(u.unitPriceAtUse) * u.quantityUsed).toFixed(2)}
                  </td>
                </tr>
              ))}
              {(repair.inventoryUsage || []).length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="small muted"
                    style={{ padding: "20px", textAlign: "center" }}
                  >
                    No inventory used yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RepairWorkspacePage;