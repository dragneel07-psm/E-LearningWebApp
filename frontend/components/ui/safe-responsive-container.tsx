'use client';

import { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer, type ResponsiveContainerProps } from 'recharts';

type SafeResponsiveContainerProps = ResponsiveContainerProps & {
    fallbackHeight?: number;
    fallbackClassName?: string;
};

export function SafeResponsiveContainer({
    children,
    fallbackHeight = 280,
    fallbackClassName = 'w-full',
    ...props
}: SafeResponsiveContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            const width = Math.floor(entry.contentRect.width);
            const height = Math.floor(entry.contentRect.height);
            setSize((prev) => {
                if (prev.width === width && prev.height === height) {
                    return prev;
                }
                return { width, height };
            });
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const canRenderChart = size.width > 0 && size.height > 0;

    return (
        <div ref={containerRef} className={fallbackClassName} style={{ minHeight: fallbackHeight, height: '100%' }}>
            {canRenderChart ? (
                <ResponsiveContainer
                    minWidth={props.minWidth ?? 0}
                    minHeight={props.minHeight ?? 1}
                    {...props}
                >
                    {children}
                </ResponsiveContainer>
            ) : (
                <div style={{ height: fallbackHeight }} aria-hidden="true" />
            )}
        </div>
    );
}
