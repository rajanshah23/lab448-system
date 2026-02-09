import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

const Barcode = ({ value, width = 2, height = 80 }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (value && svgRef.current) {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width,
        height,
        displayValue: false,
        margin: 0,
      });
    }
  }, [value, width, height]);

  return <svg ref={svgRef} />;
};

export default Barcode;
