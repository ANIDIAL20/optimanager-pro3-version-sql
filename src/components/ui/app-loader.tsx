import { BrandLoader } from "@/components/ui/loader-brand";

interface AppLoaderProps {
    size?: number; // Kept for backward compatibility, but mapped to BrandLoader sizes
    className?: string;
    fullScreen?: boolean;
}

export function AppLoader({ size = 40, className = "", fullScreen = true }: AppLoaderProps) {
    // Map numerical size to BrandLoader size
    const getBrandSize = (s: number) => {
        if (s < 24) return "xs";
        if (s < 32) return "sm";
        if (s < 50) return "md";
        return "lg";
    };

    const brandSize = getBrandSize(size);

    if (fullScreen) {
        return (
            <div className={`flex h-[80vh] w-full items-center justify-center bg-transparent ${className}`}>
                <BrandLoader size={brandSize} />
            </div>
        );
    }

    return (
        <BrandLoader size={brandSize} className={className} />
    );
}
