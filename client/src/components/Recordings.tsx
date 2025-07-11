import { useState } from "react";
import APIconnector from "../services/APIcall";
import { GET_COMPLETE_LAYOUT_VIDEO_API, GET_VIDEO_RECORDINGS_FROM_SESSION_ID_API } from "../services/APIs";
import toast from "react-hot-toast";

const Recordings = () => {

    const [sessionId, setSessionId] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [chunksData, setChunksData] = useState<any>([]);

    const fetchAllChunksHandler = async() => {
        setChunksData([]);
        if(sessionId === ""){
            toast.error("Enter Session Id");
            return;
        }

        const response = await APIconnector({
            method: "POST",
            url: GET_VIDEO_RECORDINGS_FROM_SESSION_ID_API,
            bodyData: {sessionId}
        });
        
        if(response?.data?.success && response?.data?.users){
            toast.success("Fetched All chunks of the session")
            const formattedData = Object.entries(response?.data?.users).map(
              ([userId, chunks]) => ({
                userId,
                chunks
              })
            );
            setChunksData(formattedData);
        }else{
            console.log("FDFD");
            toast.error("Something went wrong, ");
        }
    }

    const getCompleleLayoutVideoHandler = async() => {
        if(sessionId === "" || email === ""){
            toast("Enter Data in All Fields");
            return;
        }

        const response = await APIconnector({
            method: "POST",
            url: GET_COMPLETE_LAYOUT_VIDEO_API,
            bodyData: {sessionId,email}
        });

        if(response?.data?.success){
            toast.success("Pre rendered video link will be mailed to you");
        }else{
            toast.error("Something went wrong, ", response?.data?.message);
        }
    }

    return (
        <div className="relative w-[100vw] min-h-[calc(100vh-4rem)] bg-[#000000] flex flex-col items-center justify-start px-4 py-8 gap-6">
            <h1 className="text-white text-2xl font-bold mb-2 text-center">
                Access Your PodChamber Recordings
            </h1>
            <p className="text-white text-sm max-w-xl text-center">
                Use the session ID generated during recording in the PodCell to access your content.
                Session recordings will be automatically deleted after <span className="font-semibold">12 hours</span>, 
                and pre-rendered videos will be deleted after <span className="font-semibold">24 hours</span> of creation.
                Pre rendered video link will be sent to your email id.
            </p>

            <div className="flex flex-col items-center gap-2 w-full max-w-md mt-4">
                <label className="text-white font-medium self-start">Session ID</label>
                <input
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="Enter Session ID"
                    className="w-full px-4 py-2 rounded-md border border-gray-500 bg-white text-black"
                />

                <label className="text-white mt-[1rem] font-medium self-start">Email Address</label>
                <input
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Email Address"
                    className="w-full px-4 py-2 rounded-md border border-gray-500 bg-white text-black"
                />

                <button
                    className="w-full cursor-pointer hover:scale-105 transition-all duration-200 mt-[3rem] bg-amber-300 hover:bg-amber-400 text-black font-semibold py-2 rounded-lg transition"
                    onClick={fetchAllChunksHandler}
                >
                    Fetch Chunks Only
                </button>

                <button
                    className="w-full cursor-pointer hover:scale-105 transition-all duration-200 bg-amber-300 hover:bg-amber-400 text-black font-semibold py-2 rounded-lg transition"
                    onClick={getCompleleLayoutVideoHandler}
                >
                    Get Pre-rendered Video
                </button>
            </div>

            {chunksData.length > 0 && (
                <div className="w-full max-w-4xl mt-8">
                    <h2 className="text-white text-xl font-bold mb-4 text-center">User Recordings</h2>
                    <div className="flex flex-col gap-6">
                    {chunksData.map((user: any) => (
                        <div key={user.userId} className="bg-[#111] p-4 rounded-md shadow-md">
                        <h3 className="text-amber-300 font-semibold mb-2">User ID: {user.userId}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {user.chunks.map((url: string, index: number) => (
                            <div key={index} className="flex flex-col items-start gap-2">
                                <video
                                src={url}
                                controls
                                className="w-full rounded-md border border-gray-700"
                                />
                                <a
                                href={url}
                                download={`user-${user.userId}-chunk-${index}.webm`}
                                className="text-sm bg-amber-300 hover:bg-amber-400 text-black font-medium px-3 py-1 rounded-md transition"
                                >
                                Download Chunk {index + 1}
                                </a>
                            </div>
                            ))}
                        </div>
                        </div>
                    ))}
                    </div>
                </div>
                )}


            <div className="absolute bottom-[1rem] w-full text-center text-white font-semibold">Made by Abhiram T</div>
        </div>
    )
}

export default Recordings;