import { useState, useEffect } from "react";
import { useFetchData } from "../../services/apiUtilities";
import { useHistory } from "react-router-dom";
import styles from "./AdminPanel.module.css";

const AdminPanel = () => {
  const [rooms, setRooms] = useState([]);
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Panel - Room Management</h1>
        <button
          className={styles.addButton}
          onClick={() => history.push("/admin/add-room")}
        >
          + Add Room
        </button>
      </div>

      <div className={styles.roomGrid}>
        {rooms.map((room) => (
          <div key={room.id} className={styles.roomCard}>
            <div className={styles.roomInfo}>
              <h3 className={styles.roomName}>{room.name}</h3>
              <p className={styles.inventoryCount}>
                {room.inventory.length} Items
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPanel;
