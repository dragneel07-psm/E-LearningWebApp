'use client';
import { ProfileView } from '@/components/profile/profile-view';

export default function StudentProfilePage() {
    return (
        <div className="p-6 w-full min-h-screen bg-[#0a0a0c]">
            {/* Background Effects matching other pages if layout doesn't provide them */}
            {/* Assuming Layout provides main structure, we just provide content */}
            <ProfileView />
        </div>
    );
}
