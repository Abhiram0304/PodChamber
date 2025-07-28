const About = () => {
    return (
        <div className="relative w-[100vw] font-mono min-h-[calc(100vh-4rem)] bg-[#000000] flex flex-col justify-center items-center gap-[2rem]">
                <h2 className="max-w-[95%] text-[1.5rem] font-bold text-center">Why PodChamber’s Architecture Stands Out</h2>
                <div className="absolute inset-0 z-0">
                    <div className="w-[400px] h-[500px] bg-blue-500/20 absolute top-[200px] left-[250px] rounded-full blur-[100px] opacity-60 animate-pulse transition duration-10000 ease-in-out"></div>
                    <div className="w-[700px] h-[500px] bg-pink-500/30 absolute top-[50px] left-[400px] rounded-full blur-[100px] opacity-60 animate-pulse transition duration-10000 ease-in-out"></div>
                </div>
                <ul className="max-w-[95%] flex flex-col gap-[1rem] text-center">
                    <li>
                        <strong className="text-[1.2rem]">Local video & audio recording</strong> – Each participant records directly from their device's camera and mic, capturing raw, high-quality media.
                    </li>
                    <li>
                        <strong className="text-[1.2rem]">Unaffected final quality</strong> – Internet issues may affect the live call experience, but they <em>do not impact</em> the final recording.
                    </li>
                    <li>
                        <strong className="text-[1.2rem]">Consistently high-resolution output</strong> – Since recordings are done locally, the result is always sharp and professional-grade.
                    </li>
                    <li>
                        <strong className="text-[1.2rem]">No live compression or quality loss</strong> – Unlike stream-based systems, there's no quality degradation during recording.
                    </li>
                    <li>
                        <strong className="text-[1.2rem]">Smart background uploads</strong> – Recordings are uploaded in background, ensuring stable performance and minimal disruption.
                    </li>
                    <li>
                        <strong className="text-[1.2rem]">Built for creators, not just conversations</strong> – Designed specifically for podcasters and storytellers who need reliable, studio-quality content.
                    </li>
                </ul>
            <div className="relative bottom-[1rem] w-full text-center text-white font-semibold">Made by Abhiram T</div>
        </div>
    )
}

export default About