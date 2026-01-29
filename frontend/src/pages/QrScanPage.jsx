import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../utils/apiClient.js";

const QrScanPage = () => {
  const [manualToken, setManualToken] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  const handleToken = async (token) => {
    if (!token) return;
    setError("");
    try {
      const res = await api.get(`/repairs/by-qr/${token}`);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
      navigate(`/repairs/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Repair not found");
    }
  };

  useEffect(() => {
    if (!scanning) return;

    const html5Qrcode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5Qrcode;

    html5Qrcode
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleToken(decodedText);
        },
        (errorMessage) => {
          // Ignore continuous decode errors
        }
      )
      .catch((err) => {
        console.error("QR scan error", err);
        setError("Failed to start camera. Please check permissions.");
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current.clear();
          })
          .catch(() => {});
      }
    };
  }, [scanning]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">QR Scan</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">
            Camera scan
          </h3>
          <div className="bg-slate-950 rounded-lg overflow-hidden">
            <div id="qr-reader" className="w-full"></div>
          </div>
          <div className="mt-3 flex gap-2">
            {!scanning ? (
              <button
                onClick={() => setScanning(true)}
                className="inline-flex items-center rounded-md bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white px-3 py-1.5"
              >
                Start scanning
              </button>
            ) : (
              <button
                onClick={() => setScanning(false)}
                className="inline-flex items-center rounded-md bg-red-600 hover:bg-red-500 text-xs font-medium text-white px-3 py-1.5"
              >
                Stop scanning
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Point the camera at the repair QR to open its workspace.
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">
            Manual token entry
          </h3>
          <input
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 font-mono"
            placeholder="Enter QR token"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value.trim())}
          />
          <button
            onClick={() => handleToken(manualToken)}
            className="mt-3 inline-flex items-center rounded-md bg-sky-600 hover:bg-sky-500 text-sm font-medium text-white px-4 py-2"
          >
            Open repair
          </button>
          {error && (
            <div className="mt-3 text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QrScanPage;

