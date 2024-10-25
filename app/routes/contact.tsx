import { useEffect } from 'react';
import type { MetaFunction } from "@remix-run/node";
import styles from '~/styles/contact.module.css';
import PageHero from '~/components/page-hero';

export const meta: MetaFunction = () => {
  return [
    { title: "Contact | Latimer Design" },
    { name: "description", content: "Get in touch with Latimer Design" },
  ];
};

export default function Contact() {
  useEffect(() => {
    // Load Typeform embed script
    const script = document.createElement('script');
    script.src = "//embed.typeform.com/next/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="//embed.typeform.com/next/embed.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  return (
    <div className="contact-page">
      <PageHero
        desktopImageSrc="/images/hero-rip.png"
        mobileImageSrc="/images/hero-rip--mobile.png"
        altText="Contact Hero Image"
      />
      <main className={`${styles.contactWrapper} absolute top-0 pt-48 lg:pt-96 lg:mt-36 2xl:mt-48 w-full  bg-contrast-higher`}>
        <div className='relative w-full flex justify-center'>
          <div className={styles.formContainer}>
            <div 
              data-tf-live="01J3ZTMRFJGXFWSZQAZN5SST99"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
