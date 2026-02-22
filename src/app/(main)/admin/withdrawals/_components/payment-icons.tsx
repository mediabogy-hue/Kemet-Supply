
"use client";

import { Banknote, CreditCard } from "lucide-react";
import type { WithdrawalRequest } from "@/lib/types";

const VodafoneCashLogo = () => (
    <div className="relative h-5 w-5">
        <div className="absolute inset-0 rounded-full bg-[#E60000]"></div>
        <div className="absolute inset-[2px] rounded-full bg-white"></div>
        <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full fill-[#E60000]">
            <path d="M11.5,16.5 C9.02,16.5 7,14.48 7,12 C7,9.52 9.02,7.5 11.5,7.5 C12.4,7.5 13.22,7.8 13.9,8.3 L12.4,9.8 C12.14,9.6 11.84,9.5 11.5,9.5 C10.12,9.5 9,10.62 9,12 C9,13.38 10.12,14.5 11.5,14.5 C12.98,14.5 14.12,13.36 14.12,11.9 H11.5 V10.4 H15.5 V12 C15.5,14.48 13.48,16.5 11.5,16.5Z"/>
        </svg>
    </div>
);

const TeldaLogo = () => (
    <span className="text-lg font-bold leading-none" style={{fontFamily: "'Trebuchet MS', sans-serif", color: '#0d0d0d'}}>telda</span>
);

const InstaPayLogo = () => (
    <div className="relative h-5 w-auto px-2 rounded-sm bg-[#00A99D] flex items-center">
        <span className="text-white text-xs font-bold leading-none">instapay</span>
    </div>
);

export function PaymentMethodIcon({ method }: { method: WithdrawalRequest['method'] }) {
    switch(method) {
        case 'Vodafone Cash':
            return <VodafoneCashLogo />;
        case 'InstaPay':
            return <InstaPayLogo />;
        case 'Telda':
            return <TeldaLogo />;
        case 'Bank Transfer':
            return <Banknote className="h-5 w-5" />;
        default:
            return <CreditCard className="h-5 w-5" />;
    }
}
