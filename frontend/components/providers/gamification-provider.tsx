"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { gamificationAPI } from '@/lib/api';
import { XPAnimation } from '@/components/gamification/xp-animation';
import { LevelUpModal } from '@/components/gamification/level-up-modal';

interface GamificationState {
    currentLevel: number;
    currentXP: number;
    nextLevelXP: number;
    totalXP: number;
    streak: number;
    isLoading: boolean;
    refreshStats: () => Promise<void>;
    awardXP: (amount: number, reason?: string) => void;
}

const GamificationContext = createContext<GamificationState | undefined>(undefined);

export function GamificationProvider({ children }: { children: React.ReactNode }) {
    const [stats, setStats] = useState({
        currentLevel: 1,
        currentXP: 0,
        nextLevelXP: 100,
        totalXP: 0,
        streak: 0,
        isLoading: true
    });

    const [xpAnimation, setXpAnimation] = useState<{ amount: number, reason?: string } | null>(null);
    const [levelUpModal, setLevelUpModal] = useState<{ open: boolean, level: number }>({ open: false, level: 1 });

    const refreshStats = async () => {
        try {
            const data = await gamificationAPI.getMyStats();

            setStats(prev => {
                // Check for level up
                if (data.current_level > prev.currentLevel && !prev.isLoading) {
                    setLevelUpModal({ open: true, level: data.current_level });
                }

                return {
                    currentLevel: data.current_level,
                    currentXP: data.current_xp,
                    nextLevelXP: data.next_level_xp,
                    totalXP: data.total_xp,
                    streak: data.current_streak,
                    isLoading: false
                };
            });
        } catch (error) {
            console.error("Failed to fetch gamification stats", error);
            // Fallback
            setStats(prev => ({ ...prev, isLoading: false }));
        }
    };

    const awardXP = (amount: number, reason?: string) => {
        // Optimistic update could go here, but for now just animate
        setXpAnimation({ amount, reason });
        // Refresh stats to get actual new totals (with a slight delay to let backend process)
        setTimeout(refreshStats, 1000);
    };

    useEffect(() => {
        refreshStats();
    }, []);

    return (
        <GamificationContext.Provider value={{ ...stats, refreshStats, awardXP }}>
            {children}
            {xpAnimation && (
                <XPAnimation
                    xp={xpAnimation.amount}
                    reason={xpAnimation.reason}
                    onComplete={() => setXpAnimation(null)}
                />
            )}
            <LevelUpModal
                level={levelUpModal.level}
                isOpen={levelUpModal.open}
                onClose={() => setLevelUpModal(prev => ({ ...prev, open: false }))}
            />
        </GamificationContext.Provider>
    );
}

export function useGamification() {
    const context = useContext(GamificationContext);
    if (context === undefined) {
        throw new Error('useGamification must be used within a GamificationProvider');
    }
    return context;
}
