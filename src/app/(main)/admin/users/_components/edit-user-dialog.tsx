

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";


interface EditUserDialogProps {
    user: UserProfile | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function EditUserDialog({ user, isOpen, onOpenChange }: EditUserDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserProfile['role']>("Dropshipper");
  const [level, setLevel] = useState<UserProfile['level']>('Beginner Marketer');
  const [canTrackShift, setCanTrackShift] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
        setFirstName(user.firstName || "");
        setLastName(user.lastName || "");
        setPhone(user.phone || "");
        setRole(user.role || "Dropshipper");
        setLevel(user.level || 'Beginner Marketer');
        setCanTrackShift(user.canTrackShift || false);
    }
  }, [user]);

  const handleUpdateUser = async () => {
    if (!user || !firestore) return;

    if (!firstName || !lastName || !phone) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول.",
      });
      return;
    }
    setIsSubmitting(true);

    const batch = writeBatch(firestore);
    
    const userDocRef = doc(firestore, "users", user.id);
    const updatedData: any = {
      firstName,
      lastName,
      phone,
      role,
      canTrackShift: role === 'Dropshipper' ? canTrackShift : false,
      updatedAt: serverTimestamp(),
    };

    if (role === 'Dropshipper') {
        updatedData.level = level;
    }

    batch.update(userDocRef, updatedData);

    const oldRole = user.role;
    const newRole = role;

    if (oldRole !== newRole) {
        const staffRolesMap: Partial<Record<UserProfile['role'], string>> = {
            'Admin': 'roles_admin',
            'OrdersManager': 'roles_orders_manager',
            'FinanceManager': 'roles_finance_manager',
        };

        const oldRoleCollection = staffRolesMap[oldRole];
        if (oldRoleCollection) {
            const oldRoleDocRef = doc(firestore, oldRoleCollection, user.id);
            batch.delete(oldRoleDocRef);
        }

        const newRoleCollection = staffRolesMap[newRole];
        if (newRoleCollection) {
            const newRoleDocRef = doc(firestore, newRoleCollection, user.id);
            batch.set(newRoleDocRef, { createdAt: serverTimestamp() });
        }
    }

    batch.commit()
        .then(() => {
            onOpenChange(false);
        })
        .catch(async (error: any) => {
            toast({
                variant: "destructive",
                title: "فشل تحديث البيانات",
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
          <DialogDescription>
            تحديث البيانات الأساسية للمستخدم ودوره ومستواه.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-first-name" className="text-right">
              الاسم الأول
            </Label>
            <Input
              id="edit-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="col-span-3"
              disabled={isSubmitting}
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-last-name" className="text-right">
              الاسم الأخير
            </Label>
            <Input
              id="edit-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="col-span-3"
              disabled={isSubmitting}
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-email" className="text-right">
              البريد
            </Label>
            <Input
              id="edit-email"
              type="email"
              value={user?.email || ''}
              className="col-span-3"
              disabled
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-phone" className="text-right">
                رقم الهاتف
            </Label>
            <Input
                id="edit-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="col-span-3"
                disabled={isSubmitting}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
                الدور
            </Label>
            <Select value={role} onValueChange={(value) => setRole(value as UserProfile['role'])} disabled={isSubmitting}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="اختر دور المستخدم" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Dropshipper">مسوق</SelectItem>
                    <SelectItem value="Admin">أدمن</SelectItem>
                    <SelectItem value="OrdersManager">مدير طلبات</SelectItem>
                    <SelectItem value="FinanceManager">مدير مالي</SelectItem>
                </SelectContent>
            </Select>
          </div>
          {role === 'Dropshipper' && (
            <>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-level" className="text-right">
                        المستوى
                    </Label>
                    <Select value={level} onValueChange={(value) => setLevel(value as UserProfile['level'])} disabled={isSubmitting}>
                        <SelectTrigger id="edit-level" className="col-span-3">
                            <SelectValue placeholder="اختر المستوى" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Beginner Marketer">مسوق مبتدئ</SelectItem>
                            <SelectItem value="Professional Marketer">مسوق محترف</SelectItem>
                            <SelectItem value="Gold Partner">شريك ذهبي</SelectItem>
                            <SelectItem value="Platinum Partner">شريك بلاتيني</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="edit-can-track-shift" className="text-right">
                        نظام الورديات
                    </Label>
                    <div className="col-span-3 flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <p className="text-sm text-muted-foreground">
                            السماح بتسجيل ساعات العمل.
                        </p>
                        <Switch
                            id="edit-can-track-shift"
                            checked={canTrackShift}
                            onCheckedChange={setCanTrackShift}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>
            </>
          )}
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>إلغاء</Button>
          <Button type="button" onClick={handleUpdateUser} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
