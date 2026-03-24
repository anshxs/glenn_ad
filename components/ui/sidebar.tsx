"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { SidebarIcon } from "lucide-react";

// ─── Context ────────────────────────────────────────────────────────────────

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  isMobile: boolean;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function SidebarProvider({ children, defaultOpen = true }: { children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <SidebarContext.Provider value={{ open, setOpen, isMobile }}>
      <div className="flex min-h-screen w-full">{children}</div>
    </SidebarContext.Provider>
  );
}

// ─── Root Sidebar ────────────────────────────────────────────────────────────

export function Sidebar({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, isMobile } = useSidebar();

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
        open ? "w-64" : "w-0 overflow-hidden",
        isMobile && "fixed z-50 shadow-2xl",
        className
      )}
    >
      {children}
    </aside>
  );
}

// ─── Sub-parts ───────────────────────────────────────────────────────────────

export function SidebarHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex items-center px-4 py-4 border-b border-sidebar-border shrink-0", className)}>
      {children}
    </div>
  );
}

export function SidebarFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("mt-auto px-4 py-4 border-t border-sidebar-border", className)}>
      {children}
    </div>
  );
}

export function SidebarContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col flex-1 overflow-y-auto py-2", className)}>{children}</div>;
}

export function SidebarGroup({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-2 py-1", className)}>{children}</div>;
}

export function SidebarGroupLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <p className={cn("px-2 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground", className)}>
      {children}
    </p>
  );
}

export function SidebarGroupContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("space-y-0.5", className)}>{children}</div>;
}

export function SidebarMenu({ className, children }: { className?: string; children: React.ReactNode }) {
  return <ul className={cn("space-y-0.5", className)}>{children}</ul>;
}

export function SidebarMenuItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return <li className={cn("", className)}>{children}</li>;
}

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string;
}

export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, asChild = false, isActive = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";

// ─── Trigger (toggle button) ──────────────────────────────────────────────────

export function SidebarTrigger({ className }: { className?: string }) {
  const { open, setOpen } = useSidebar();
  return (
    <button
      onClick={() => setOpen(!open)}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        className
      )}
      aria-label="Toggle sidebar"
    >
      {/* Simple hamburger/close icon */}
      {/* <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        {open ? (
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        )}
      </svg> */}
      <SidebarIcon className="size-4" />
    </button>
  );
}

// ─── Inset helper ─────────────────────────────────────────────────────────────

export function SidebarInset({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-1 flex-col min-w-0", className)}>{children}</div>;
}
