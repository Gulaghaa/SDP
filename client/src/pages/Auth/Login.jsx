import { useState } from "react";
import { useHistory } from "react-router-dom";
import axios from "axios";
import styles from "./Login.module.css";

const Login = ({ setIsAuthenticated }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const history = useHistory();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post("https://smart-inventory-management-k5rx.onrender.com/login", {
        username,
        password,
      });

      if (response.status === 200) {
        setIsAuthenticated(true);
        localStorage.setItem("isAuthenticated", "true");
        history.push("/admin"); 
      }
    } catch (error) {
      console.error(error);
      if (error.response && error.response.status === 401) {
        setError("Invalid username or password.");
      } else {
        setError("An error occurred. Please try again later.");
      }
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Admin Login</h2>
      {error && <p className={styles.error}>{error}</p>}
      <form onSubmit={handleLogin} className={styles.form}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className={styles.input}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={styles.input}
        />
        <button type="submit" className={styles.button}>Login</button>
      </form>
    </div>
  );
};

export default Login;
