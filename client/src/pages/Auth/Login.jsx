import { useState } from "react";
import { useHistory } from "react-router-dom"; 
import { useFetchData } from "../../services/apiUtilities"; 
import styles from "./Login.module.css"; 

const Login = ({ setIsAuthenticated, IsAuthenticated }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const history = useHistory(); 

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const users = await useFetchData("http://localhost:3000/users");
      const user = users.find((u) => u.username === username && u.password === password);

      console.log(users, user)
      if (user) {
        setIsAuthenticated(true);
        console.log(IsAuthenticated)
        localStorage.setItem("isAuthenticated", "true");
        history.push("/admin"); 
      } else {
        setError("Invalid username or password.");
      }
    } catch (error) {
      setError("An error occurred. Please try again later.");
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
