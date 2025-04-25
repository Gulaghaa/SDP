import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";

const API_URL = "https://smart-inventory-management-k5rx.onrender.com/detect";

const ObjectDetection = ({ itemName, onDetect, onCancel }) => {
  const webcamRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [noDetectionTimeout, setNoDetectionTimeout] = useState(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((deviceList) => {
      const videoDevices = deviceList.filter(
        (device) => device.kind === "videoinput"
      );
      setDevices(videoDevices);
      setSelectedCamera(videoDevices[0]?.deviceId || "");
    });

    const interval = setInterval(captureFrame, 1500);

    const timeout = setTimeout(() => {
      onCancel();
    }, 60000);
    setNoDetectionTimeout(timeout);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [itemName, selectedCamera]);

  const captureFrame = () => {
    setTimeout(() => {
      if (!webcamRef.current) return;
      const screenshot = webcamRef.current.getScreenshot();
      if (screenshot) {
        const image = new Image();
        image.src = screenshot;
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 700;
          canvas.height = 700;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0, 700, 700);
          const base64Image = canvas.toDataURL("image/jpeg").split(",")[1];

          // 🔥 Send to backend
          axios
            .post(API_URL, { image_base64: base64Image })
            .then((response) => {
              const detections = response.data?.detections || [];
              console.log("Detections:", detections);

              const found = detections.some(
                (d) =>
                  d.label.toLowerCase() === itemName.toLowerCase() &&
                  d.confidence > 0.6
              );

              if (found) {
                console.log("✅ Object detected! Closing camera...");
                onDetect(true);
              }
            })
            .catch((error) => {
              console.error("Detection failed", error);
            });
        };
      }
    }, 1500);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Detecting: {itemName}</h2>

        <select
          style={styles.cameraSelect}
          value={selectedCamera}
          onChange={(e) => setSelectedCamera(e.target.value)}
        >
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId}`}
            </option>
          ))}
        </select>

        <div style={styles.webcamContainer}>
          <Webcam
            ref={webcamRef}
            videoConstraints={{ deviceId: selectedCamera }}
            screenshotFormat="image/jpeg"
            style={styles.webcam}
          />
        </div>

        <div style={styles.buttons}>
          <button style={styles.cancelButton} onClick={onCancel}>
            Leave Camera
          </button>
        </div>
      </div>
    </div>
  );
};

export default ObjectDetection;

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    textAlign: "center",
    width: "550px",
    boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.2)",
  },
  title: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  cameraSelect: {
    width: "100%",
    padding: "10px",
    marginBottom: "15px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  webcamContainer: {
    width: "500px",
    height: "375px",
    overflow: "hidden",
    borderRadius: "10px",
    border: "2px solid #ddd",
    margin: "10px auto",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  webcam: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  buttons: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
  },
  cancelButton: {
    background: "#e74c3c",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "0.3s",
  },
};
