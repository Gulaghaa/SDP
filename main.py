import cv2
import base64
import asyncio
import numpy as np
from fastapi import FastAPI, WebSocket
from ultralytics import YOLO 
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_headers=["*"],
)

# Load trained YOLO Model
model = YOLO("./best.pt")  
  
@app.get("/")
def sayHello():
    return {"Hello": "World"}

@app.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try: 
        while True:
            base64_data = await websocket.receive_text()  # Receive image bytes
            print("\n" + base64_data)
            # Decode Base64 string to bytes
            image_data = base64.b64decode(base64_data)
            nparr = np.frombuffer(image_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
            if frame is None:
                print("Error: Could not decode image")
                continue  # Skip this frame if decoding fails


            # YOLO detection
            results = model(frame)
            detections = []
            for result in results:
                for box in result.boxes:
                    label = result.names[int(box.cls[0])]
                    confidence = float(box.conf[0])
                    x1, y1, x2, y2 = map(int, box.xyxy[0])  # Bounding box

                    if confidence >= 0.75:
                        detections.append({"label": label, "confidence": confidence, "box": [x1, y1, x2, y2]})

                    # Draw bounding box
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(frame, f"{label} {confidence:.2f}", (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (    0, 255, 0), 2)

            # Encode processed frame
            _, buffer = cv2.imencode(".jpg", frame)
            encoded_image = base64.b64encode(buffer).decode()

            # Send either JSON or the processed image
            await websocket.send_json({"image": encoded_image, "detections": detections})

    except Exception as e:
        print(f"Error: {e}")

    finally:
        await websocket.close()
