import os
import cv2
import base64
import numpy as np
from fastapi import FastAPI
from ultralytics import YOLO 
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import Depends
from models import Item, Room, ImageInput, LoginRequest
from dotenv import load_dotenv

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3000",  
    "http://127.0.0.1:3000",
    "https://sdp-e524.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=[
        "Access-Control-Allow-Headers",
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "Accept",
        "Origin"
    ],
)

# Load trained YOLO Model
model = YOLO("./best.pt")  

# MongoDB connection URI (replace with your actual URI)
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client["inventory"] 

# Collection access shortcut
rooms_collection = db["rooms"]
users_collection = db["users"]

@app.post("/detect")
async def detect_image(data: ImageInput):
    try:
        image_data = base64.b64decode(data.image_base64)
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image")

        results = model(frame)
        detections = []

        for result in results:
            for box in result.boxes:
                label = result.names[int(box.cls[0])]
                confidence = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                if confidence >= 0.75:
                    detections.append({
                        "label": label,
                        "confidence": confidence,
                        "box": [x1, y1, x2, y2]
                    })

        return {"detections": detections}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# GET all rooms
@app.get("/rooms")
async def get_rooms():
    rooms = await rooms_collection.find({}, {"_id": 0}).to_list(1000)
    return rooms

# GET a single room by ID
@app.get("/rooms/{room_id}")
async def get_room(room_id: str):
    room = await rooms_collection.find_one({"id": room_id}, {"_id": 0})
    if not room:
        return {"error": "Room not found"}
    return room

# POST: Add a new room
@app.post("/rooms")
async def create_room(room: Room):
    existing = await rooms_collection.find_one({"id": room.id})
    if existing:
        return {"error": f"Room with id '{room.id}' already exists"}
    await rooms_collection.insert_one(room.dict())
    return {"message": "Room created"}

# PUT: Replace entire room by ID
@app.put("/rooms/{room_id}")
async def update_room(room_id: str, updated_data: Room):
    result = await rooms_collection.replace_one({"id": room_id}, updated_data.dict())
    if result.matched_count == 0:
        return {"error": "Room not found"}
    return {"message": "Room updated"}

# DELETE: Delete room by ID
@app.delete("/rooms/{room_id}")
async def delete_room(room_id: str):
    result = await rooms_collection.delete_one({"id": room_id})
    if result.deleted_count == 0:
        return {"error": "Room not found"}
    return {"message": "Room deleted"}

# GET: Get all inventory items in a room
@app.get("/rooms/{room_id}/inventory")
async def get_inventory(room_id: str):
    room = await rooms_collection.find_one({"id": room_id}, {"_id": 0, "inventory": 1})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room.get("inventory", [])

# GET: Get a specific inventory item by ID
@app.get("/rooms/{room_id}/inventory/{item_id}")
async def get_inventory_item(room_id: str, item_id: str):
    room = await rooms_collection.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    for item in room.get("inventory", []):
        if item["id"] == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")


# POST: Add a new inventory item to a room
@app.post("/rooms/{room_id}/inventory")
async def add_inventory_item(room_id: str, item: Item):
    room = await rooms_collection.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    for existing_item in room.get("inventory", []):
        if existing_item["id"] == item.id:
            raise HTTPException(status_code=400, detail="Item with this ID already exists in inventory")
    await rooms_collection.update_one({"id": room_id}, {"$push": {"inventory": item.dict()}})
    return {"message": "Inventory item added"}

# POST: Add a missed item to a room
@app.post("/rooms/{room_id}/missed")
async def add_missed_item(room_id: str, item: Item):
    update_result = await rooms_collection.update_one(
        {"id": room_id},
        {"$push": {"missedItems": item.dict()}}
    )
    if update_result.matched_count == 0:
        return {"error": "Room not found"}
    return {"message": "Missed item added"}

# DELETE: Clear all missed items in a room
@app.delete("/rooms/{room_id}/missed")
async def clear_missed_items(room_id: str):
    update_result = await rooms_collection.update_one(
        {"id": room_id},
        {"$set": {"missedItems": []}}
    )
    if update_result.matched_count == 0:
        return {"error": "Room not found"}
    return {"message": "Missed items cleared"}

@app.post("/login")
async def login(request: LoginRequest):
    # Find user by username
    user = await users_collection.find_one({"username": request.username})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Check password match
    if user["password"] != request.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return {"message": "Login successful"}

@app.get("/inventory/check-barcode/{barcode}")
async def check_barcode_uniqueness(barcode: str):
    room = await rooms_collection.find_one(
        {"inventory.qrCode": barcode},
        {"_id": 0, "id": 1, "name": 1}
    )
    if room:
        return {"exists": True, "room": room}
    return {"exists": False}

@app.get("/inventory/check-room-id/{room_id}")
async def check_room_id_uniqueness(room_id: str):
    room = await rooms_collection.find_one(
        {"id": room_id},
        {"_id": 0, "id": 1, "name": 1}
    )
    if room:
        return {"exists": True, "room": room}
    return {"exists": False}
