import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { setRoomIdFn, setUserNameFn } from "../reducers/slices/appSlice";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const Home = () => {

    const [userName, setUserName] = useState<string>("");
    const [roomId, setRoomId] = useState<string>("");
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        let stream: MediaStream;

        const getMedia = async () => {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const videoTrack = stream.getVideoTracks()[0];
            if(videoRef.current){
                videoRef.current.srcObject = new MediaStream([videoTrack]);
                videoRef.current.play();
            }
        };

        getMedia();

        return () => {
            if(stream){
                stream.getTracks().forEach(track => track.stop());
            }

            if(videoRef.current){
                videoRef.current.pause();
                videoRef.current.srcObject = null;
            }
        };
    }, []);


    const joinRoomHandler = () => {
        dispatch(setRoomIdFn(roomId));
        dispatch(setUserNameFn(userName));
        toast.success("Joined Room");
        navigate("/room");
    }

  return (
    <div className="pb-[2rem] w-[100vw] min-h-[calc(100vh-4rem)] bg-[#000000] flex flex-col justify-center items-center gap-[4rem]">
        <div className="w-[100%] flex flex-col justify-center items-center gap-[1rem] z-[10]">
            <p className="md:max-w-[50%] max-w-[95%] text-[#adb5bd] font-semibold text-[20px] text-center">Record high quality podcasts without worrying about internet issues, with our unique local video recording architecture.</p>
            <button className="px-[1rem] py-[0.5rem] bg-[#fca311] rounded-2xl hover:scale-105 transition-all duration-200 cursor-pointer font-semibold text-black" onClick={() => navigate('/about')}>Know More</button>       
        </div>

        <div className="relative flex md:flex-row flex-col mx-auto justify-center items-center md:gap-[6rem] gap-[3rem]">
            <video className="sm:w-[30%] w-[70%] rounded-[1rem] z-[10]" autoPlay ref={videoRef} muted />
            <div className="absolute inset-0 z-0">
                <div className="w-[400px] h-[500px] bg-blue-500/45 absolute top-[-200px] left-[-50px] rounded-full blur-[100px] opacity-60 animate-pulse transition duration-10000 ease-in-out"></div>
                <div className="w-[700px] h-[500px] bg-pink-500/40 absolute top-[50px] left-[200px] rounded-full blur-[100px] opacity-60 animate-pulse transition duration-10000 ease-in-out"></div>
            </div>
            <div className="flex flex-col justify-center items-center gap-[1rem] z-[10]">
                <p className="text-[#adb5bd] max-w-[95%] font-semibold text-[16px] md:text-[18px] text-center">Join a pod cell and start your podcast now !</p>
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
        <div className="absolute bottom-[1rem] w-full text-center text-white font-semibold">Made by Abhiram T</div>
    </div>
  )
}

export default Home