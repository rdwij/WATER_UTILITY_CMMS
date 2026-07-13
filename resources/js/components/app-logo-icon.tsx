import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 820 820"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Water Drop Logo */}
            <path
                fill="#06457E"
                d="M410 40
                C410 40 230 280 230 420
                C230 560 310 650 410 650
                C510 650 590 560 590 420
                C590 280 410 40 410 40Z"
            />

            {/* Growth Arrow */}
            <path
                fill="#ffffff"
                d="M270 520
                L360 420
                L410 470
                L520 320
                L520 390
                L590 260
                L590 390
                L530 390
                L430 530
                L370 470
                L300 550Z"
            />

        </svg>
    );
}