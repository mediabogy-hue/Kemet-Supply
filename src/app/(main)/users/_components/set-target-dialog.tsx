

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";


interface SetTargetDialogProps {
    user: UserProfile | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function SetTargetDialog({ user, isOpen, onOpenChange }: SetTargetDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for Dropshipper
  const [targetSales, setTargetSales] = useState("");
  const [targetReward, setTargetReward] = useState("");

  // State for Staff
  const [monthlyTask, setMonthlyTask] = useState("");
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskReward, setTaskReward] = useState("");

  const isStaff = user?.role !== 'Dropshipper';

  useEffect(() => {
    if (user) {
        if (isStaff) {
            setMonthlyTask(user.staffDetails?.monthlyTask || "");
            setTaskProgress(user.staffDetails?.taskProgress || 0);
            setTaskReward(user.staffDetails?.taskReward?.toString() || "");
        } else {
            setTargetSales(user.monthlySalesTarget?.toString() || "");
            setTargetReward(user.monthlyReward?.toString() || "");
        }
    } else {
        // Reset form when dialog is closed or user is null
        setTargetSales("");
        setTargetReward("");
        setMonthlyTask("");
        setTaskProgress(0);
        setTaskReward("");
    }
  }, [user, isStaff, isOpen]);

  const handleUpdateTarget = async () => {
    if (!user || !firestore) return;
    setIsSubmitting(true);

    let updatedData: any;

    if (isStaff) {
        const rewardNumber = parseFloat(taskReward) || 0;
        if (rewardNumber < 0 || taskProgress < 0 || taskProgress > 100) {
            toast({ variant: "destructive", title: "خطأ", description: "القيم المدخلة غير صحيحة."});
            setIsSubmitting(false);
            return;
        }
        updatedData = {
            staffDetails: {
                monthlyTask,
                taskProgress,
                taskReward: rewardNumber,
            },
            updatedAt: serverTimestamp(),
        };
    } else {
        const salesNumber = parseFloat(targetSales) || 0;
        const rewardNumber = parseFloat(targetReward) || 0;
        if (salesNumber < 0 || rewardNumber < 0) {
            toast({ variant: "destructive", title: "خطأ", description: "قيم التارجت والمكافأة يجب أن تكون أرقامًا موجبة." });
            setIsSubmitting(false);
            return;
        }
        updatedData = {
            monthlySalesTarget: salesNumber,
            monthlyReward: rewardNumber,
            updatedAt: serverTimestamp(),
        };
    }

    const userDocRef = doc(firestore, "users", user.id);

    updateDoc(userDocRef, updatedData)
        .then(() => {
            toast({ title: "تم تحديث الهدف بنجاح!" });
            onOpenChange(false);
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: updatedData,
            }));
            toast({
                variant: "destructive",
                title: "فشل تحديث الهدف",
                description: "قد لا تملك الصلاحيات الكافية.",
            });
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };
  
  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تحديد الهدف لـ {user.firstName} {user.lastName}</DialogTitle>
          <DialogDescription>
            {isStaff ? "حدد المهمة الشهرية، نسبة الإنجاز، والمكافأة المخصصة لهذا الموظف." : "حدد هدف المبيعات الشهري والمكافأة المخصصة لهذا المسوق."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isStaff ? (
            <>
                <div className="space-y-2">
                    <Label htmlFor="staff-task">المهمة الشهرية</Label>
                    <Textarea
                        id="staff-task"
                        placeholder="e.g., الرد على 100 استفسار من العملاء"
                        value={monthlyTask}
                        onChange={(e) => setMonthlyTask(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="task-progress">نسبة الإنجاز ({taskProgress}%)</Label>
                    <Slider
                        id="task-progress"
                        min={0}
                        max={100}
                        step={5}
                        value={[taskProgress]}
                        onValueChange={(value) => setTaskProgress(value[0])}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="task-reward">مكافأة الإنجاز (ج.م)</Label>
                    <Input
                        id="task-reward"
                        type="number"
                        placeholder="e.g., 500"
                        value={taskReward}
                        onChange={(e) => setTaskReward(e.target.value)}
                    />
                </div>
            </>
          ) : (
            <>
                <div className="space-y-2">
                    <Label htmlFor="target-sales">
                    هدف المبيعات (ج.م)
                    </Label>
                    <Input
                    id="target-sales"
                    type="number"
                    placeholder="e.g., 15000"
                    value={targetSales}
                    onChange={(e) => setTargetSales(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="target-reward">
                    المكافأة (ج.م)
                    </Label>
                    <Input
                    id="target-reward"
                    type="number"
                    placeholder="e.g., 750"
                    value={targetReward}
                    onChange={(e) => setTargetReward(e.target.value)}
                    />
                </div>
            </>
          )}
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>إلغاء</Button>
          <Button type="button" onClick={handleUpdateTarget} disabled={isSubmitting}>
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ الهدف'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
