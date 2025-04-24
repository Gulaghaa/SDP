import { useEffect, useRef, useState } from "react";
import Quagga from "quagga";

const BarcodeScanner = ({ onScan, closeScanner }) => {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(true);
  const [devices, setDevices] = useState([]); // Store camera devices
  const [selectedCamera, setSelectedCamera] = useState(""); // Selected camera ID

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((deviceList) => {
      const videoDevices = deviceList.filter(
        (device) => device.kind === "videoinput"
      );
      setDevices(videoDevices);

      const iPhoneCamera = videoDevices.find(
        (device) =>
          device.label.includes("iPhone") ||
          device.label.includes("Camo") ||
          device.label.includes("EpocCam")
      );
      if (iPhoneCamera) {
        setSelectedCamera(iPhoneCamera.deviceId);
      } else if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    });
  }, []);

  useEffect(() => {
    if (!scannerRef.current || !selectedCamera) return;

    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            width: 640,
            height: 480,
            deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          },
        },
        locator: {
          patchSize: "small",
          halfSample: true,
        },
        decoder: {
          readers: ["code_39_reader", "code_39_vin_reader", "code_128_reader"],
        },
        locate: true,
        multiple: true,
      },
      (err) => {
        if (err) {
          console.error("❌ Quagga initialization failed:", err);
          return;
        }
        Quagga.start();
      }
    );

    Quagga.onDetected((data) => {
      if (!scanning) return;
      const barcode = data?.codeResult?.code;
      if (barcode) {
        console.log("✅ Scanned Barcode:", barcode);
        setScanning(false);
        onScan(barcode);
        Quagga.stop();
      }
    });

    return () => {
      Quagga.stop();
      Quagga.offDetected();
    };
  }, [selectedCamera, scanning, onScan]);

  return (
    <div style={styles.scannerContainer}>
      <div ref={scannerRef} style={styles.cameraView}></div>

      {/* Dropdown for Camera Selection */}
      <select
        style={styles.selectCamera}
        value={selectedCamera}
        onChange={(e) => setSelectedCamera(e.target.value)}
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${device.deviceId}`}
          </option>
        ))}
      </select>

      <button style={styles.closeButton} onClick={closeScanner}>
        Close Scanner
      </button>
    </div>
  );
};

export default BarcodeScanner;

const styles = {
  scannerContainer: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100vh",
    background: "rgba(0, 0, 0, 0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    zIndex: 9999,
    backdropFilter: "blur(10px)",
  },
  cameraView: {
    width: "90%",
    maxWidth: "600px",
    height: "400px",
    background: "black",
    borderRadius: "12px",
    border: "4px solid rgba(255, 255, 255, 0.3)",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0px 0px 20px rgba(255, 255, 255, 0.1)",
  },
  selectCamera: {
    marginTop: "15px",
    padding: "10px",
    fontSize: "16px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  closeButton: {
    marginTop: "15px",
    padding: "12px 24px",
    background: "linear-gradient(135deg, #ff416c, #ff4b2b)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
    transition: "all 0.3s ease-in-out",
    boxShadow: "0px 4px 8px rgba(255, 75, 43, 0.3)",
  },
};
