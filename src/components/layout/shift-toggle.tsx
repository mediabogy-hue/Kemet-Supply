
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/auth/SessionProvider';
import { doc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { Play, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ShiftToggle() {
    const { user, profile, refreshSession } = useSession();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isShiftOn = profile?.shiftStatus === 'on';

    const handleToggleShift = async () => {
        if (!firestore || !user || !profile) return;
        setIsSubmitting(true);
        const batch = writeBatch(firestore);
        const userProfileRef = doc(firestore, 'users', user.uid);

        if (isShiftOn) {
            // Ending the shift
            if (profile?.activeShiftId) {
                const sessionRef = doc(firestore, `users/${user.uid}/workSessions`, profile.activeShiftId);
                const startTime = profile.activeShiftStartTime?.toDate();
                if (startTime) {
                    const durationMinutes = (new Date().getTime() - startTime.getTime()) / 60000;
                    batch.update(sessionRef, { endTime: serverTimestamp(), durationMinutes: Math.round(durationMinutes) });
                } else {
                     batch.update(sessionRef, { endTime: serverTimestamp() });
                }
            }
            batch.update(userProfileRef, { shiftStatus: 'off', activeShiftId: null, activeShiftStartTime: null });
            toast({ title: 'تم إنهاء الوردية بنجاح' });
        } else {
            // Starting the shift
            const newSessionRef = doc(collection(firestore, `users/${user.uid}/workSessions`));
            const now = serverTimestamp();
            batch.set(newSessionRef, {
                id: newSessionRef.id,
                userId: user.uid,
                startTime: now
            });
            batch.update(userProfileRef, { shiftStatus: 'on', activeShiftId: newSessionRef.id, activeShiftStartTime: now });
            toast({ title: 'تم بدء الوردية. بالتوفيق!' });
        }

        try {
            await batch.commit();
            // Refresh the session to get the latest profile state
            refreshSession();
        } catch (error) {
            console.error("Failed to toggle shift:", error);
            toast({ variant: 'destructive', title: 'فشل تغيير حالة الوردية' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Button
            variant={isShiftOn ? 'destructive' : 'outline'}
            size="sm"
            onClick={handleToggleShift}
            disabled={isSubmitting || !profile}
            className="h-9"
        >
            {isShiftOn ? <Square className="me-2 h-4 w-4" /> : <Play className="me-2 h-4 w-4" />}
            {isShiftOn ? 'إنهاء الوردية' : 'بدء الوردية'}
        </Button>
    );
}
