import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import { useFetchData, usePutData } from "../../services/apiUtilities";
import { BarcodeScanner, Navbar } from "../../components/index";
import ObjectDetection from "../../components/ObjectDetection";
import styles from "./RoomItem.module.css";

const RoomItem = () => {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scanningIndex, setScanningIndex] = useState(null);
  const [detectingIndex, setDetectingIndex] = useState(null);
  const [barcodeChecks, setBarcodeChecks] = useState({});
  const [objectChecks, setObjectChecks] = useState({});
  const [missedItems, setMissedItems] = useState([]);
  const [view, setView] = useState("inventory");
  const [modal, setModal] = useState({ type: "", message: "", visible: false });
  const [warning, setWarning] = useState({
    visible: false,
    message: "",
    uncheckedItems: [],
  });
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

  useEffect(() => {
    const fetchRoomInventory = async () => {
      try {
        const data = await useFetchData(
          `https://smart-inventory-management-k5rx.onrender.com/rooms/${roomId}`
        );
        setRoom(data);

        setMissedItems(data.missedItems || []);
      } catch (err) {
        setError("Failed to load inventory. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoomInventory();
  }, [roomId]);

  const handleBarcodeScan = (barcode, index) => {
    console.log(room.inventory[index].qrCode);
    console.log(barcode);
    if (room.inventory[index].qrCode.trim() === barcode.trim()) {
      setBarcodeChecks((prev) => ({ ...prev, [index]: true }));
      showModal("success", "Barcode matched successfully!");

      setDetectingIndex(index);
    } else {
      setBarcodeChecks((prev) => ({ ...prev, [index]: false }));
      showModal("error", "Barcode did not match!");
    }
    setScanningIndex(null);
  };

  const handleObjectDetection = (success) => {
    if (success && detectingIndex !== null) {
      setObjectChecks((prev) => {
        const updatedChecks = { ...prev, [detectingIndex]: true };

        if (barcodeChecks[detectingIndex]) {
          showModal("success", "Item verified and marked as Present!");
        } else {
          showModal("success", "Object detection successful!");
        }

        return updatedChecks;
      });

      setDetectingIndex(null);
    } else {
      handleMoveToMissed(detectingIndex);
      showModal(
        "error",
        "Object detection failed! Item moved to Missed Items."
      );
      setDetectingIndex(null);
    }
  };

  const handleCompleteVerification = () => {
    const uncheckedItems = room.inventory.filter((_, i) => {
      return !barcodeChecks[i] || !objectChecks[i];
    });

    if (uncheckedItems.length > 0) {
      const names = uncheckedItems.map((item) => item.name).join(", ");
      setWarning({
        visible: true,
        message: `The following items haven't been verified: ${names}. They will be moved to Missed Items if you continue.`,
        uncheckedItems: uncheckedItems,
      });
      return;
    }

    completeVerification([]);
  };

  const completeVerification = async (uncheckedItems = []) => {
    const verifiedItems = room.inventory.filter(
      (_, i) => barcodeChecks[i] && objectChecks[i]
    );
    const updatedMissedItems = [...room.missedItems, ...uncheckedItems];
    const updatedTime = getAZTime();

    try {
      await usePutData(
        `https://smart-inventory-management-k5rx.onrender.com/rooms/${roomId}`,
        {
          id: room.id,
          name: room.name,
          inventory: verifiedItems,
          missedItems: updatedMissedItems,
          lastCheckedTime: updatedTime,
        }
      );

      setRoom((prevRoom) => ({
        ...prevRoom,
        inventory: verifiedItems,
        missedItems: updatedMissedItems,
        lastCheckedTime: updatedTime,
      }));

      setBarcodeChecks({});
      setObjectChecks({});
      setMissedItems(updatedMissedItems);
      showModal("success", "Verification completed!");
      setTimeout(() => {
        history.push(`/rooms`);
      }, 1000);
    } catch (err) {
      console.error("PUT failed:", err);
      showModal("error", "Failed to update the server.");
    }

    setWarning({ visible: false, message: "", uncheckedItems: [] });
  };

  const handleMoveToMissed = async (index) => {
    if (barcodeChecks[index] && objectChecks[index]) {
      showModal(
        "error",
        "This item is verified and cannot be moved to 'Missed Items'!"
      );
      return;
    }

    const itemToMove = room.inventory[index];
    const backendMissedItems = room.missedItems || [];
    const updatedTime = getAZTime();

    
    const updatedMissedItems = [
      ...backendMissedItems.filter((item) => item.qrCode !== itemToMove.qrCode),
      itemToMove,
    ];
    const updatedInventory = room.inventory.filter((_, i) => i !== index);

    try {
      await usePutData(
        `https://smart-inventory-management-k5rx.onrender.com/rooms/${roomId}`,
        {
          id: room.id,
          name: room.name,
          inventory: updatedInventory,
          missedItems: updatedMissedItems,
          lastCheckedTime: updatedTime,
        }
      );

      
      setRoom((prevRoom) => ({
        ...prevRoom,
        inventory: updatedInventory,
        missedItems: updatedMissedItems,
        lastCheckedTime: updatedTime,
      }));

      setMissedItems(updatedMissedItems);

      
      setBarcodeChecks((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });

      setObjectChecks((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });

      showModal("success", "Item moved to 'Missed Items'!");
    } catch (error) {
      console.error("PUT failed:", error);
      showModal("error", "Failed to update the server.");
    }
  };

  const handleMoveToInventory = async (index) => {
    const itemToReturn = missedItems[index];

    const updatedMissedItems = missedItems.filter((_, i) => i !== index);
    const updatedInventory = [...room.inventory, itemToReturn];
    const updatedTime = getAZTime();

    try {
      await usePutData(
        `https://smart-inventory-management-k5rx.onrender.com/rooms/${roomId}`,
        {
          id: room.id,
          name: room.name,
          inventory: updatedInventory,
          missedItems: updatedMissedItems,
          lastCheckedTime: updatedTime,
        }
      );

      setRoom((prevRoom) => ({
        ...prevRoom,
        inventory: updatedInventory,
        missedItems: updatedMissedItems,
        lastCheckedTime: updatedTime,
      }));

      setMissedItems(updatedMissedItems);
      showModal("success", "Item returned to inventory!");
    } catch (err) {
      console.error("PUT failed:", err);
      showModal("error", "Failed to update the server.");
    }
  };

  const showModal = (type, message) => {
    setModal({ type, message, visible: true });
    setTimeout(() => {
      setModal({ type: "", message: "", visible: false });
    }, 3000);
  };

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        {loading && <p className={styles.loading}>Loading inventory...</p>}
        {error && <p className={styles.error}>{error}</p>}

        {room && !loading && !error && (
          <>
            <h2 className={styles.title}>
              {room.name} - {room.id}
            </h2>
            <p className={styles.roomDetails}>
              Room Details: {room.details || "No details available"}
            </p>

            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleButton} ${
                  view === "inventory" ? styles.active : ""
                }`}
                onClick={() => setView("inventory")}
              >
                Inventory
              </button>
              <button
                className={`${styles.toggleButton} ${
                  view === "missed" ? styles.active : ""
                }`}
                onClick={() => setView("missed")}
              >
                Missed Items
              </button>
            </div>

            {view === "inventory" && (
              <>
                <h3>Inventory Items</h3>
                <table className={styles.inventoryTable}>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Barcode</th>
                      <th>Scan</th>
                      <th>Barcode Checked</th>
                      <th>Object Detection</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {room.inventory.map((item, index) => {
                      const barcodeChecked = barcodeChecks[index] || false;
                      const objectChecked = objectChecks[index] || false;
                      const progress =
                        barcodeChecked && objectChecked
                          ? 100
                          : barcodeChecked
                          ? 50
                          : 0;

                      return (
                        <tr key={index}>
                          <td className={styles.itemName}>{item.name}</td>
                          <td className={styles.itemBarcode}>{item.qrCode}</td>
                          <td>
                            <button
                              className={styles.scanButton}
                              onClick={() => setScanningIndex(index)}
                            >
                              Scan
                            </button>
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={barcodeChecked}
                              readOnly
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={objectChecked}
                              readOnly
                            />
                          </td>
                          <td>
                            <div className={styles.progressBar}>
                              <div className={styles.progressTrack}></div>
                              <div
                                className={styles.progressFill}
                                style={{
                                  width:
                                    barcodeChecked && objectChecked
                                      ? "100%"
                                      : barcodeChecked
                                      ? "50%"
                                      : "0%",
                                }}
                              ></div>

                              <div
                                className={`${styles.stepCircle} ${
                                  barcodeChecked
                                    ? styles.complete
                                    : styles.active
                                }`}
                              >
                                1
                              </div>
                              <div
                                className={`${styles.stepCircle} ${
                                  barcodeChecked && objectChecked
                                    ? styles.complete
                                    : objectChecked
                                    ? styles.active
                                    : ""
                                }`}
                              >
                                2
                              </div>
                            </div>
                          </td>
                          <td>
                            <button
                              className={styles.missButton}
                              onClick={() => handleMoveToMissed(index)}
                              disabled={progress === 100}
                            >
                              Mark as Missing
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            {view === "missed" && (
              <>
                <h3>Missed Items</h3>
                <table className={styles.inventoryTable}>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Barcode</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missedItems.map((item, index) => (
                      <tr key={index}>
                        <td className={styles.itemName}>{item.name}</td>
                        <td className={styles.itemBarcode}>{item.qrCode}</td>
                        <td>
                          <button
                            className={styles.returnButton}
                            onClick={() => handleMoveToInventory(index)}
                          >
                            Return to Inventory
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <button
              style={{
                marginTop: "30px",
                padding: "12px 24px",
                fontSize: "16px",
                backgroundColor: "rgb(255, 130, 92)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
              onClick={handleCompleteVerification}
            >
              Finish Check
            </button>
          </>
        )}

        {scanningIndex !== null && (
          <BarcodeScanner
            onScan={(barcode) => handleBarcodeScan(barcode, scanningIndex)}
            closeScanner={() => setScanningIndex(null)}
          />
        )}

        {detectingIndex !== null && (
          <ObjectDetection
            itemName={room.inventory[detectingIndex].name}
            onDetect={handleObjectDetection}
            onCancel={() => {
              handleMoveToMissed(detectingIndex);
              setDetectingIndex(null);
            }}
          />
        )}

        {modal.visible && (
          <div
            className={`${styles.modal} ${
              modal.type === "success" ? styles.success : styles.error
            }`}
          >
            <p>{modal.message}</p>
          </div>
        )}

        {warning.visible && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "#fff3cd",
              border: "2px solid #856404",
              color: "#856404",
              padding: "20px",
              zIndex: 9999,
              borderRadius: "6px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
              width: "400px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "15px", marginBottom: "12px" }}>
              {warning.message}
            </p>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "10px" }}
            >
              <button
                style={{
                  backgroundColor: "#ffc107",
                  border: "none",
                  padding: "8px 16px",
                  color: "#212529",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
                onClick={() => completeVerification(warning.uncheckedItems)}
              >
                Confirm
              </button>
              <button
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid #ccc",
                  padding: "8px 16px",
                  color: "#212529",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setWarning({
                    visible: false,
                    message: "",
                    uncheckedItems: [],
                  })
                }
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RoomItem;
