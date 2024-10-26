import { Link } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";

export default function Navigation() {
  const [time, setTime] = useState("00:00:00.000");
  const navRef = useRef<HTMLElement>(null);
  const navBgRef = useRef<HTMLDivElement>(null);
  const navTextRef = useRef<HTMLAnchorElement>(null);
  const navInfoRef = useRef<HTMLDivElement>(null);
  const [gsapLoaded, setGsapLoaded] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const laTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 2,
        hour12: false,
      }).format(now);
      setTime(laTime);
    };

    updateTime(); // Initial call
    const timer = setInterval(updateTime, 10); // Update every 10ms for smooth millisecond updates

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
    if (gsapLoaded && navTextRef.current && navInfoRef.current && navRef.current && navBgRef.current) {
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
              onEnter: () => {
                gsap.to(navRef.current, { 
                  color: 'var(--color-contrast-higher)', 
                  duration: 0.3 
                });
                gsap.to(navBgRef.current, {
                  opacity: 1,
                  duration: 0.3
                });
              },
              onLeave: () => {
                gsap.to(navRef.current, { 
                  color: 'var(--color-bg)', 
                  duration: 0.3 
                });
                gsap.to(navBgRef.current, {
                  opacity: 0,
                  duration: 0.3
                });
              },
              onEnterBack: () => {
                gsap.to(navRef.current, { 
                  color: 'var(--color-contrast-higher)', 
                  duration: 0.3 
                });
                gsap.to(navBgRef.current, {
                  opacity: 1,
                  duration: 0.3
                });
              },
              onLeaveBack: () => {
                gsap.to(navRef.current, { 
                  color: 'var(--color-bg)', 
                  duration: 0.3 
                });
                gsap.to(navBgRef.current, {
                  opacity: 0,
                  duration: 0.3
                });
              },
            });
          });

          // Smooth animation for nav-text and nav-info
          const navTextHeight = navTextRef.current?.offsetHeight || 0;
          let lastScrollTop = 0;
          let navTextVisible = true;
          
          ScrollTrigger.create({
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: () => {
              const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
              const scrollDirection = scrollTop > lastScrollTop ? 1 : -1;
              
              if (navTextRef.current && navInfoRef.current && navBgRef.current) {
                if (scrollDirection === 1 && navTextVisible) {
                  // Scrolling down and nav-text is visible
                  gsap.to(navTextRef.current, { yPercent: -100, duration: 0.3 });
                  
                  const navInfoRect = navInfoRef.current.getBoundingClientRect();
                  const desiredTop = window.innerWidth >= 1024 ? 40 : 30;
                  const moveDistance = navInfoRect.top - desiredTop;

                  gsap.to(navInfoRef.current, { 
                    y: -moveDistance,
                    duration: 0.3
                  });

                  if (window.innerWidth >= 1024) {
                    // Desktop behavior
                    gsap.to(navBgRef.current, { height: `calc(100% - ${navTextHeight/4}px)`, y: -navTextHeight/4, duration: 0.3 });
                  } else {
                    // Mobile behavior
                    gsap.to(navBgRef.current, { height: `calc(100% - ${navTextHeight/2}px)`, y: -navTextHeight/2, duration: 0.3 });
                  }
                  navTextVisible = false;
                } else if (scrollDirection === -1 && !navTextVisible) {
                  // Scrolling up and nav-text is hidden
                  gsap.to(navTextRef.current, { yPercent: 0, duration: 0.3 });
                  gsap.to(navInfoRef.current, { y: 0, duration: 0.3 });
                  gsap.to(navBgRef.current, { height: '100%', y: 0, duration: 0.3 });
                  navTextVisible = true;
                }
              }
              
              lastScrollTop = scrollTop;
            }
          });

          return () => {
            ScrollTrigger.getAll().forEach(trigger => trigger.kill());
          };
        });
      });
    }
  }, [gsapLoaded]);

  return (
    <nav ref={navRef} className="w-full px-4 py-4 fixed top-0 left-0 right-0 transition-colors duration-300 ">
      <div 
        ref={navBgRef} 
        className="absolute top-0 left-0 right-0 bottom-0 z-[-1] opacity-0"
        style={{
          background: 'linear-gradient(180deg, #DCCFBE 0%, rgba(220, 207, 190, 0.47) 68%, rgba(220, 207, 190, 0.00) 100%)'
        }}
      ></div>
      <div className="mx-auto relative z-10">
        <div className="flex flex-col">
          <Link ref={navTextRef} to="/" className="font-accent nav-text">LATIMER</Link>
          <div ref={navInfoRef} className="nav-info flex justify-between w-full mt-4 lg:mt-0">
            <div className="flex flex-col gap-1">
              <div>DIGITAL COWBOY</div>
              <div>LOS ANGELES, CA {time}</div>
            </div>
            <div className="flex flex-col gap-1 no-bullet-holes">
              <Link to="/work" className="block">WORK</Link>
              <Link to="/about" className="block">ABOUT</Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
