import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface RoomState {
  currentRoomId: string | null;
}

const initialState: RoomState = {
  currentRoomId: null,
};

const roomSlice = createSlice({
  name: "room",
  initialState,
  reducers: {
    setRoomId(state, action: PayloadAction<string>) {
      state.currentRoomId = action.payload;
    },
    clearRoom(state) {
      state.currentRoomId = null;
    },
  },
});

export const { setRoomId, clearRoom } = roomSlice.actions;
export default roomSlice.reducer;
