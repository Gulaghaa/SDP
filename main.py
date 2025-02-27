import cv2
import base64
import asyncio
import numpy as np
from fastapi import FastAPI, WebSocket
from ultralytics import YOLO 
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained YOLO Model
model = YOLO("./best.pt")  

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def send_detected_item(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)  # ✅ FastAPI handles JSON serialization


manager = ConnectionManager()

@app.websocket("/stream")
async def stream(websocket: WebSocket): 
    await manager.connect(websocket)
    cap = cv2.VideoCapture(1) 

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Perform YOLO Object Detection
            results = model(frame)  # YOLOv8 inference
            detections = []  # List to store detection results
            
            for result in results:
                for box in result.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])  # Bounding box
                    label = result.names[int(box.cls[0])]  # Class name
                    confidence = float(box.conf[0])  # Confidence score

                    # Draw bounding box on the frame
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(frame, f"{label} {confidence:.2f}", (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

                    # Append detection details
                    if confidence >= 0.75:
                        detections.append({"label": label, "confidence": confidence, "bbox": [x1, y1, x2, y2]})

            # Encode processed frame to Base64
            _, buffer = cv2.imencode('.jpg', frame)
            frame_b64 = base64.b64encode(buffer).decode()

            message = {
                "frame": frame_b64,
                "detections": detections
            }

            # Send frame + detections to frontend
            await manager.send_detected_item(message, websocket)
            await asyncio.sleep(0.03)  # Small delay for smooth streaming

    except Exception as e:
        print(f"Error: {e}")

    finally:
        cap.release()
        manager.disconnect(websocket)
        await websocket.close()
