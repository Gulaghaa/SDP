import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";

const WEBSOCKET_URL =
  "wss://smart-inventory-management-k5rx.onrender.com/stream";

const ObjectDetection = ({ itemName, onDetect, onCancel }) => {
  const webcamRef = useRef(null);
  const socketRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [processing, setProcessing] = useState(true);
  const [noDetectionTimeout, setNoDetectionTimeout] = useState(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((deviceList) => {
      const videoDevices = deviceList.filter(
        (device) => device.kind === "videoinput"
      );
      console.log("Video Devices:", videoDevices);
      setDevices(videoDevices);
      setSelectedCamera(videoDevices[0]?.deviceId || "");
    });

    socketRef.current = new WebSocket(WEBSOCKET_URL);

    socketRef.current.onopen = () => console.log("Connected to WebSocket");
    socketRef.current.onclose = () => console.log("WebSocket Disconnected");
    socketRef.current.onerror = (error) =>
      console.error("WebSocket Error:", error);

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Incoming Server Data:", data);

      if (data.detections) {
        console.log("Detected Objects:");
        let found = false;

        data.detections.forEach((d) => {
          console.log(
            `🛑 ${d.label} | Confidence: ${(d.confidence * 100).toFixed(2)}%`
          );

          // Check if one of the detected items matches our searched object
          if (
            d.label.toLowerCase() === itemName.toLowerCase() &&
            d.confidence > 0.6
          ) {
            console.log(
              `✅ Matched Item: ${d.label} with Confidence: ${(
                d.confidence * 100
              ).toFixed(2)}%`
            );
            found = true;
          }
        });

        if (found) {
          console.log("✅ Object detected successfully! Closing camera...");
          onDetect(true);
          socketRef.current.close();
        }
      }
    };

    const interval = setInterval(captureFrame, 1000);

    const timeout = setTimeout(() => {
      onCancel();
    }, 60000);
    setNoDetectionTimeout(timeout);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      socketRef.current.close();
    };
  }, [itemName, selectedCamera]);

  const captureFrame = () => {
    if (webcamRef.current && socketRef.current.readyState === WebSocket.OPEN) {
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
          socketRef.current.send(base64Image);
        };
      }
    }
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
