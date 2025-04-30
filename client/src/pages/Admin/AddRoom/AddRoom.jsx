import { useState } from "react";
import { usePostData, checkBarcodeInDatabase, checkRoomIdInDatabase } from "../../../services/apiUtilities";
import { useHistory } from "react-router-dom";
import { BarcodeScanner, ErrorModal } from "../../../components/index";
import { LiaEdit } from "react-icons/lia";
import { AiTwotoneDelete } from "react-icons/ai";
import { MdOutlineDoneOutline } from "react-icons/md";
import { RxCross2 } from "react-icons/rx";
import { FaCamera } from "react-icons/fa";

import styles from "./AddRoom.module.css";

const AddRoom = () => {
  const [roomId, setRoomId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [inventory, setInventory] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", qrCode: "" });
  const [isScanning, setIsScanning] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [tempInventory, setTempInventory] = useState([]);
  const [isEditingScanning, setIsEditingScanning] = useState(null);
  const [error, setError] = useState("");

  const history = useHistory();

  const getAZTime = () => {
    const now = new Date();
    now.setHours(now.getHours()); 
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  };

  const isBarcodeUnique = async (barcode, excludeIndex = null) => {
    const isDuplicateLocally = inventory.some(
      (item, index) => index !== excludeIndex && item.qrCode === barcode
    );
    if (isDuplicateLocally) return false;

    const { exists } = await checkBarcodeInDatabase(barcode);
    return !exists;
  };



  const preventEnterSubmit = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.qrCode) {
      setError("Item name and QR code are required!");
      return;
    }

    const isUnique = await isBarcodeUnique(newItem.qrCode);
    if (!isUnique) {
      setError(
        "This QR code is already used in another room. Please use a unique barcode."
      );
      return;
    }

    setInventory([...inventory, newItem]);
    setNewItem({ name: "", qrCode: "" });
    setError("");
  };

  const handleEditItem = (index) => {
    setEditingIndex(index);
    setTempInventory([...inventory]);
  };

  const handleUpdateTempInventory = (index, field, value) => {
    const updatedTemp = [...tempInventory];
    updatedTemp[index] = { ...updatedTemp[index], [field]: value };
    setTempInventory(updatedTemp);
  };

  const handleSaveAllEdits = () => {
    for (let item of tempInventory) {
      if (!item.name.trim() || !item.qrCode.trim()) {
        setError("Item name and QR code cannot be empty!");
        return;
      }
    }

    const duplicateCheck = new Set();
    for (let item of tempInventory) {
      if (duplicateCheck.has(item.qrCode)) {
        setError("Duplicate QR codes detected! Ensure all QR codes are unique.");
        return;
      }
      duplicateCheck.add(item.qrCode);
    }

    setInventory(tempInventory);
    setEditingIndex(null);
    setError("");
  };


  const handleDeleteItem = (index) => {
    setInventory(inventory.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomId || !roomName || inventory.length === 0) {
      setError(
        "Room ID, Room Name, and at least one inventory item are required!"
      );
      return;
    }

    const exists = await checkRoomIdInDatabase(roomId);
    if (exists) {
      setError("This Room ID already exists! Please use a different ID.");
      return;
    }


    const timestamp = getAZTime()

    const formattedInventory = inventory.map((item, i) => ({
      id: `INV-${i + 1}`, 
      name: item.name,
      qrCode: item.qrCode,
    }));

    const newRoom = {
      id: roomId,
      name: roomName,
      lastCheckedTime: timestamp,
      inventory: formattedInventory,
      missedItems: [],
    };

    console.log("Submitting Room Data:", newRoom);



    try {
      const response = await usePostData(
        "https://smart-inventory-management-k5rx.onrender.com/rooms",
        newRoom
      );

      if (response) {
        alert("Room added successfully!");
        history.push("/admin");
      } else {
        setError("Failed to add room. Try again.");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setError("Something went wrong while submitting the room.");
    }
  };

  return (
    <div className={styles.container}>
      {error && <ErrorModal message={error} onClose={() => setError("")} />}

      <h2 className={styles.title}>Add a New Room</h2>

      <form
        onSubmit={handleSubmit}
        className={styles.form}
        onKeyDown={preventEnterSubmit}
      >
        <label className={styles.label}>Room Number</label>
        <input
          type="text"
          placeholder="e.g., A101"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          required
          className={styles.input}
        />

        <label className={styles.label}>Room Name</label>
        <input
          type="text"
          placeholder="e.g., Conference Room"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          required
          className={styles.input}
        />

        <div className={styles.inventorySection}>
          <h3>Inventory</h3>

          <div className={styles.inventoryInput}>
            <input
              type="text"
              placeholder="Item Name (e.g., Monitor)"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className={styles.input}
            />

            <div className={styles.qrInputContainer}>
              <input
                type="text"
                placeholder="Scan QR Code"
                value={newItem.qrCode}
                onChange={(e) =>
                  setNewItem({ ...newItem, qrCode: e.target.value })
                }
                className={styles.input}
              />
              <button
                type="button"
                className={styles.cameraButton}
                onClick={() => setIsScanning(!isScanning)}
              >
                <FaCamera />
              </button>
            </div>

            {isScanning && (
              <BarcodeScanner
                onScan={(qrCode) => {
                  setNewItem({ ...newItem, qrCode });
                  setIsScanning(false);
                }}
                closeScanner={() => setIsScanning(false)} // ✅ Pass the closeScanner function
              />
            )}

            <button
              type="button"
              className={styles.addButton}
              onClick={handleAddItem}
            >
              Add Item
            </button>
          </div>

          <ul className={styles.inventoryList}>
            {inventory.map((item, index) => (
              <li key={index} className={styles.inventoryItem}>
                {editingIndex === index ? (
                  <div className={styles.inventoryEditRow}>
                    <input
                      type="text"
                      value={tempInventory[index].name}
                      onChange={(e) => handleUpdateTempInventory(index, "name", e.target.value)}
                      className={styles.inventoryInputField}
                    />
                    <div className={styles.qrCodeContainer}>
                      <input
                        type="text"
                        value={tempInventory[index].qrCode}
                        onChange={(e) => handleUpdateTempInventory(index, "qrCode", e.target.value)}
                        className={styles.inventoryInputField}
                      />
                    </div>



                    <button
                      type="button"
                      className={styles.saveButton}
                      onClick={handleSaveAllEdits}
                    >
                      <MdOutlineDoneOutline />
                    </button>
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={() => setEditingIndex(null)}
                    >
                      <RxCross2 />
                    </button>
                  </div>
                ) : (
                  <>
                    <span>{item.name} - {item.qrCode}</span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => handleEditItem(index)}
                      >
                        <LiaEdit fontSize={"22px"} color={"white"} />
                      </button>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => handleDeleteItem(index)}
                      >
                        <AiTwotoneDelete fontSize={"22px"} color={"black"} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>

        </div>

        <button type="submit" className={styles.submitButton}>
          Save Room
        </button>
      </form>
    </div>
  );
};

export default AddRoom;
