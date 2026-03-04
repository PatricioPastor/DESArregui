"use client";

import { useId } from "react";

export function SotiLogo({ className }: { className?: string }) {
    const gradient0Id = useId();
    const gradient1Id = useId();
    const gradient2Id = useId();

    return (
        <svg viewBox="0 0 39 29" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="SOTI logo" role="img">
            <path
                d="M32.9295 8.77843C30.8057 3.06518 26.8274 9.40659 26.8274 9.40659L21.4431 16.6155C20.8748 17.3633 20.0074 17.812 19.0502 17.812H19.0202C18.0631 17.812 17.1956 17.3633 16.6273 16.5855L7.98261 4.77018C6.9955 3.42413 7.29462 1.56957 8.64068 0.582461C9.98673 -0.404646 11.8413 -0.105522 12.8284 1.24053L19.0801 9.79545L25.5112 1.21062C26.1693 0.31325 27.276 -0.135435 28.3828 0.0440392C29.4896 0.223513 30.3869 1.00123 30.7459 2.07808L32.9295 8.77843Z"
                fill={`url(#${gradient0Id})`}
            />
            <path
                d="M32.7201 17.7819C32.421 17.8717 32.092 17.9315 31.7928 17.9315C30.5365 17.9315 29.3699 17.1239 28.9512 15.8676L26.8573 9.4065C26.8573 9.4065 30.8057 3.06509 32.9594 8.77834C32.9594 8.77834 32.9594 8.77834 32.9594 8.80826L33.0791 9.1672L34.6644 14.013C35.143 15.5684 34.2756 17.2734 32.7201 17.7819Z"
                fill={`url(#${gradient1Id})`}
            />
            <path
                d="M2.98729 28.7298C2.68816 28.7298 2.35913 28.67 2.06001 28.5802C0.504566 28.0717 -0.362891 26.3667 0.145618 24.8113L4.69229 10.8422C5.2008 9.28679 6.9058 8.41934 8.46124 8.92784C10.0167 9.43635 10.8841 11.1414 10.3756 12.6968L5.82896 26.6658C5.4401 27.9222 4.2436 28.7298 2.98729 28.7298Z"
                fill={`url(#${gradient2Id})`}
            />
            <path
                d="M35.2925 28.7299C34.0362 28.7299 32.8696 27.9222 32.4509 26.6659L31.2544 22.9568C30.7459 21.3715 31.6133 19.6964 33.1688 19.1879C34.7541 18.6793 36.4292 19.5468 36.9377 21.1022L38.1342 24.8114C38.6427 26.3967 37.7753 28.0718 36.2198 28.5803C35.9207 28.6701 35.6216 28.7299 35.2925 28.7299Z"
                fill="#0099DB"
            />
            <defs>
                <linearGradient id={gradient0Id} x1="7.40961" y1="8.91328" x2="32.9317" y2="8.91328" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#5F6586" />
                    <stop offset="1" stopColor="#9096AE" />
                </linearGradient>
                <linearGradient id={gradient1Id} x1="29.3142" y1="7.35616" x2="32.5392" y2="17.2127" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2C2C46" />
                    <stop offset="0.0744938" stopColor="#31324B" />
                    <stop offset="0.6915" stopColor="#5D6071" />
                    <stop offset="1" stopColor="#6F7381" />
                </linearGradient>
                <linearGradient id={gradient2Id} x1="2.40672" y1="27.3382" x2="8.29675" y2="9.71903" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#5F6586" />
                    <stop offset="0.5558" stopColor="#7C829E" />
                    <stop offset="1" stopColor="#9096AE" />
                </linearGradient>
            </defs>
        </svg>
    );
}
