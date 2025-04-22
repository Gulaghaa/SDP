import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { logo } from "../../assets/index";
import styles from "./Navbar.module.css";

const Navbar = () => {
  const history = useHistory();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <nav className={styles.navbar}>
      <div className={styles.logoContainer} onClick={() => history.push("/")}>
        <img src={logo} alt="Logo" className={styles.logo} />
      </div>

      <div className={`${styles.menu} ${isMobile ? styles.hidden : ""}`}>
        <button
          className={styles.navButton}
          onClick={() => history.push("/")}
        >
          Home
        </button>
        <button
          className={styles.navButton}
          onClick={() => history.push("/rooms")}
        >
          Rooms
        </button>
      </div>

      {isMobile && (
        <div className={styles.menuIcon} onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </div>
      )}

      {menuOpen && (
        <div className={styles.dropdownMenu}>
          <button
            className={styles.dropdownItem}
            onClick={() => {
              history.push("/");
              setMenuOpen(false);
            }}
          >
            Home
          </button>
          <button
            className={styles.dropdownItem}
            onClick={() => {
              history.push("/rooms");
              setMenuOpen(false);
            }}
          >
            Rooms
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
