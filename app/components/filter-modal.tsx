import React, { useEffect, useRef, useState, forwardRef } from 'react';
import CustomButton from './custom-button';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  industries: string[];
  services: string[];
  selectedIndustries: string[];
  selectedServices: string[];
  onIndustryToggle: (industry: string) => void;
  onServiceToggle: (service: string) => void;
  onApply: () => void;
  onClear: () => void;
}

interface DraggableInstance {
  kill: () => void;
}

interface FilterItemProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

const FilterItem = forwardRef<HTMLButtonElement, FilterItemProps>(({ 
  label, 
  isSelected, 
  onClick 
}, ref) => (
  <button 
    ref={ref}
    className={`filter-modal__filter-item w-full text-left uppercase font-supply color-bg ${!isSelected ? 'opacity-70' : ''}`}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
    role="checkbox"
    aria-checked={isSelected}
    tabIndex={0}
  >
    <span className="filter-modal__filter-item-brackets-inner anim-char" style={{ transitionDelay: '0.08s' }}>
      [
      <span className="filter-modal__filter-item-plus" aria-hidden="true">
        {isSelected ? '+' : '\u00A0'}
      </span>
      ]
    </span>
    {' '}{label}
  </button>
));

FilterItem.displayName = 'FilterItem';

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  industries,
  services,
  selectedIndustries,
  selectedServices,
  onIndustryToggle,
  onServiceToggle,
  onApply,
  onClear,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const industryItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const serviceItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const draggableInstanceRef = useRef<DraggableInstance | null>(null);

  useEffect(() => {
    Promise.all([
      import('gsap'),
      import('gsap/Draggable')
    ]).then(([gsapModule, DraggableModule]) => {
      const gsap = gsapModule.default;
      const Draggable = DraggableModule.default;
      gsap.registerPlugin(Draggable);
      setGsapLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!gsapLoaded || !modalContentRef.current) return;

    import('gsap/Draggable').then((DraggableModule) => {
      const Draggable = DraggableModule.default;

      if (window.innerWidth > 768) {
        draggableInstanceRef.current = Draggable.create(modalContentRef.current, {
          type: "x,y",
          bounds: window,
          inertia: true,
          dragResistance: 0.3,
          trigger: ".filter-modal__header",
          cursor: "grab",
        })[0];
      }

      return () => {
        if (draggableInstanceRef.current) {
          draggableInstanceRef.current.kill();
        }
      };
    });
  }, [gsapLoaded, isOpen]);

  useEffect(() => {
    if (!gsapLoaded || !isOpen) return;

    import('gsap').then((gsapModule) => {
      const gsap = gsapModule.default;

      gsap.set([...industryItemsRef.current, ...serviceItemsRef.current], {
        x: -20,
        opacity: 0
      });

      const maxItems = Math.max(
        industryItemsRef.current.length,
        serviceItemsRef.current.length
      );

      for (let i = 0; i < maxItems; i++) {
        const industryItem = industryItemsRef.current[i];
        const serviceItem = serviceItemsRef.current[i];
        const delay = i * 0.05;

        if (industryItem) {
          gsap.to(industryItem, {
            x: 0,
            opacity: 1,
            duration: 0.2,
            delay,
            ease: "power1.out"
          });
        }

        if (serviceItem) {
          gsap.to(serviceItem, {
            x: 0,
            opacity: 1,
            duration: 0.2,
            delay,
            ease: "power1.out"
          });
        }
      }
    });
  }, [gsapLoaded, isOpen]);

  useEffect(() => {
    const handleScroll = (e: TouchEvent) => {
      if (window.innerWidth <= 768 && isOpen) {
        e.preventDefault();
      }
    };

    if (isOpen && window.innerWidth <= 768) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('touchmove', handleScroll, { passive: false });
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('touchmove', handleScroll);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 filter-modal-wrapper flex items-center justify-center bg-black bg-opacity-50 no-bullet-holes"
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-modal-title"
    >
      <div 
        ref={modalContentRef}
        className="rounded-lg w-full h-full md:w-[530px] md:h-[420px] relative text-[#DCCFBE]"
      >
        {/* Header */}
        <div className="filter-modal__header cursor-grab active:cursor-grabbing">
          <button
            onClick={onClose}
            className="filter-modal__close-button"
            aria-label="Close filter modal"
          />
          <span id="filter-modal-title" className="uppercase text-center filter-header-text">Filter</span>
        </div>

        {/* Content */}
        <div className="filter-modal__content bg-[#1A1917] p-8 pb-12">
          <div className="industry-filters">
            <h3 className="uppercase mb-4 font-supply">Industry</h3>
            <div className="space-y-2">
              <FilterItem
                ref={el => industryItemsRef.current[0] = el}
                label="All"
                isSelected={selectedIndustries.length === 0}
                onClick={() => onIndustryToggle('all')}
              />
              {industries.map((industry, index) => (
                <FilterItem
                  key={industry}
                  ref={el => industryItemsRef.current[index + 1] = el}
                  label={industry}
                  isSelected={selectedIndustries.includes(industry)}
                  onClick={() => onIndustryToggle(industry)}
                />
              ))}
            </div>
          </div>

          <div className="service-filters">
            <h3 className="uppercase mb-4 font-supply">Services</h3>
            <div className="space-y-2">
              <FilterItem
                ref={el => serviceItemsRef.current[0] = el}
                label="All"
                isSelected={selectedServices.length === 0}
                onClick={() => onServiceToggle('all')}
              />
              {services.map((service, index) => (
                <FilterItem
                  key={service}
                  ref={el => serviceItemsRef.current[index + 1] = el}
                  label={service}
                  isSelected={selectedServices.includes(service)}
                  onClick={() => onServiceToggle(service)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="filter-modal__footer">
          <button
            onClick={onClear}
            className="uppercase hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-white px-2 py-1 filter-clear"
          >
            Clear
          </button>
          <CustomButton onClick={onApply} fill="off">
            Apply
          </CustomButton>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
