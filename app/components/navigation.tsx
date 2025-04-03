import { Link } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";

export default function Navigation() {
  const [time, setTime] = useState("00:00:00.000");
  const navRef = useRef<HTMLElement>(null);
  const navBgRef = useRef<HTMLDivElement>(null);
  const navTextRef = useRef<HTMLAnchorElement>(null);
  const navInfoRef = useRef<HTMLDivElement>(null);
  const [gsapLoaded, setGsapLoaded] = useState(false);

  // Add a unique ID to the nav element to help track it
  const navId = useRef(`nav-${Date.now()}`);
  
  // Component mount/unmount tracking with DOM inspection and cleanup
  useEffect(() => {
    console.log(`Navigation component MOUNTED with ID: ${navId.current}`);
    
    // Check for existing navigation elements that might indicate duplicates
    const existingNavs = document.querySelectorAll('nav');
    console.log(`Found ${existingNavs.length} nav elements in the DOM:`, 
      Array.from(existingNavs).map((nav, i) => {
        const rect = nav.getBoundingClientRect();
        return {
          index: i,
          id: nav.id,
          className: nav.className,
          position: { top: rect.top, left: rect.left },
          size: { width: rect.width, height: rect.height }
        };
      })
    );
    
    // Check for existing LATIMER links
    const existingLatimerLinks = document.querySelectorAll('a.nav-text');
    console.log(`Found ${existingLatimerLinks.length} LATIMER links in the DOM:`,
      Array.from(existingLatimerLinks).map((link, i) => {
        const rect = link.getBoundingClientRect();
        return {
          index: i,
          href: link.getAttribute('href'),
          className: link.className,
          position: { top: rect.top, left: rect.left },
          transform: (link as HTMLElement).style.transform
        };
      })
    );
    
    // CRITICAL FIX: Clean up any existing GSAP animations and reset styles on mount
    // This ensures we don't have lingering animations from previous navigation
    import('gsap').then((gsapModule) => {
      const gsap = gsapModule.default;
      import('gsap/ScrollTrigger').then((ScrollTriggerModule) => {
        const ScrollTrigger = ScrollTriggerModule.default;
        
        // Kill all existing ScrollTrigger instances
        ScrollTrigger.getAll().forEach(trigger => {
          console.log(`Killing existing ScrollTrigger on mount: ${trigger.vars?.id || 'unnamed'}`);
          trigger.kill();
        });
        
        // Reset any existing nav elements to prevent duplicates
        document.querySelectorAll('nav').forEach((nav, i) => {
          if (i > 0) { // Keep the first one (current component's nav)
            console.log(`Removing duplicate nav element ${i}`);
            // Use gsap to ensure the variable is used
            gsap.set(nav, { display: 'none', onComplete: () => nav.remove() });
          }
        });
      });
    });
    
    return () => {
      console.log(`Navigation component UNMOUNTED with ID: ${navId.current}`);
      
      // CRITICAL FIX: Clean up GSAP animations and reset styles on unmount
      import('gsap').then((gsapModule) => {
        const gsap = gsapModule.default;
        
        // Reset transforms on nav elements to prevent persisting styles
        if (navTextRef.current) {
          console.log('Resetting navTextRef transform on unmount');
          gsap.set(navTextRef.current, { clearProps: "all" });
        }
        
        if (navInfoRef.current) {
          console.log('Resetting navInfoRef transform on unmount');
          gsap.set(navInfoRef.current, { clearProps: "all" });
        }
        
        if (navBgRef.current) {
          console.log('Resetting navBgRef transform on unmount');
          gsap.set(navBgRef.current, { clearProps: "all" });
        }
        
        import('gsap/ScrollTrigger').then((ScrollTriggerModule) => {
          const ScrollTrigger = ScrollTriggerModule.default;
          
          // Kill all ScrollTrigger instances
          ScrollTrigger.getAll().forEach(trigger => {
            console.log(`Killing ScrollTrigger on unmount: ${trigger.vars?.id || 'unnamed'}`);
            trigger.kill();
          });
        });
      });
      
      // Check if nav elements still exist after unmount
      setTimeout(() => {
        const navsAfterUnmount = document.querySelectorAll('nav');
        console.log(`After unmount: ${navsAfterUnmount.length} nav elements still in the DOM`);
        
        const latimerLinksAfterUnmount = document.querySelectorAll('a.nav-text');
        console.log(`After unmount: ${latimerLinksAfterUnmount.length} LATIMER links still in the DOM`);
      }, 0);
    };
  }, []);

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

    console.log('Setting up time interval');
    updateTime(); // Initial call
    const timer = setInterval(updateTime, 10); // Update every 10ms for smooth millisecond updates

    // Dynamically import GSAP and ScrollTrigger
    console.log('Importing GSAP and ScrollTrigger');
    import('gsap').then((gsapModule) => {
      const gsap = gsapModule.default;
      import('gsap/ScrollTrigger').then((ScrollTriggerModule) => {
        const ScrollTrigger = ScrollTriggerModule.default;
        gsap.registerPlugin(ScrollTrigger);
        console.log('GSAP and ScrollTrigger loaded and registered');
        setGsapLoaded(true);
      });
    });

    return () => {
      console.log('Cleaning up time interval');
      clearInterval(timer);
    }; // Cleanup on unmount
  }, []);

  // CRITICAL FIX: Use a direct window scroll event listener instead of ScrollTrigger
  // This ensures the scroll behavior works across all pages and after navigation
  useEffect(() => {
    if (gsapLoaded && navTextRef.current && navInfoRef.current && navRef.current && navBgRef.current) {
      console.log(`GSAP loaded, setting up animations for nav ID: ${navId.current}`);
      
      // Set a data attribute to help identify this nav instance
      navRef.current.setAttribute('data-nav-id', navId.current);
      
      console.log('Nav elements:', {
        navRef: navRef.current,
        navTextRef: navTextRef.current,
        navInfoRef: navInfoRef.current,
        navBgRef: navBgRef.current
      });
      
      // Check for other nav elements with the same structure
      const allNavs = document.querySelectorAll('nav');
      console.log(`Total nav elements in DOM when setting up GSAP: ${allNavs.length}`);
      if (allNavs.length > 1) {
        console.warn('Multiple nav elements detected when setting up GSAP animations!');
        Array.from(allNavs).forEach((nav, i) => {
          console.log(`Nav ${i} details:`, {
            id: nav.id,
            dataNavId: nav.getAttribute('data-nav-id'),
            className: nav.className,
            rect: nav.getBoundingClientRect(),
            hasLatimer: !!nav.querySelector('a.nav-text'),
            innerHTML: nav.innerHTML.substring(0, 100) + '...' // First 100 chars
          });
        });
      }
      
      // Log computed styles to check for pointer-events and z-index
      const navTextStyles = window.getComputedStyle(navTextRef.current);
      const navInfoStyles = window.getComputedStyle(navInfoRef.current);
      console.log('Computed styles:', {
        navTextPointerEvents: navTextStyles.pointerEvents,
        navTextZIndex: navTextStyles.zIndex,
        navInfoPointerEvents: navInfoStyles.pointerEvents,
        navInfoZIndex: navInfoStyles.zIndex
      });
      
      import('gsap').then((gsapModule) => {
        const gsap = gsapModule.default;
        import('gsap/ScrollTrigger').then((ScrollTriggerModule) => {
          const ScrollTrigger = ScrollTriggerModule.default;

          // Track existing ScrollTrigger instances
          console.log('Existing ScrollTrigger instances before setup:', ScrollTrigger.getAll().length);
          
          // CRITICAL FIX: Set up light section triggers if they exist
          const lightSections = gsap.utils.toArray('.light-section') as HTMLElement[];
          console.log('Light sections found:', lightSections.length);
          
          // Use unknown[] instead of any[] to satisfy ESLint while avoiding TypeScript errors
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lightSectionTriggers: unknown[] = [];
          
          if (lightSections.length > 0) {
            lightSections.forEach((section, index) => {
              console.log(`Creating ScrollTrigger for light section ${index}`);
              const trigger = ScrollTrigger.create({
                id: `lightSection-${index}`,
                trigger: section,
                start: 'top 10%',
                end: 'bottom 10%',
                onEnter: () => {
                  console.log(`Light section ${index} entered`);
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
                  console.log(`Light section ${index} left`);
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
                  console.log(`Light section ${index} entered back`);
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
                  console.log(`Light section ${index} left back`);
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
              
              lightSectionTriggers.push(trigger);
            });
            
            console.log(`Created ${lightSectionTriggers.length} light section triggers`);
          } else {
            console.log('No light sections found on this page');
          }

          // CRITICAL FIX: Use a direct window scroll event listener instead of ScrollTrigger
          // This ensures the scroll behavior works across all pages and after navigation
          const navTextHeight = navTextRef.current?.offsetHeight || 0;
          console.log('Nav text height:', navTextHeight);
          
          let lastScrollTop = 0;
          let navTextVisible = true;
          
          // Function to handle scroll events
          const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollDirection = scrollTop > lastScrollTop ? 1 : -1;
            
            // Log scroll information
            console.log('Window scroll event:', {
              scrollTop,
              scrollDirection,
              navTextVisible,
              navTextTransform: navTextRef.current?.style.transform,
              navInfoTransform: navInfoRef.current?.style.transform
            });
            
            if (navTextRef.current && navInfoRef.current && navBgRef.current) {
              if (scrollDirection === 1 && navTextVisible && scrollTop > 10) { // Only hide after scrolling a bit
                // Scrolling down and nav-text is visible
                console.log('Hiding nav text (scrolling down)');
                
                const navInfoRect = navInfoRef.current.getBoundingClientRect();
                const desiredTop = window.innerWidth >= 1024 ? 40 : 30;
                const moveDistance = navInfoRect.top - desiredTop;
                
                console.log('Nav info positioning:', {
                  currentTop: navInfoRect.top,
                  desiredTop,
                  moveDistance
                });

                gsap.to(navTextRef.current, { 
                  yPercent: -100, 
                  duration: 0.3,
                  onComplete: () => {
                    console.log('Nav text hide animation complete');
                    console.log('Current nav text transform:', navTextRef.current?.style.transform);
                  }
                });
                
                gsap.to(navInfoRef.current, { 
                  y: -moveDistance,
                  duration: 0.3,
                  onComplete: () => {
                    console.log('Nav info move animation complete');
                    console.log('Current nav info transform:', navInfoRef.current?.style.transform);
                  }
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
                console.log('Showing nav text (scrolling up)');
                
                gsap.to(navTextRef.current, { 
                  yPercent: 0, 
                  duration: 0.3,
                  onComplete: () => {
                    console.log('Nav text show animation complete');
                    console.log('Current nav text transform:', navTextRef.current?.style.transform);
                  }
                });
                
                gsap.to(navInfoRef.current, { 
                  y: 0, 
                  duration: 0.3,
                  onComplete: () => {
                    console.log('Nav info reset animation complete');
                    console.log('Current nav info transform:', navInfoRef.current?.style.transform);
                  }
                });
                
                gsap.to(navBgRef.current, { height: '100%', y: 0, duration: 0.3 });
                navTextVisible = true;
              }
            }
            
            lastScrollTop = scrollTop;
          };
          
          // Add scroll event listener
          console.log('Adding window scroll event listener');
          window.addEventListener('scroll', handleScroll);

          return () => {
            console.log('Cleaning up ScrollTrigger instances and event listeners');
            
            // Remove scroll event listener
            console.log('Removing window scroll event listener');
            window.removeEventListener('scroll', handleScroll);
            
            // Kill all ScrollTrigger instances
            console.log('Cleaning up ScrollTrigger instances, count before cleanup:', ScrollTrigger.getAll().length);
            ScrollTrigger.getAll().forEach((trigger, index) => {
              console.log(`Killing ScrollTrigger instance ${index}:`, trigger.vars?.id || 'unnamed');
              trigger.kill();
            });
            console.log('ScrollTrigger instances after cleanup:', ScrollTrigger.getAll().length);
            
            // Clear any ongoing GSAP animations for nav elements
            if (navTextRef.current) {
              console.log('Clearing animations for navTextRef');
              gsap.killTweensOf(navTextRef.current);
            }
            
            if (navInfoRef.current) {
              console.log('Clearing animations for navInfoRef');
              gsap.killTweensOf(navInfoRef.current);
            }
            
            if (navBgRef.current) {
              console.log('Clearing animations for navBgRef');
              gsap.killTweensOf(navBgRef.current);
            }
          };
        });
      });
    }
  }, [gsapLoaded]);

  // Log navigation link styles when component renders
  useEffect(() => {
    if (document.querySelector('a[href="/work"]') && document.querySelector('a[href="/about"]')) {
      const workLink = document.querySelector('a[href="/work"]') as HTMLElement;
      const aboutLink = document.querySelector('a[href="/about"]') as HTMLElement;
      
      if (workLink && aboutLink) {
        const workLinkStyles = window.getComputedStyle(workLink);
        const aboutLinkStyles = window.getComputedStyle(aboutLink);
        
        console.log('Navigation link styles:', {
          workLink: {
            cursor: workLinkStyles.cursor,
            pointerEvents: workLinkStyles.pointerEvents,
            position: workLinkStyles.position,
            zIndex: workLinkStyles.zIndex,
            classes: workLink.className
          },
          aboutLink: {
            cursor: aboutLinkStyles.cursor,
            pointerEvents: aboutLinkStyles.pointerEvents,
            position: aboutLinkStyles.position,
            zIndex: aboutLinkStyles.zIndex,
            classes: aboutLink.className
          }
        });
      }
    }
  }, []);

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
          <Link 
            ref={navTextRef} 
            to="/" 
            className="font-accent nav-text hover:cursor-pointer"
            onClick={() => console.log('LATIMER link clicked')}
            onMouseEnter={() => console.log('LATIMER link hover start')}
            onMouseLeave={() => console.log('LATIMER link hover end')}
          >
            LATIMER
          </Link>
          <div ref={navInfoRef} className="nav-info flex justify-between w-full mt-4 lg:mt-0">
            <div className="flex flex-col gap-1">
              <div>DIGITAL COWBOY</div>
              <div>LOS ANGELES, CA {time}</div>
            </div>
            <div className="flex flex-col gap-1 no-bullet-holes">
              {/* Fix for navigation links - adding padding, ensuring pointer-events are enabled, and setting a higher z-index */}
              <Link 
                to="/work" 
                className="block hover:cursor-pointer relative"
                style={{ 
                  cursor: 'pointer',
                  padding: '5px 0',
                  pointerEvents: 'auto',
                  position: 'relative',
                  zIndex: 10010
                }}
                onClick={() => console.log('WORK link clicked')}
                onMouseEnter={() => console.log('WORK link hover start')}
                onMouseLeave={() => console.log('WORK link hover end')}
              >
                WORK
              </Link>
              <Link 
                to="/about" 
                className="block hover:cursor-pointer relative"
                style={{ 
                  cursor: 'pointer',
                  padding: '5px 0',
                  pointerEvents: 'auto',
                  position: 'relative',
                  zIndex: 10010
                }}
                onClick={() => console.log('ABOUT link clicked')}
                onMouseEnter={() => console.log('ABOUT link hover start')}
                onMouseLeave={() => console.log('ABOUT link hover end')}
              >
                ABOUT
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
