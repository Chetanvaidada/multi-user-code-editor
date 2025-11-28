// src/features/user/userSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UserState {
  name: string | null;
  clientId: string | null;
}

const initialState: UserState = {
  name: null,
  clientId: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setName(state, action: PayloadAction<string>) {
      state.name = action.payload;
    },
    setClientId(state, action: PayloadAction<string>) {
      state.clientId = action.payload;
    },
    clearUser(state) {
      state.name = null;
      state.clientId = null;
    },
  },
});

export const { setName, setClientId, clearUser } = userSlice.actions;
export default userSlice.reducer;
