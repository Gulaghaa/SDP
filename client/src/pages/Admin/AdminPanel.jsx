import { useState, useEffect } from "react";
import { useFetchData } from "../../services/apiUtilities";
import { useHistory } from "react-router-dom";
import styles from "./AdminPanel.module.css";

const AdminPanel = () => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const history = useHistory();

  useEffect(() => {
    const getRooms = async () => {
      const response = await useFetchData(
        "https://smart-inventory-management-k5rx.onrender.com/rooms"
      );
      setRooms(response || []);
    };

    getRooms();
  }, []);

  const handleDelete = async () => {
    if (!selectedRoom) return;

    try {
      const response = await fetch(
        `https://smart-inventory-management-k5rx.onrender.com/rooms/${selectedRoom}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();
      if (result.message === "Room deleted") {
        setRooms((prev) => prev.filter((room) => room.id !== selectedRoom));
        setShowDeleteModal(false);
        setSelectedRoom(null);
      } else {
        alert("Failed to delete room.");
      }
    } catch (err) {
      console.error("Error deleting room:", err);
      alert("An error occurred while deleting the room.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Admin Panel - Room Management</span>
        <button
          className={styles.addButton}
          onClick={() => history.push("/admin/add-room")}
        >
          Add Room
        </button>
      </div>

      <div className={styles.roomGrid}>
        {rooms.map((room) => (
          <div key={room.id} className={styles.roomCard}>
            <div className={styles.roomInfo}>
              <span className={styles.roomName}>
                {room.id} - {room.name}
              </span>
              <p className={styles.inventoryCount}>
                {room.inventory.length} Items
              </p>
            </div>
            <div className={styles.buttonGroup}>
              <button
                className={styles.editButton}
                onClick={() => history.push(`/admin/edit-room/${room.id}`)}
              >Edit</button>
              <button
                className={styles.deleteButton}
                onClick={() => {
                  setSelectedRoom(room.id);
                  setShowDeleteModal(true);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#fff3cd",
            border: "1px solid #856404",
            padding: "5px 0px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
            zIndex: 9999,
            width: "300px",
            textAlign: "center",
          }}
        >
          <span>
            Are you sure you want to delete room {selectedRoom}?
          </span>
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              justifyContent: "center",
              gap: "7px",
            }}
          >
            <button
              style={{
                backgroundColor: "#dc3545",
                color: "#fff",
                padding: "2px 10px",
                border: "none",
                cursor: "pointer",
              }}
              onClick={handleDelete}
            >
              Confirm
            </button>
            <button
              style={{
                backgroundColor: "#6c757d",
                color: "#fff",
                padding: "6px 14px",
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedRoom(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
