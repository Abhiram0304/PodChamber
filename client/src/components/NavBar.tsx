import { useLocation, useNavigate } from "react-router-dom";
import icon from '../assets/icon.png'

const NavBar = () => {

    const location = useLocation();
    const navigate = useNavigate();

    return (
        <div className="w-[100%] h-[4rem] bg-gray-900 flex justify-between items-center flex-row p-[1rem]">
            <div onClick={() => navigate('/')} className="flex cursor-pointer flex-row gap-[0.5rem] justify-center items-center">
                <img src={icon} className="h-[3rem] w-[3rem] rounded-full overflow-hidden" />
                <p className="font-bold text-[1.1rem] font-mono text-[#fca311]">PodChamber</p>
            </div>
            <div>
                {
                    (location.pathname === "/") && (
                        <button className="px-[1rem] py-[0.5rem] bg-[#fca311] rounded-xl hover:scale-105 transition-all duration-200 cursor-pointer font-semibold text-black" onClick={() => navigate('/recordings')}>Get Recordings</button>
                    )
                }
                {
                    (location.pathname === "/recordings" || location.pathname === "/about") && (
                        <button className="px-[1rem] py-[0.5rem] bg-[#fca311] rounded-xl hover:scale-105 transition-all duration-200 cursor-pointer font-semibold text-black" onClick={() => navigate('/')}>Home</button>
                    )
                }
            </div>
        </div>
    )
}

export default NavBar;