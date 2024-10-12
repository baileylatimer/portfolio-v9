// app/components/ControlSvg.tsx

interface SvgCaFlagProps {
  width?: number;
  height?: number;
}

export default function SvgCaFlag({ width = 143, height = 44 }: SvgCaFlagProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 143 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g style={{mixBlendMode: 'difference'}}>
        <path d="M1.66034 3.11231C1.72773 3.11512 1.80955 3.12008 1.91089 3.12742L1.66034 3.11231ZM1.66034 3.11231C1.68397 3.29525 1.76266 3.57874 1.86067 3.7891L1.8607 3.78916C2.45441 5.06377 2.09937 6.37089 1.13064 8.27642L1.13062 8.27646C0.929438 8.67213 0.822339 8.90299 0.768152 9.04993C0.760148 9.07164 0.754104 9.08948 0.749562 9.10382C0.758065 9.1245 0.769672 9.15177 0.785293 9.1866C0.839202 9.30679 0.922403 9.47747 1.04314 9.71254C1.28399 10.1815 1.65752 10.8745 2.20477 11.8702L1.66034 3.11231ZM2.59834 15.0834L2.59833 15.0835C2.59352 15.1187 2.59045 15.1441 2.5885 15.1623C2.58916 15.1634 2.58983 15.1644 2.59053 15.1655C2.62087 15.2122 2.66758 15.2766 2.74748 15.3826L2.74761 15.3828C2.92001 15.6116 3.3923 16.1796 3.79512 16.6398C4.22269 17.1283 4.52762 17.4916 4.70401 17.7962C4.80042 17.9626 4.87738 18.1418 4.91205 18.3433C4.93811 18.4947 4.93575 18.6326 4.92126 18.7556C5.06343 18.8862 5.27254 19.0831 5.44036 19.2446L4.92877 19.7764L5.44036 19.2446C5.52104 19.3222 5.60217 19.3888 5.66114 19.4308C5.66197 19.4314 5.66279 19.432 5.66359 19.4325C5.84395 19.4858 5.96975 19.5927 6.0387 19.6649C6.13557 19.7662 6.19874 19.8778 6.23867 19.9578C6.32078 20.1222 6.39013 20.3301 6.45354 20.5516L6.45356 20.5517C7.01772 22.5225 7.41044 23.3557 8.68879 25.2644C9.47228 26.4342 10.2571 27.8334 10.8787 29.1176C11.4898 30.38 11.9802 31.6062 12.1246 32.4086L2.59834 15.0834ZM2.59834 15.0834C2.64507 14.7418 2.63223 14.3738 2.4593 14.032C2.45699 14.022 2.45247 13.9979 2.44905 13.953C2.44116 13.8497 2.44218 13.6867 2.45895 13.4111L2.59834 15.0834ZM12.2672 33.0674C12.2587 33.0404 12.2486 33.0052 12.2371 32.9601C12.2043 32.8307 12.1691 32.6556 12.1246 32.4087L12.2672 33.0674ZM12.2672 33.0674C13.3297 33.301 14.732 33.7351 15.9112 34.1615C16.5088 34.3776 17.0621 34.5964 17.4947 34.7918C17.7101 34.8891 17.9063 34.9855 18.0673 35.0772C18.1455 35.1218 18.249 35.1833 18.3492 35.2611C18.4424 35.2056 18.5446 35.1584 18.6487 35.1262C18.7101 35.1072 18.7945 35.0865 18.8918 35.0807C18.9667 35.0763 19.1667 35.0721 19.3696 35.1977C19.3698 35.1977 19.3699 35.1978 19.37 35.1979L12.2672 33.0674ZM33.5539 33.5851L33.5538 33.5851C33.3379 33.4689 33.1575 33.2797 33.0314 33.131C32.8905 32.9648 32.7517 32.769 32.6265 32.5686C32.3863 32.1843 32.1423 31.6963 32.0497 31.2819L32.0497 31.2818C32.0376 31.2276 32.03 31.1928 32.0257 31.1716C32.0054 31.1472 31.9635 31.1 31.8843 31.0216C31.5996 30.7399 31.0324 30.2425 29.844 29.2004C29.6752 29.0524 29.4939 28.8934 29.2991 28.7224C25.0338 24.9804 16.7493 17.7267 15.4332 16.582C15.4332 16.582 15.4332 16.582 15.4332 16.5819L14.1802 15.4921L13.9266 15.2715V14.9353V8.85873C13.9266 5.86999 13.9257 4.36423 13.9044 3.58176C13.9002 3.42638 13.8952 3.30695 13.8901 3.21524C13.8046 3.21043 13.6946 3.2058 13.5536 3.20179C12.8011 3.18043 11.355 3.17939 8.48424 3.17913C5.29396 3.17888 2.32006 3.15709 1.91102 3.12743L33.5539 33.5851ZM33.5539 33.5851C33.5996 33.6097 33.6837 33.6801 33.7574 33.7853C33.7633 33.7937 33.7688 33.8019 33.7739 33.8099C33.7368 33.8528 33.6882 33.9047 33.6265 33.9648C33.1168 34.4621 32.723 35.1883 32.4649 35.9338C32.2042 36.6866 32.0565 37.5319 32.0956 38.3109M33.5539 33.5851L24.2317 40.7572M2.45874 12.562C2.49386 12.8059 2.47885 13.0839 2.45895 13.411L2.45874 12.562ZM2.45874 12.562C2.41684 12.2711 2.31107 12.0636 2.20479 11.8703L2.45874 12.562ZM24.2317 40.7572C24.2763 40.8862 24.3238 41.0091 24.3687 41.1151C24.5996 41.0957 24.9119 41.0637 25.2846 41.0218C26.0948 40.9306 27.166 40.7951 28.2491 40.6487C29.332 40.5023 30.4218 40.3458 31.2691 40.213C31.6934 40.1465 32.0524 40.0866 32.3176 40.0374C32.4508 40.0127 32.5546 39.9917 32.6288 39.9749C32.6667 39.9663 32.6888 39.9605 32.6989 39.9577C32.8772 39.8763 32.935 39.8157 32.9563 39.7873C32.974 39.7638 33.0096 39.7068 33.0238 39.5353C33.0297 39.4638 33.0324 39.4166 33.0331 39.384C33.0262 39.3755 33.018 39.3654 33.008 39.3535C33.0054 39.3504 32.9964 39.3405 32.9799 39.3261C32.9639 39.312 32.9456 39.298 32.9274 39.2857C32.9166 39.2784 32.9076 39.2729 32.9008 39.269C32.7695 39.2379 32.5387 39.1676 32.3539 38.9697C32.1315 38.7315 32.1025 38.4508 32.0956 38.3109M24.2317 40.7572C23.9381 39.9077 23.5483 39.0536 23.1312 38.3157M24.2317 40.7572L23.1312 38.3157M32.0956 38.3109L32.8326 38.2741M32.0956 38.3109C32.0956 38.3109 32.0956 38.311 32.0956 38.3111L32.8326 38.2741M32.8326 38.2741C32.8415 38.4529 32.8976 38.5131 33.0965 38.5568C33.2354 38.5873 33.4497 38.7322 33.5728 38.8786M32.8326 38.2741L33.5728 38.8786M33.5728 38.8786C33.7679 39.1108 33.7917 39.2029 33.7592 39.5962L33.5728 38.8786ZM23.1312 38.3157C22.7205 37.5891 22.2571 36.9284 21.8011 36.5013L23.1312 38.3157ZM2.46079 14.0376C2.46078 14.0377 2.46059 14.0371 2.46026 14.0359L2.46079 14.0376Z" stroke="white" strokeWidth="1.47584"/>
<circle cx="21.9765" cy="31.7237" r="2.19455" fill="white"/>
<rect x="48.5642" y="1" width="42.2451" height="42.2451" stroke="white" strokeWidth="1.47584"/>
<path d="M65.5445 22.5714C65.5445 24.3371 65.9206 25.7266 66.6729 26.7296C67.4251 27.743 68.4803 28.2445 69.849 28.2445C70.8728 28.2445 71.6773 27.9938 72.2415 27.4818C72.8057 26.9699 73.1713 26.2908 73.3385 25.4341H76.0967C75.8146 26.9908 75.146 28.2236 74.0907 29.1326C73.0251 30.0415 71.6146 30.4908 69.849 30.4908C68.4281 30.4908 67.1744 30.1669 66.0878 29.5087C65.0012 28.8609 64.155 27.9311 63.5595 26.7296C62.9535 25.5281 62.661 24.1386 62.661 22.5714C62.661 21.0251 62.9535 19.646 63.5595 18.455C64.155 17.264 65.0012 16.3341 66.0878 15.6759C67.1744 15.0282 68.4281 14.6938 69.849 14.6938C71.6146 14.6938 73.0251 15.1535 74.0907 16.052C75.146 16.961 75.8146 18.1938 76.0967 19.7401H73.3385C73.1713 18.8938 72.8057 18.2147 72.2415 17.7028C71.6773 17.2013 70.8728 16.9401 69.849 16.9401C68.4803 16.9401 67.4251 17.4416 66.6729 18.4446C65.9206 19.4475 65.5445 20.8266 65.5445 22.5714Z" fill="white"/>
<rect x="99.0388" y="0.999985" width="42.2451" height="42.2451" rx="21.1226" stroke="white" strokeWidth="1.47584"/>
<path d="M123.594 26.4893H116.709L115.257 30.2296H112.478L118.61 14.955H121.797L127.94 30.2296H125.036L123.594 26.4893ZM117.587 24.2848H122.748L120.219 17.6923H120.157L117.587 24.2848Z" fill="white"/>
      </g>
    </svg>
  );
}
