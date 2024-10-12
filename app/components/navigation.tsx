import { Link } from "@remix-run/react";
import { useState, useEffect } from "react";

export default function Navigation() {
  const [time, setTime] = useState("00:00:00");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const laTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now);
      setTime(laTime);
    };

    updateTime(); // Initial call
    const timer = setInterval(updateTime, 1000); // Update every second

    return () => clearInterval(timer); // Cleanup on unmount
  }, []);

  return (
    <nav className="w-full px-4 py-4 navigation fixed top-0 z-10">
      <div className=" mx-auto">
        <div className="flex flex-col">
          <div className="font-accent nav-text">LATIMER</div>
          <div className="flex justify-between w-full">
            <div className="flex flex-col">
              <div>DIGITAL COWBOY</div>
              <div>LOS ANGELES, CA {time}</div>
            </div>
            <div className="flex flex-col">
              <Link to="/work" className="block">WORK</Link>
              <Link to="/process" className="block">PROCESS</Link>
              <Link to="/about" className="block">ABOUT</Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}