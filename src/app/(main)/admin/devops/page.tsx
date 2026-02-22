"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/auth/SessionProvider";
import { Copy, Check, ShieldAlert, Rocket, Terminal, Github } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const Step = ({
  stepNumber,
  title,
  command,
  isCopied,
  onCopy,
}: {
  stepNumber: number;
  title: string;
  command: string;
  isCopied: boolean;
  onCopy: () => void;
}) => {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-background p-4">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-bold transition-colors",
          isCopied ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-muted-foreground/20"
        )}
      >
        {isCopied ? <Check className="h-6 w-6" /> : stepNumber}
      </div>
      <div className="flex-1 space-y-1">
        <p className="font-medium">{title}</p>
        <div className="flex items-center gap-2 rounded-md bg-muted p-2 font-mono text-sm text-muted-foreground">
          <span className="flex-1 break-all">$ {command}</span>
        </div>
      </div>
      <Button
        variant={isCopied ? "secondary" : "outline"}
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={onCopy}
      >
        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export default function DevOpsPage() {
  const { isAdmin, isLoading } = useSession();
  const { toast } = useToast();
  const [commitMessage, setCommitMessage] = useState("feat: apply new updates");
  const [copiedSteps, setCopiedSteps] = useState<Record<number, boolean>>({});

  const handleCopy = (command: string, step: number) => {
    navigator.clipboard.writeText(command);
    toast({ title: "تم نسخ الأمر!" });
    setCopiedSteps((prev) => ({ ...prev, [step]: true }));
  };
  
  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-1/3" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>غير مصرح بالدخول</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>ليس لديك الصلاحية!</AlertTitle>
            <AlertDescription>
              عفواً، هذه الصفحة متاحة لمديري النظام فقط.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const commands = [
    { title: "تنظيف البيئة وتثبيت الاعتماديات", command: "npm run clean && npm install" },
    { title: "التحقق من حالة الملفات", command: "git status" },
    { title: "إضافة جميع التعديلات", command: "git add -A" },
    { title: "تثبيت التعديلات مع رسالة", command: `git commit -m "${commitMessage}"` },
    { title: "رفع التعديلات إلى المستودع", command: "git push origin main" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          تحديثات المشروع (DevOps)
        </h1>
        <p className="text-muted-foreground mt-1">
          دليل تفاعلي لنشر آخر التحديثات على المنصة بأمان.
        </p>
      </div>

       <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>كيف تعمل هذه الصفحة؟</AlertTitle>
            <AlertDescription>
                هذه الصفحة هي دليل آمن ومساعد لك. عند الضغط على زر النسخ، يتم وضع الأمر في حافظة جهازك لتلصقه بنفسك في الطرفية (Terminal). لأسباب أمنية، لا يمكن لصفحة الويب تنفيذ الأوامر مباشرة.
            </AlertDescription>
        </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github />
            خطوات رفع التعديلات على GitHub
          </CardTitle>
          <CardDescription>
            اتبع هذه الخطوات بالترتيب. انسخ كل أمر وقم بتنفيذه في الطرفية (Terminal) الخاصة بمشروعك.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {commands.map((cmd, index) => {
             if (index === 3) { // Special handling for commit message input
              return (
                <div key={index} className="space-y-3 pl-14">
                  <div className="space-y-2">
                    <Label htmlFor="commit-msg" className="text-sm font-medium">رسالة الـ Commit (اختياري):</Label>
                    <Input
                        id="commit-msg"
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        className="font-mono bg-muted"
                    />
                  </div>
                  <Step
                    stepNumber={index + 1}
                    title={cmd.title}
                    command={cmd.command}
                    isCopied={!!copiedSteps[index + 1]}
                    onCopy={() => handleCopy(cmd.command, index + 1)}
                  />
                </div>
              );
            }
            return (
              <Step
                key={index}
                stepNumber={index + 1}
                title={cmd.title}
                command={cmd.command}
                isCopied={!!copiedSteps[index + 1]}
                onCopy={() => handleCopy(cmd.command, index + 1)}
              />
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
             <Rocket />
             الخطوة الأخيرة: متابعة النشر على Vercel
          </CardTitle>
          <CardDescription>
            بمجرد اكتمال الأمر `git push` بنجاح، سيقوم Vercel بالنشر تلقائياً.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
            >
              الانتقال إلى لوحة تحكم Vercel
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
