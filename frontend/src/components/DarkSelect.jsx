import React, { useState, useRef, useEffect } from "react";

const DarkSelect = ({ value, onChange, options, label, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div style={{ marginBottom: "10px" }} ref={containerRef}>
      {label && <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>{label}</label>}

      <div
        className="dark-select"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        style={{
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "10px",
          padding: "10px 12px",
          cursor: disabled ? "not-allowed" : "pointer",
          position: "relative",
          color: disabled ? "rgba(159,176,191,0.5)" : "#e9f0f6",
          minWidth: "150px",
          opacity: disabled ? 0.7 : 1,
          userSelect: "none",
        }}
      >
        <span>{selectedOption?.label || "Select..."}</span>
        <span style={{ float: "right" }}>▾</span>

        {open && !disabled && (
          <div
            className="dark-select-dropdown"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              width: "100%",
              background: "var(--panel)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "10px",
              marginTop: "4px",
              zIndex: 10,
              maxHeight: "180px",
              overflowY: "auto"
            }}
          >
            {options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  background: value === opt.value ? "rgba(124,92,255,0.15)" : "transparent"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,92,255,0.15)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = value === opt.value ? "rgba(124,92,255,0.15)" : "transparent")}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


export default DarkSelect;
