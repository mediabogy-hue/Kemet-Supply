
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
import { useFirestore, errorEmitter, FirestorePermissionError, useAuth } from "@/firebase";
import { useSession } from "@/auth/SessionProvider";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, writeBatch, collection } from "firebase/firestore";
import { cn } from "@/lib/utils";
import type { UserProfile, Product } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, PlusCircle, Copy, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";


export function AddUserDialog() {
  const firestore = useFirestore();
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

  const [creationSuccessData, setCreationSuccessData] = useState<{ email: string; password: string; phone: string; name: string } | null>(null);

  const resetFormAndSuccess = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole("Dropshipper");
    setCanTrackShift(false);
    setEmailError(null);
    setCreationSuccessData(null);
  }

  const handleOpenChange = (open: boolean) => {
    if (isSubmitting) return;
    setIsOpen(open);
    if (!open) {
        // Use timeout to allow closing animation
        setTimeout(() => {
            resetFormAndSuccess();
        }, 300);
    }
  }

  const handleCreateAnother = () => {
    resetFormAndSuccess();
  }

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `تم نسخ ${fieldName} بنجاح!` });
    }).catch(err => {
      toast({ variant: 'destructive', title: 'فشل النسخ' });
    });
  };

  const handleSendWhatsApp = () => {
    if (!creationSuccessData) return;
    const { email, password, phone, name } = creationSuccessData;
    let formattedPhone = phone.trim();
    
    // Normalize phone number for international format (Egypt country code: 20)
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '2' + formattedPhone;
    } else if (!formattedPhone.startsWith('20')) {
        formattedPhone = '20' + formattedPhone;
    }
    
    const platformUrl = `${window.location.origin}/login`;
    const finalMessage = `مرحباً ${name}،\n\nتم إنشاء حسابك على منصة Kemet Supply بنجاح.\n\nيمكنك تسجيل الدخول باستخدام البيانات التالية:\n*البريد الإلكتروني:* ${email}\n*كلمة المرور:* ${password}\n\n*رابط تسجيل الدخول:*\n${platformUrl}`;

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(finalMessage)}`;
    window.open(whatsappUrl, '_blank');
  };


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

    setIsSubmitting(true);
    let newUserUid: string | null = null;
    try {
      // Step 1: Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      newUserUid = newUser.uid;

      // Step 2: Create user profile in Firestore
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
      
      await setDoc(userDocRef, userProfileData);
      
      setCreationSuccessData({ email, password, phone, name: `${firstName} ${lastName}`});

    } catch (error: any) {
      console.error("Error creating user:", error);
      let description = "حدث خطأ غير متوقع.";

      if (error.code === 'auth/email-already-in-use') {
        description = "هذا البريد الإلكتروني مستخدم بالفعل.";
        setEmailError(description);
      } else if (error.code === 'auth/weak-password') {
        description = "كلمة المرور ضعيفة جداً (6 أحرف على الأقل).";
      } else if (newUserUid) {
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
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle />
          إضافة مستخدم
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {creationSuccessData ? (
            <>
                <DialogHeader>
                    <DialogTitle className="text-2xl text-green-600">🎉 تم إنشاء الحساب بنجاح</DialogTitle>
                    <DialogDescription>
                        الرجاء نسخ بيانات الدخول وإرسالها إلى {creationSuccessData.name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="success-email">البريد الإلكتروني</Label>
                        <div className="flex items-center gap-2">
                            <Input id="success-email" value={creationSuccessData.email} readOnly />
                            <Button variant="outline" size="icon" onClick={() => handleCopy(creationSuccessData.email, 'البريد الإلكتروني')}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="success-password">كلمة المرور</Label>
                        <div className="flex items-center gap-2">
                            <Input id="success-password" value={creationSuccessData.password} readOnly />
                             <Button variant="outline" size="icon" onClick={() => handleCopy(creationSuccessData.password, 'كلمة المرور')}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:justify-between">
                    <Button variant="secondary" onClick={handleCreateAnother}>
                        إنشاء حساب آخر
                    </Button>
                    <div className="flex gap-2">
                        <Button onClick={handleSendWhatsApp}>
                            <Send className="me-2" /> إرسال عبر واتساب
                        </Button>
                         <Button variant="outline" onClick={() => handleOpenChange(false)}>إغلاق</Button>
                    </div>
                </DialogFooter>
            </>
        ) : (
            <>
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
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">الاسم الأخير</Label>
                      <Input
                        id="last-name"
                        placeholder="حسن"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                        disabled={isSubmitting}
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="role">الدور</Label>
                    <Select value={role} onValueChange={(value) => setRole(value as UserProfile['role'])} disabled={isSubmitting}>
                        <SelectTrigger>
                            <SelectValue placeholder="اختر دور المستخدم" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Dropshipper">مسوق</SelectItem>
                            <SelectItem value="Merchant">تاجر</SelectItem>
                            {isAdmin && <SelectItem value="Admin">أدمن</SelectItem>}
                            <SelectItem value="OrdersManager">مدير طلبات</SelectItem>
                            <SelectItem value="FinanceManager">مدير مالي</SelectItem>
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
                            disabled={isSubmitting}
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
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>إلغاء</Button>
                  <Button type="button" onClick={handleSaveUser} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
                  </Button>
                </DialogFooter>
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}
    
