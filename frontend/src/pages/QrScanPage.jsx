import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../utils/apiClient.js";

const QrScanPage = () => {
  const [manualToken, setManualToken] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [queueRepairs, setQueueRepairs] = useState([]);
  const [queueFilter, setQueueFilter] = useState("");
  const [qrModal, setQrModal] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [cameraLoading, setCameraLoading] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(false);

  const scannerRef = useRef(null);
  const beepRef = useRef(null);
  const scannerContainerId = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    beepRef.current = new Audio(
      "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg",
    );
  }, []);

  const playBeep = () => {
    try {
      beepRef.current?.play();
    } catch {}
  };

  const startScanner = async () => {
    try {
      setCameraError("");
      setCameraLoading(true);

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (err) {}
        scannerRef.current = null;
      }

      scannerContainerId.current = `qr-scanner-${Date.now()}`;
      const qrReaderElement = document.getElementById("qr-reader");

      if (!qrReaderElement) {
        throw new Error("QR reader element not found");
      }

      qrReaderElement.innerHTML = "";
      const scannerContainer = document.createElement("div");
      scannerContainer.id = scannerContainerId.current;
      scannerContainer.style.width = "100%";
      scannerContainer.style.height = "100%";
      qrReaderElement.appendChild(scannerContainer);

      const html5Qrcode = new Html5Qrcode(scannerContainerId.current);
      scannerRef.current = html5Qrcode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5Qrcode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          console.log("QR Scanned:", decodedText);
          handleToken(decodedText);
        },
        (errorMessage) => {
          console.log("Scan error:", errorMessage);
        },
      );

      setCameraLoading(false);
      setScanning(true);
    } catch (err) {
      console.error("Failed to start back camera:", err);
      setCameraLoading(false);
      setCameraError("Back camera not available. Trying front camera...");

      setTimeout(() => {
        tryStartFrontCamera();
      }, 1000);
    }
  };

  const tryStartFrontCamera = async () => {
    try {
      if (!scannerRef.current) return;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await scannerRef.current.start(
        { facingMode: "user" },
        config,
        (decodedText) => {
          console.log("QR Scanned (front camera):", decodedText);
          handleToken(decodedText);
        },
        () => {},
      );

      setCameraError("");
      setCameraLoading(false);
      setScanning(true);
    } catch (fallbackErr) {
      console.error("Failed to start any camera:", fallbackErr);
      setCameraError(
        "Camera access denied. Please allow camera permissions and refresh.",
      );
      setScanning(false);
      setCameraLoading(false);

      // Clean up scanner reference
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (err) {}
        scannerRef.current = null;
      }
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.warn("Error stopping scanner:", err);
    } finally {
      setScanning(false);
      setCameraLoading(false);
      setCameraError("");

      const qrReaderElement = document.getElementById("qr-reader");
      if (qrReaderElement) {
        qrReaderElement.innerHTML = "";
      }
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const copyToClipboard = (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopyMsg(`Copied: ${text}`);
            setTimeout(() => setCopyMsg(""), 2000);
          })
          .catch(() => fallbackCopy(text));
      } else {
        fallbackCopy(text);
      }
    } catch (err) {
      console.error("Copy failed:", err);
      setCopyMsg("Copy failed - try manually");
      setTimeout(() => setCopyMsg(""), 2000);
    }
  };

  const fallbackCopy = (text) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "-1000px";
      textArea.style.left = "-1000px";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      setTimeout(() => {
        if (document.body.contains(textArea)) {
          document.body.removeChild(textArea);
        }
      }, 100);
      if (successful) {
        setCopyMsg(`Copied: ${text}`);
        setTimeout(() => setCopyMsg(""), 2000);
      } else {
        throw new Error("Copy command failed");
      }
    } catch (err) {
      console.error("Fallback copy failed:", err);
      setCopyMsg("Copy not supported - text: " + text);
      setTimeout(() => setCopyMsg(""), 2000);
    }
  };

  const loadQueueRepairs = async () => {
    setLoadingQueue(true);
    try {
      const res = await api.get("/repairs/queue", {
        params: { status: "INTAKE,TO_REPAIR,IN_REPAIR" },
      });
      setQueueRepairs(res.data || []);
    } catch (err) {
      console.error("Failed to load queue repairs:", err);
      setQueueRepairs([]);
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    loadQueueRepairs();
  }, []);

  const handleToken = async (token) => {
    if (!token) {
      setError("Please enter a token");
      return;
    }

    setError("");
    const cleanToken = token.trim();
    console.log("Processing token:", cleanToken);

    if (scanning) {
      await stopScanner();
    }

    playBeep();

    console.log("Trying as QR token...");
    try {
      const res = await api.get(`/repairs/by-qr/${cleanToken}`);
      console.log("Repair found by QR:", res.data);
      navigate(`/repairs/${res.data.id}`);
      return;
    } catch (err) {
      console.error("QR token lookup failed:", err);
      console.error("Error details:", err.response?.data);
      console.error("Error status:", err.response?.status);

      if (err.response?.status === 404) {
        setError("Repair not found with this token");
      } else if (err.response?.status === 403) {
        setError("Permission denied: You cannot access this repair");
      } else if (err.response?.status === 401) {
        setError("Session expired. Please log in again.");
      } else {
        setError("Invalid token. Please check and try again.");
      }
    }
  };

  const filteredQueue = queueRepairs.filter((repair) => {
    if (!queueFilter) return true;

    const searchTerm = queueFilter.toLowerCase();
    return (
      (repair.customer?.name || "").toLowerCase().includes(searchTerm) ||
      (repair.device?.brand || "").toLowerCase().includes(searchTerm) ||
      (repair.device?.model || "").toLowerCase().includes(searchTerm) ||
      (repair.qrToken || "").toLowerCase().includes(searchTerm)
    );
  });

  const printQr = (qrToken) => {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrToken)}&margin=20`;

    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow pop-ups to print QR codes");
      return;
    }

    win.document.write(`
    <html>
    <head>
      <title>QR Code</title>
      <style>
        body {
          margin: 0;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: white;
        }
        img {
          width: 200px;
          height: 200px;
          display: block;
          margin-bottom: 20px;
        }
        .token {
          font-family: monospace;
          font-size: 20px;
          font-weight: bold;
          margin-top: 20px;
          text-align: center;
        }
        @media print {
          @page {
            margin: 0;
          }
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <img src="${qrImageUrl}" onload="setTimeout(() => window.print(), 100)" />
      <div class="token">${qrToken}</div>
      <script>
        window.onafterprint = function() {
          setTimeout(() => window.close(), 100);
        };
      </script>
    </body>
    </html>
  `);
    win.document.close();
  };

  return (
    <div className="content">
      <h2
        style={{
          margin: 0,
          marginBottom: "24px",
          color: "var(--text)",
          fontSize: "24px",
          fontWeight: "600",
        }}
      >
        QR Scan & Repair Queue
      </h2>

      {/* TOAST */}
      <AnimatePresence>
        {copyMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              background:
                "linear-gradient(90deg, var(--accent), var(--accent-2))",
              color: "#021018",
              padding: "12px 20px",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow)",
              zIndex: 1000,
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            {copyMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ERROR MESSAGE */}
      {error && (
        <div
          className="card"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            borderColor: "rgba(239, 68, 68, 0.3)",
            borderLeft: "4px solid rgba(239, 68, 68, 0.5)",
            marginBottom: "20px",
          }}
        >
          <p
            style={{
              color: "#f87171",
              margin: 0,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "18px" }}>⚠</span>
            {error}
          </p>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          width: "100%",
        }}
      >
        {/* CAMERA CARD - LEFT ALIGNED */}
        <div
          style={{
            alignSelf: "flex-start",
            width: "100%",
            maxWidth: "500px",
          }}
        >
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3
                className="muted"
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                Camera Scan
              </h3>

              <div style={{ display: "flex", gap: "8px" }}>
                {!scanning ? (
                  <button
                    onClick={startScanner}
                    className="btn btn-primary"
                    style={{
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background:
                        "linear-gradient(90deg, var(--accent), var(--accent-2))",
                      border: "none",
                      color: "#021018",
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>📷</span>
                    Start Scanning
                  </button>
                ) : (
                  <button
                    onClick={stopScanner}
                    className="btn"
                    style={{
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: "600",
                      background: "rgba(239, 68, 68, 0.1)",
                      borderColor: "rgba(239, 68, 68, 0.3)",
                      color: "#f87171",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>⏸️</span>
                    Stop Scanning
                  </button>
                )}
              </div>
            </div>

            <div
              id="qr-reader"
              style={{
                background: scanning ? "#000" : "var(--panel)",
                borderRadius: "calc(var(--radius) - 2px)",
                marginBottom: "16px",
                minHeight: "300px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                position: "relative",
              }}
            >
              {!scanning ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "var(--muted)",
                  }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                    📷
                  </div>
                  <p style={{ margin: 0, fontSize: "14px" }}>
                    Click "Start Scanning" to activate camera
                  </p>
                </div>
              ) : cameraLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "var(--muted)",
                  }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                    ⏳
                  </div>
                  <p style={{ margin: 0, fontSize: "14px" }}>
                    Initializing camera...
                  </p>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      left: "10px",
                      background: "rgba(0, 0, 0, 0.7)",
                      color: "#fff",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      zIndex: 10,
                    }}
                  >
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: "#10b981",
                        animation: "pulse 1.5s infinite",
                      }}
                    ></div>
                    <span>Scanning...</span>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      width: "250px",
                      height: "250px",
                      border: "2px solid rgba(124, 92, 255, 0.5)",
                      borderRadius: "8px",
                      pointerEvents: "none",
                      zIndex: 5,
                    }}
                  ></div>
                </>
              )}
            </div>

            {cameraError && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "12px",
                }}
              >
                <p
                  style={{
                    color: "#f87171",
                    margin: 0,
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>⚠</span>
                  {cameraError}
                </p>
              </div>
            )}

            <p
              className="muted small"
              style={{
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              Point the camera at a repair QR code to automatically open the
              repair workspace.
              <br />
              <span style={{ color: "var(--accent)" }}>
                Ensure camera permissions are granted.
              </span>
            </p>
          </div>
        </div>

        {/* MANUAL ENTRY + QUEUE TABLE - FULL WIDTH */}
        <div style={{ width: "100%" }}>
          <div className="card">
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              {/* MANUAL ENTRY SECTION */}
              <div>
                <h3
                  className="muted"
                  style={{
                    margin: 0,
                    marginBottom: "16px",
                    fontSize: "16px",
                    fontWeight: "600",
                  }}
                >
                  Manual Token Entry
                </h3>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                    alignItems: "flex-end",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "300px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "13px",
                        color: "var(--muted)",
                      }}
                    >
                      Enter QR Token
                    </label>
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Paste QR token (e.g., LAB2501310001)"
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: "14px",
                        background: "rgba(255, 255, 255, 0.015)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: "calc(var(--radius) - 2px)",
                        color: "var(--text)",
                      }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleToken(manualToken);
                        }
                      }}
                    />
                  </div>

                  <button
                    onClick={() => handleToken(manualToken)}
                    className="btn btn-primary"
                    style={{
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: "600",
                      minWidth: "140px",
                      background:
                        "linear-gradient(90deg, var(--accent), var(--accent-2))",
                      border: "none",
                      color: "#021018",
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    Open Repair
                  </button>
                </div>

                <div className="muted small" style={{ marginTop: "8px" }}>
                  Enter a QR code token to open a repair workspace
                </div>
              </div>

              {/* QUEUE REPAIRS SECTION */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <h3
                    className="muted"
                    style={{
                      margin: 0,
                      fontSize: "16px",
                      fontWeight: "600",
                    }}
                  >
                    Repair Queue
                  </h3>

                  <span className="muted small">
                    {filteredQueue.length} repairs
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="Search by customer, device, or QR token..."
                  value={queueFilter}
                  onChange={(e) => setQueueFilter(e.target.value)}
                  style={{
                    marginBottom: "16px",
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "14px",
                    background: "rgba(255, 255, 255, 0.015)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "calc(var(--radius) - 2px)",
                    color: "var(--text)",
                  }}
                />

                <div
                  style={{
                    background: "var(--panel)",
                    border: "1px solid rgba(255, 255, 255, 0.03)",
                    borderRadius: "calc(var(--radius) - 2px)",
                    overflow: "hidden",
                    maxHeight: "400px",
                  }}
                >
                  <div style={{ overflow: "auto", maxHeight: "400px" }}>
                    <table style={{ width: "100%" }}>
                      <thead
                        style={{
                          background: "rgba(255, 255, 255, 0.02)",
                          position: "sticky",
                          top: 0,
                        }}
                      >
                        <tr>
                          <th
                            style={{
                              padding: "12px 16px",
                              textAlign: "left",
                              fontWeight: "600",
                              color: "var(--muted)",
                              fontSize: "13px",
                            }}
                          >
                            Customer
                          </th>
                          <th
                            style={{
                              padding: "12px 16px",
                              textAlign: "left",
                              fontWeight: "600",
                              color: "var(--muted)",
                              fontSize: "13px",
                            }}
                          >
                            Device
                          </th>
                          <th
                            style={{
                              padding: "12px 16px",
                              textAlign: "left",
                              fontWeight: "600",
                              color: "var(--muted)",
                              fontSize: "13px",
                            }}
                          >
                            QR Token
                          </th>
                          <th
                            style={{
                              padding: "12px 16px",
                              textAlign: "right",
                              fontWeight: "600",
                              color: "var(--muted)",
                              fontSize: "13px",
                            }}
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingQueue ? (
                          <tr>
                            <td
                              colSpan="4"
                              style={{
                                padding: "32px 16px",
                                textAlign: "center",
                                color: "var(--muted)",
                              }}
                            >
                              Loading repairs...
                            </td>
                          </tr>
                        ) : filteredQueue.length > 0 ? (
                          filteredQueue.map((repair) => (
                            <tr
                              key={repair.id}
                              style={{
                                borderBottom:
                                  "1px solid rgba(255, 255, 255, 0.03)",
                                transition: "background 0.2s",
                              }}
                            >
                              <td
                                style={{
                                  padding: "12px 16px",
                                  fontSize: "14px",
                                }}
                              >
                                {repair.customer?.name || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  fontSize: "14px",
                                }}
                              >
                                {repair.device?.brand || ""}{" "}
                                {repair.device?.model || ""}
                                {!repair.device?.brand &&
                                  !repair.device?.model &&
                                  "—"}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  fontFamily: "monospace",
                                  color: "var(--accent)",
                                  fontSize: "13px",
                                }}
                              >
                                {repair.qrToken || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "right",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "8px",
                                    justifyContent: "flex-end",
                                  }}
                                >
                                  <button
                                    onClick={() => setQrModal(repair)}
                                    className="btn btn-primary"
                                    style={{
                                      padding: "8px 16px",
                                      fontSize: "13px",
                                      fontWeight: "500",
                                      background:
                                        "linear-gradient(90deg, var(--accent), var(--accent-2))",
                                      border: "none",
                                      color: "#021018",
                                      borderRadius: "calc(var(--radius) - 2px)",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Show QR
                                  </button>

                                  <button
                                    onClick={() =>
                                      copyToClipboard(repair.qrToken)
                                    }
                                    className="btn-ghost"
                                    style={{
                                      padding: "8px 16px",
                                      fontSize: "13px",
                                      fontWeight: "500",
                                      background: "rgba(255, 255, 255, 0.05)",
                                      border:
                                        "1px solid rgba(255, 255, 255, 0.06)",
                                      color: "var(--text)",
                                      borderRadius: "calc(var(--radius) - 2px)",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Copy
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="4"
                              style={{
                                padding: "32px 16px",
                                textAlign: "center",
                                color: "var(--muted)",
                              }}
                            >
                              {queueFilter
                                ? "No matching repairs found"
                                : "No repairs in queue"}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR CODE MODAL */}
      <AnimatePresence>
        {qrModal && (
          <motion.div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 999,
              background: "rgba(7, 16, 37, 0.8)",
              backdropFilter: "blur(4px)",
              padding: "20px",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setQrModal(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="card"
              style={{
                width: "100%",
                maxWidth: "500px",
                background: "var(--panel)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                boxShadow: "0 20px 40px rgba(2, 10, 23, 0.8)",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "var(--text)",
                      fontWeight: "600",
                      fontSize: "18px",
                      marginBottom: "4px",
                    }}
                  >
                    {qrModal.customer?.name || "Customer"}
                  </div>
                  <div
                    style={{
                      color: "var(--muted)",
                      fontSize: "14px",
                      marginBottom: "4px",
                    }}
                  >
                    {qrModal.device?.brand || ""} {qrModal.device?.model || ""}
                  </div>
                  <div
                    style={{
                      color: "var(--muted)",
                      fontFamily: "monospace",
                      fontSize: "14px",
                    }}
                  >
                    {qrModal.qrToken}
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard(qrModal.qrToken)}
                  className="btn btn-primary"
                  style={{ minWidth: "100px", padding: "8px 16px" }}
                >
                  Copy Token
                </button>
              </div>

              <div
                style={{
                  background: "white",
                  padding: "20px",
                  borderRadius: "calc(var(--radius) - 2px)",
                  marginBottom: "20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(0, 0, 0, 0.1)",
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    padding: "8px",
                    display: "inline-block",
                  }}
                >
                  <QRCodeSVG
                    id={`qr-svg-${qrModal.qrToken}`}
                    value={qrModal.qrToken}
                    size={200}
                    level="M"
                  />
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    marginTop: "12px",
                    fontSize: "14px",
                    color: "#333",
                  }}
                >
                  {qrModal.qrToken}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "space-between",
                }}
              >
                <button
                  onClick={() => printQr(qrModal.qrToken, qrModal)}
                  className="btn"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    padding: "8px 16px",
                    flex: 1,
                  }}
                >
                  Print QR
                </button>
                <button
                  onClick={() => {
                    handleToken(qrModal.qrToken);
                    setQrModal(null);
                  }}
                  className="btn btn-primary"
                  style={{
                    padding: "8px 16px",
                    flex: 1,
                  }}
                >
                  Open Repair
                </button>
                <button
                  onClick={() => setQrModal(null)}
                  className="btn-ghost"
                  style={{ padding: "8px 16px" }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(124, 92, 255, 0.3);
          }
        `}
      </style>
    </div>
  );
};

export default QrScanPage;
