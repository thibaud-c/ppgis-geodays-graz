import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

export function ModeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Wait until mounted on client to avoid hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" disabled>
                <div className="h-[1.2rem] w-[1.2rem]" />
            </Button>
        )
    }

    // Determine if we are effectively in dark mode (handling "system")
    const isDark =
        theme === "dark" ||
        (theme === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches)

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title="Toggle theme"
        >
            {isDark ? (
                <Sun className="h-[1.2rem] w-[1.2rem] text-primary transition-all" />
            ) : (
                <Moon className="h-[1.2rem] w-[1.2rem] text-primary transition-all" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
