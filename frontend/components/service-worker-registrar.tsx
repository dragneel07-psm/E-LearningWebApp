'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function ServiceWorkerRegistrar() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) {
            console.log('[PWA] Service Worker not supported in this browser.');
            return;
        }

        let mounted = true;

        const registerSW = async () => {
            try {
                const reg = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                    updateViaCache: 'none',
                });

                if (!mounted) return;
                setRegistration(reg);
                console.log('[PWA] Service Worker registered:', reg.scope);

                // Check for updates
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            if (mounted) {
                                setUpdateAvailable(true);
                                toast.info('A new version is available! Refresh to update.', {
                                    duration: 10000,
                                    action: {
                                        label: 'Refresh',
                                        onClick: () => {
                                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                                            window.location.reload();
                                        }
                                    }
                                });
                            }
                        }
                    });
                });

                // Periodic update check every 30 minutes
                const updateInterval = setInterval(() => {
                    reg.update().catch(console.warn);
                }, 30 * 60 * 1000);

                return () => clearInterval(updateInterval);
            } catch (error) {
                console.warn('[PWA] Service Worker registration failed:', error);
            }
        };

        registerSW();

        // Listen for service worker controller changes (after skipWaiting)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (mounted) window.location.reload();
        });

        return () => { mounted = false; };
    }, []);

    return null; // Invisible component
}
