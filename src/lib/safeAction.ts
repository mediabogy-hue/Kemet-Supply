export async function safeAction<T>(fn: () => Promise<T>) {
    try {
        const data = await fn();
        return { ok: true as const, data };
    } catch (e: any) {
        console.error("SafeAction caught an error:", e);
        
        let errorMessage = "An unexpected error occurred. Please try again.";
        if (typeof e.message === 'string') {
            if(e.message.includes('permission-denied') || e.message.includes('permissions')) {
                errorMessage = "You do not have permission to perform this action.";
            } else if (e.message.includes('network-request-failed')) {
                errorMessage = "Network error. Please check your connection and try again."
            }
            else {
                 errorMessage = e.message;
            }
        }
        
        return { ok: false as const, error: errorMessage };
    }
}
