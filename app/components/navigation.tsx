import { Link } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";

export default function Navigation() {
  const [time, setTime] = useState("00:00:00");
  const navRef = useRef<HTMLElement>(null);
  const [gsapLoaded, setGsapLoaded] = useState(false);

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

    // Dynamically import GSAP and ScrollTrigger
    import('gsap').then((gsapModule) => {
      const gsap = gsapModule.default;
      import('gsap/ScrollTrigger').then((ScrollTriggerModule) => {
        const ScrollTrigger = ScrollTriggerModule.default;
        gsap.registerPlugin(ScrollTrigger);
        setGsapLoaded(true);
      });
    });

    return () => {
      clearInterval(timer);
    }; // Cleanup on unmount
  }, []);

  useEffect(() => {
    if (gsapLoaded) {
      import('gsap').then((gsapModule) => {
        const gsap = gsapModule.default;
        import('gsap/ScrollTrigger').then((ScrollTriggerModule) => {
          const ScrollTrigger = ScrollTriggerModule.default;

          const lightSections = gsap.utils.toArray('.light-section') as HTMLElement[];
          
          lightSections.forEach((section) => {
            ScrollTrigger.create({
              trigger: section,
              start: 'top 10%',
              end: 'bottom 10%',
              onEnter: () => gsap.to(navRef.current, { color: 'var(--color-contrast-higher)', duration: 0.3 }),
              onLeave: () => gsap.to(navRef.current, { color: 'var(--color-bg)', duration: 0.3 }),
              onEnterBack: () => gsap.to(navRef.current, { color: 'var(--color-contrast-higher)', duration: 0.3 }),
              onLeaveBack: () => gsap.to(navRef.current, { color: 'var(--color-bg)', duration: 0.3 }),
            });
          });

          return () => {
            ScrollTrigger.getAll().forEach(trigger => trigger.kill());
          };
        });
      });
    }
  }, [gsapLoaded]);

  return (
    <nav ref={navRef} className="w-full px-4 py-4 fixed top-0 z-50 transition-colors duration-300 mix-blend-difference">
      <div className="mx-auto">
        <div className="flex flex-col">
          <div className="font-accent nav-text">LATIMER</div>
          <div className="flex justify-between w-full mt-4 lg:mt-0">
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
