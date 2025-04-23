from pydantic import BaseModel
from typing import List

class Item(BaseModel):
    id: str
    name: str
    qrCode: str

class Room(BaseModel):
    id: str
    name: str
    lastCheckedTime: str
    inventory: List[Item] = []
    missedItems: List[Item] = []

class User(BaseModel):
    id: str
    username: str
    password: str
