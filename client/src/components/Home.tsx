import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { setLocalAudioTrack, setLocalVideoTrack, setRoomIdFn, setUserNameFn } from "../reducers/slices/appSlice";
import { useNavigate } from "react-router-dom";

const Home = () => {

    const [userName, setUserName] = useState<string>("");
    const [roomId, setRoomId] = useState<string>("");
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const getMedia = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        dispatch(setLocalAudioTrack(audioTrack));
        dispatch(setLocalVideoTrack(videoTrack));

        if(!videoRef.current) return;

        videoRef.current.srcObject = new MediaStream([videoTrack]);
        videoRef.current.play();
    }

    useEffect(() => {
        if(videoRef && videoRef.current){
            getMedia();
        }
    }, [videoRef]);

    const joinRoomHandler = () => {
        dispatch(setRoomIdFn(roomId));
        dispatch(setUserNameFn(userName));
        navigate("/room");
    }

  return (
    <div className="w-[100vw] h-[100vh] bg-[#000000] flex flex-col justify-center items-center gap-[2rem]">
        <div className="w-[100%] flex flex-col justify-center items-center gap-[1rem]">
            <p className="text-[#adb5bd] font-extrabold text-[28px] text-center">PodRecord</p>
            <p className="text-[#adb5bd] font-semibold text-[22px] text-center">Creating podcasts made easy</p>
        </div>

        <div className="flex md:flex-row flex-col justify-center items-center gap-[3rem]">
            <video className="h-[40%]" autoPlay ref={videoRef} muted />

            <div className="w-full flex flex-col justify-center items-center gap-[1rem]">
                <p className="text-[#adb5bd] font-semibold text-[22px] text-center">Join a pod cell and start your journey now !</p>
                <input 
                    type="text" 
                    placeholder="Enter your Room ID"
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-[300px] h-[50px] bg-[#212529] text-[#adb5bd] border-2 border-[#495057] rounded-[5px] px-[1rem] focus:outline-none focus:border-[#0d6efd] focus:ring-1 focus:ring-[#0d6efd]"
                />
                <input 
                    type="text" 
                    placeholder="Enter your User Name"
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-[300px] h-[50px] bg-[#212529] text-[#adb5bd] border-2 border-[#495057] rounded-[5px] px-[1rem] focus:outline-none focus:border-[#0d6efd] focus:ring-1 focus:ring-[#0d6efd]"
                />
                <button className="w-[300px] h-[50px] bg-[#fca311] text-[#ffffff] font-semibold rounded-[5px] hover:bg-[#0b5ed7] transition duration-200 ease-in-out" onClick={joinRoomHandler}>
                    Join Pod Cell
                </button>
            </div>
        </div>
    </div>
  )
}

export default Home