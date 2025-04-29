import { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import { useFetchData, usePutData, checkBarcodeInDatabase } from "../../../services/apiUtilities";
import { BarcodeScanner, ErrorModal } from "../../../components/index";
import { LiaEdit } from "react-icons/lia";
import { AiTwotoneDelete } from "react-icons/ai";
import { MdOutlineDoneOutline } from "react-icons/md";
import { RxCross2 } from "react-icons/rx";
import { FaCamera } from "react-icons/fa";
import styles from "./EditRoom.module.css";

const EditRoom = () => {
    const { roomId } = useParams();
    const history = useHistory();
    const [roomName, setRoomName] = useState("");
    const [inventory, setInventory] = useState([]);
    const [newItem, setNewItem] = useState({ name: "", qrCode: "" });
    const [editingIndex, setEditingIndex] = useState(null);
    const [tempInventory, setTempInventory] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isEditingScanning, setIsEditingScanning] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const data = await useFetchData(
                    `https://smart-inventory-management-k5rx.onrender.com/rooms/${roomId}`
                );
                setRoomName(data.name);
                setInventory(data.inventory || []);
                setLoading(false);
            } catch (err) {
                setError("Failed to load room data.");
                setLoading(false);
            }
        };
        fetchRoom();
    }, [roomId]);

    const preventEnterSubmit = (e) => {
        if (e.key === "Enter") e.preventDefault();
    };

    const isBarcodeUnique = async (barcode, excludeIndex = null) => {
        const duplicateLocally = inventory.some(
            (item, index) => index !== excludeIndex && item.qrCode === barcode
        );
        if (duplicateLocally) return false;
        const { exists } = await checkBarcodeInDatabase(barcode);
        return !exists;
    };

    const handleAddItem = async () => {
        if (!newItem.name || !newItem.qrCode) {
            setError("Item name and QR code are required!");
            return;
        }

        const isUnique = await isBarcodeUnique(newItem.qrCode);
        if (!isUnique) {
            setError("This QR code is already used!");
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
        const updated = [...tempInventory];
        updated[index] = { ...updated[index], [field]: value };
        setTempInventory(updated);
    };

    const handleSaveAllEdits = () => {
        for (let item of tempInventory) {
            if (!item.name.trim() || !item.qrCode.trim()) {
                setError("All items must have a name and a QR code.");
                return;
            }
        }

        const duplicateCheck = new Set();
        for (let item of tempInventory) {
            if (duplicateCheck.has(item.qrCode)) {
                setError("Duplicate QR codes detected!");
                return;
            }
            duplicateCheck.add(item.qrCode);
        }

        setInventory(tempInventory);
        setEditingIndex(null);
        setError("");
    };


    const handleDeleteItem = (index) => {
        if (inventory.length <= 1) {
            setError("You must have at least one item in the inventory.");
            return;
        }

        setInventory((prev) => prev.filter((_, i) => i !== index));
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!roomName || inventory.length === 0) {
            setError("Room name and at least one item are required.");
            return;
        }

        const formattedInventory = inventory.map((item, i) => ({
            id: `INV-${i + 1}`,
            name: item.name,
            qrCode: item.qrCode,
        }));

        try {
            await usePutData(
                `https://smart-inventory-management-k5rx.onrender.com/rooms/${roomId}`,
                {
                    id: roomId,
                    name: roomName,
                    lastCheckedTime: new Date().toISOString().slice(0, 16).replace("T", " "),
                    inventory: formattedInventory,
                    missedItems: [],
                }
            );

            alert("Room updated successfully!");
            history.push("/admin");
        } catch (err) {
            console.error(err);
            setError("Failed to update the room.");
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className={styles.container}>
            {error && <ErrorModal message={error} onClose={() => setError("")} />}

            <h2 className={styles.title}>Edit Room - {roomId}</h2>

            <form onSubmit={handleSubmit} className={styles.form} onKeyDown={preventEnterSubmit}>
                <label className={styles.label}>Room Name</label>
                <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className={styles.input}
                />

                <div className={styles.inventorySection}>
                    <h3>Inventory</h3>

                    <div className={styles.inventoryInput}>
                        <input
                            type="text"
                            placeholder="Item Name"
                            value={newItem.name}
                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                            className={styles.input}
                        />
                        <div className={styles.qrInputContainer}>
                            <input
                                type="text"
                                placeholder="Scan QR Code"
                                value={newItem.qrCode}
                                onChange={(e) => setNewItem({ ...newItem, qrCode: e.target.value })}
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
                                closeScanner={() => setIsScanning(false)}
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
                                            <button
                                                type="button"
                                                className={styles.cameraButton}
                                                onClick={() => setIsEditingScanning(index)}
                                            >
                                                <FaCamera fontSize={"18px"} />
                                            </button>
                                            {isEditingScanning === index && (
                                                <BarcodeScanner
                                                    onScan={(qrCode) => {
                                                        handleUpdateTempInventory(index, "qrCode", qrCode);
                                                        setIsEditingScanning(null);
                                                    }}
                                                    closeScanner={() => setIsEditingScanning(null)}
                                                />
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className={styles.saveButton}
                                            onClick={handleSaveAllEdits}
                                        >
                                            <MdOutlineDoneOutline fontSize={"18px"}  />
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.cancelButton}
                                            onClick={() => setEditingIndex(null)}
                                        >
                                            <RxCross2 fontSize={"18px"}  />
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

export default EditRoom;
