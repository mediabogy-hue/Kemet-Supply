
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
        <div className="flex items-center justify-center">
            <svg width="28" height="30" viewBox="0 0 28 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
                <path d="M0 0H8V30H0V0Z" className="fill-primary"/>
                <path d="M8 15L28 0V7.5L15.5 15L28 22.5V30L8 15Z" className="fill-primary"/>
            </svg>
        </div>
        <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-xl font-bold tracking-tight text-foreground">KEMET</span>
            <span className="text-xs font-semibold tracking-widest text-primary">SUPPLY</span>
        </div>
    </div>
  );
}
