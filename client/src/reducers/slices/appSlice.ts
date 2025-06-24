import { createSlice } from "@reduxjs/toolkit";

interface AppState {
    userName: string;
    roomId: string;
    socket: any;
    localAudioTrack: MediaStreamTrack | null;
    localVideoTrack: MediaStreamTrack | null;
}

const initialState: AppState = {
    userName: "",
    roomId: "",
    socket: null,
    localAudioTrack: null,
    localVideoTrack: null,
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
        setLocalAudioTrack: (state, action) => {
            state.localAudioTrack = action.payload;
        },
        setLocalVideoTrack: (state, action) => {
            state.localVideoTrack = action.payload;
        },
        reset: () => {
            return initialState;
        }
    }
})

export const { setUserNameFn, setRoomIdFn, setSocketFn, setLocalAudioTrack, setLocalVideoTrack, reset } = AppSlice.actions;
export default AppSlice.reducer;