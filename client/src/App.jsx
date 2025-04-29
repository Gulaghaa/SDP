import React, { useState, useMemo } from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";
import {
  Home,
  Login,
  AdminPanel,
  AddRoom,
  RoomsList,
  RoomItem,
  EditRoom
} from "./pages/index";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useMemo(() => {
    const storedAuth = localStorage.getItem("isAuthenticated");
    if (storedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <Switch>
      <Route exact path="/">
        <Home />
      </Route>
      <Route exact path="/rooms">
        <RoomsList />
      </Route>
      <Route exact path="/room/:roomId">
        <RoomItem />
      </Route>
      <Route exact path="/login">
        <Login
          setIsAuthenticated={setIsAuthenticated}
          isAuthenticated={isAuthenticated}
        />
      </Route>
      <Route exact path="/admin">
        <AdminPanel />
      </Route>
      <Route exact path="/admin/add-room">
        <AddRoom />
      </Route>
      <Route path="/admin/edit-room/:roomId">
        <EditRoom />
      </Route>

    </Switch>
  );
};

export default App;
