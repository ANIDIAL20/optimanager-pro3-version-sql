import { Loader2 } from "lucide-react";

interface AppLoaderProps {
    size?: number;
    className?: string;
    fullScreen?: boolean;
}

export function AppLoader({ size = 40, className = "", fullScreen = true }: AppLoaderProps) {
    // Ila kan fullScreen = true, kaychedd l-ecran kamel (centré).
    // Ila false, kaykon juste spinner sghir (f west chi div).

    if (fullScreen) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center bg-transparent">
                <Loader2
                    className={`animate-spin text-blue-600 ${className}`}
                    size={size}
                />
            </div>
        );
    }

    return (
        <Loader2
            className={`animate-spin text-blue-600 ${className}`}
            size={size}
        />
    );
}
