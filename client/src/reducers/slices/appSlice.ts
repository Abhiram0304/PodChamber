import { createSlice } from "@reduxjs/toolkit";

interface AppState {
    userName: string;
    roomId: string;
    socket: any;
}

const initialState: AppState = {
    userName: "",
    roomId: "",
    socket: null,
}

const AppSlice = createSlice({
    name: "app",
    initialState: initialState,
    reducers: {
        setUserNameFn: (state, action) => {
            state.userName = action.payload;
        },
        setRoomIdFn: (state, action) => {
            state.roomId = action.payload;
        },
        setSocketFn: (state, action) => {
            state.socket = action.payload;
        }, 
        reset: () => {
            return initialState;
        }
    }
})

export const { setUserNameFn, setRoomIdFn, setSocketFn, reset } = AppSlice.actions;
export default AppSlice.reducer;