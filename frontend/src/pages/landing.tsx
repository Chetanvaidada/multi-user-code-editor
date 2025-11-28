import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../store/hooks";
import { setName, setClientId } from "../features/user/userSlice";
import { getOrCreateClientId } from "../utils/identity";

const Landing: React.FC = () => {
  const [name, setLocalName] = useState("");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Please enter your name");
    const clientId = getOrCreateClientId();
    dispatch(setName(name.trim()));
    dispatch(setClientId(clientId));
    navigate("/actions");
  };

  return (
    <div className="landing-container">
      <h1>Realtime Code Editor</h1>
      <form onSubmit={onSubmit} className="landing-form">
        <label>
          Enter your name:
          <input
            type="text"
            value={name}
            onChange={(e) => setLocalName(e.target.value)}
            placeholder="e.g. Alice"
          />
        </label>
        <button type="submit" className="btn-primary btn-large">Continue</button>
      </form>
    </div>
  );
};

export default Landing;
