import React from "react";
import styles from "./Home.module.css";
import { useHistory } from "react-router-dom";
import { homeBackground, logo } from "../../assets/index"
import { Navbar } from "../../components/index";

const Home = () => {

  const history = useHistory()

  return (
    <>
      <div className={styles.container}>
        {/* <div className={styles.title}>
          <img src={logo} className={styles.logo} alt="description" />
        </div> */}
        <Navbar />
        <div className={styles.content}>
          <div className={styles.content_left}>
            <span className={styles.content_left_header}>
              Streamline Your Inventory Management with Smart Technology
            </span>
            <span className={styles.content_left_subheader}>
              Manage and track your inventory seamlessly using QR codes and advanced object detection. Select a room to get started and experience effortless inventory management today.
            </span>
            <div className={styles.content_left_button_container}>
              <button
                onClick={() => history.push(`/rooms`)}
                className={styles.content_left_button_1}
              >
                Select a room
              </button>
              <button
                className={styles.content_left_button_2}
              >
                Learn the process</button>
            </div>
          </div>
          <div className={styles.content_right}>
            <img src={homeBackground} alt="desciption" />
          </div>

        </div>
      </div>
    </>
  );
};

export default Home;
