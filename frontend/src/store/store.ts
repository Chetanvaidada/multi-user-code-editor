import { configureStore } from "@reduxjs/toolkit";
import userReducer from "../features/user/userSlice";
import roomReducer from "../features/room/roomSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    room: roomReducer,
  },
});

// types for hooks
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
