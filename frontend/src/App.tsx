import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/landing";
import RoomActions from "./pages/roomActions";
import RoomPage from "./pages/roomPage";

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/actions" element={<RoomActions />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
