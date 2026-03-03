'use client';

import { useEffect, useState } from 'react';
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
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className={fallbackClassName} style={{ height: fallbackHeight }} aria-hidden="true" />;
    }

    return (
        <ResponsiveContainer
            minWidth={props.minWidth ?? 0}
            minHeight={props.minHeight ?? 1}
            {...props}
        >
            {children}
        </ResponsiveContainer>
    );
}
