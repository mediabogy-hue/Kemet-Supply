
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, errorEmitter, FirestorePermissionError, useAuth } from "@/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PlusCircle } from "lucide-react";
import { useSession } from "@/auth/SessionProvider";
import { Switch } from "@/components/ui/switch";


export function AddUserDialog() {
  const { firestore } = useFirebase();
  const auth = useAuth();
  const { toast } = useToast();
  const { isAdmin } = useSession();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserProfile['role']>("Dropshipper");
  const [canTrackShift, setCanTrackShift] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole("Dropshipper");
    setCanTrackShift(false);
    setIsOpen(false);
    setEmailError(null);
  }

  const handleSaveUser = async () => {
    setEmailError(null);
    if (!firstName || !lastName || !email || !password || !phone) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول.",
      });
      return;
    }

    if (!auth || !firestore) {
        toast({ variant: "destructive", title: "خطأ", description: "خدمات Firebase غير متاحة." });
        return;
    }

    setIsSubmitting(true);
    let newUserUid: string | null = null;
    try {
      // Step 1: Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      newUserUid = newUser.uid;

      // Step 2: Create user profile and role documents in a batch
      const batch = writeBatch(firestore);
      
      const userDocRef = doc(firestore, "users", newUser.uid);
      const userProfileData: Partial<UserProfile> = {
        id: newUser.uid,
        email: newUser.email,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        role: role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        initialPasswordChangeRequired: true,
        shiftStatus: 'off',
        canTrackShift: role === 'Dropshipper' ? canTrackShift : false,
      };
      batch.set(userDocRef, userProfileData);

      if (role !== 'Dropshipper') {
        const staffRolesMap: Partial<Record<UserProfile['role'], string>> = {
            'Admin': 'roles_admin',
            'OrdersManager': 'roles_orders_manager',
            'FinanceManager': 'roles_finance_manager',
            'ProductManager': 'roles_product_manager',
        };
        const roleCollection = staffRolesMap[role];
        if (roleCollection) {
            const roleDocRef = doc(firestore, roleCollection, newUser.uid);
            batch.set(roleDocRef, { createdAt: serverTimestamp() });
        }
      }


      await batch.commit();

      toast({
        title: "تم إنشاء حساب المستخدم بنجاح!",
        description: `تم إنشاء حساب لـ ${email} بدور ${role}.`,
      });
      
      resetForm();

    } catch (error: any) {
      console.error("Error creating user:", error);
      let description = "حدث خطأ غير متوقع.";

      if (error.code === 'auth/email-already-in-use') {
        description = "هذا البريد الإلكتروني مستخدم بالفعل.";
        setEmailError(description);
      } else if (error.code === 'auth/weak-password') {
        description = "كلمة المرور ضعيفة جداً (6 أحرف على الأقل).";
      } else if (newUserUid) {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `users/${newUserUid} or roles document`,
            operation: 'create',
            requestResourceData: {email, firstName, lastName, role},
          }));
           description = "فشل إنشاء ملف المستخدم في قاعدة البيانات. قد تكون هناك مشكلة في الصلاحيات. تم إنشاء حساب الدخول ولكن البيانات غير مكتملة."
      }
      toast({
        variant: "destructive",
        title: "فشل إنشاء الحساب",
        description: description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(!open) resetForm();
        setIsOpen(open)
    }}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle />
          إضافة مستخدم
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة مستخدم جديد</DialogTitle>
          <DialogDescription>
            أدخل بيانات المستخدم الجديد. سيتم إنشاء حساب له بكلمة المرور
            المدخلة.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">الاسم الأول</Label>
              <Input
                id="first-name"
                placeholder="علي"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">الاسم الأخير</Label>
              <Input
                id="last-name"
                placeholder="حسن"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">البريد</Label>
             <Input
              id="email"
              type="email"
              placeholder="user@kemetsupply.com"
              value={email}
              onChange={(e) => {
                  setEmail(e.target.value)
                  setEmailError(null)
              }}
              className={cn(emailError && "border-destructive")}
              />
              {emailError && <p className="mt-1 text-sm text-destructive">{emailError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input
                id="phone"
                type="tel"
                placeholder="01xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="role">الدور</Label>
            <Select value={role} onValueChange={(value) => setRole(value as UserProfile['role'])}>
                <SelectTrigger>
                    <SelectValue placeholder="اختر دور المستخدم" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Dropshipper">مسوق</SelectItem>
                    {isAdmin && <SelectItem value="Admin">أدمن</SelectItem>}
                    <SelectItem value="OrdersManager">مدير طلبات</SelectItem>
                    <SelectItem value="FinanceManager">مدير مالي</SelectItem>
                    <SelectItem value="ProductManager">مدير منتجات</SelectItem>
                </SelectContent>
            </Select>
          </div>
          {role === 'Dropshipper' && (
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                    <Label htmlFor="can-track-shift">تفعيل نظام الورديات</Label>
                    <p className="text-xs text-muted-foreground">
                        السماح لهذا المسوق بتسجيل ساعات العمل.
                    </p>
                </div>
                <Switch
                    id="can-track-shift"
                    checked={canTrackShift}
                    onCheckedChange={setCanTrackShift}
                />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">إلغاء</Button>
          </DialogClose>
          <Button type="button" onClick={handleSaveUser} disabled={isSubmitting}>
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
