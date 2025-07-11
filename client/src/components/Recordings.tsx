import { useState } from "react";
import APIconnector from "../services/APIcall";
import { GET_COMPLETE_LAYOUT_VIDEO_API, GET_VIDEO_RECORDINGS_FROM_SESSION_ID_API } from "../services/APIs";

const Recordings = () => {

    const [sessionId, setSessionId] = useState<string>("");
    const [chunksData, setChunksData] = useState([]);

    const fetchAllChunksHandler = async() => {
        console.log("SF", sessionId);
        if(sessionId === ""){
            return;
        }

        console.log("HERE");

        const response = await APIconnector({
            method: "POST",
            url: GET_VIDEO_RECORDINGS_FROM_SESSION_ID_API,
            bodyData: {sessionId}
        });

        console.log("RESPINSE", response);
    }

    const getCompleleLayoutVideoHandler = async() => {
        if(sessionId === ""){
            return;
        }

        console.log("HERE");

        const response = await APIconnector({
            method: "POST",
            url: GET_COMPLETE_LAYOUT_VIDEO_API,
            bodyData: {sessionId}
        });

        console.log("RESPINSE", response);
    }

    return (
        <div className="w-[100vw] h-[100vh] bg-[#000000] flex flex-col justify-center items-center gap-[2rem]">
            <label className="text-white font-semibold text-[1rem]">Enter Session Id</label>
            <input onChange={(e) => setSessionId(e.target.value)} placeholder="Enter Session Id" className="bg-white text-black border border-gray-400" />
            <button className="bg-amber-200 text-black font-bold p-[0.5rem] rounded-[1rem]" onClick={fetchAllChunksHandler}>Fetch Chunks Only</button>
            <button className="bg-amber-200 text-black font-bold p-[0.5rem] rounded-[1rem]" onClick={getCompleleLayoutVideoHandler}>GET PRE RENDERED VIDE</button>
        </div>
    )
}

export default Recordings;