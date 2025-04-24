import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { useFetchData } from "../../services/apiUtilities";
import { Navbar } from "../../components/index";
import styles from "./RoomsList.module.css";

const RoomsList = () => {
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const roomsPerPage = 6;
  const history = useHistory();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await useFetchData(
          "https://smart-inventory-management-k5rx.onrender.com/rooms"
        );
        setRooms(data || []);
      } catch (err) {
        setError("Failed to load rooms. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const filteredRooms = rooms.filter(
    (room) =>
      room.id.toLowerCase().includes(search.toLowerCase()) ||
      room.name.toLowerCase().includes(search.toLowerCase())
  );

  const indexOfLastRoom = currentPage * roomsPerPage;
  const indexOfFirstRoom = indexOfLastRoom - roomsPerPage;
  const currentRooms = filteredRooms.slice(indexOfFirstRoom, indexOfLastRoom);
  const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.searchContainer}>
          <label htmlFor="search" className={styles.searchLabel}>
            Search Room:
          </label>
          <input
            id="search"
            type="text"
            placeholder="Search by Room ID or Name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchBar}
          />
        </div>

        {loading && <p className={styles.loading}>Loading rooms...</p>}
        {error && <p className={styles.error}>{error}</p>}

        {!loading && !error && (
          <>
            <ul className={styles.roomList}>
              {currentRooms.length > 0 ? (
                currentRooms.map((room) => (
                  <li key={room.id} className={styles.roomItem}>
                    {/* ✅ Last Checked Time Label */}
                    <div className={styles.lastChecked}>
                      Last Checked: {room.lastCheckedTime || "Not Available"}
                    </div>

                    <div
                      className={styles.roomDetails}
                      onClick={() => history.push(`/room/${room.id}`)}
                    >
                      <span className={styles.roomName}>{room.name}</span>
                      <span className={styles.roomId}>Room No: {room.id}</span>
                    </div>
                    <button
                      className={styles.viewInventoryButton}
                      onClick={() => history.push(`/room/${room.id}`)}
                    >
                      See Inventory
                    </button>
                  </li>
                ))
              ) : (
                <p className={styles.noRooms}>No rooms found.</p>
              )}
            </ul>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageButton}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                >
                  ◀ Prev
                </button>

                <span className={styles.pageNumber}>
                  Page
                  <input
                    type="text"
                    value={currentPage}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^[0-9\b]+$/.test(value)) {
                        let page = Number(value);
                        if (page >= 1 && page <= totalPages) {
                          setCurrentPage(page);
                        } else if (value === "") {
                          setCurrentPage("");
                        }
                      }
                    }}
                    onBlur={(e) => {
                      let page = Number(e.target.value);
                      if (page < 1 || isNaN(page)) {
                        setCurrentPage(1);
                      } else if (page > totalPages) {
                        setCurrentPage(totalPages);
                      }
                    }}
                    className={styles.pageInput}
                  />
                  of {totalPages}
                </span>

                <button
                  className={styles.pageButton}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next ▶
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default RoomsList;
