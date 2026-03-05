import type { ReactNode } from "react";

export type AuthShellHeaderRegistration = {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
};

export type AuthShellHeaderState = {
    title: string;
    subtitle?: string;
    actions: ReactNode | null;
};

export type AuthShellHeaderContextValue = {
    header: AuthShellHeaderState;
    setHeader: (next: AuthShellHeaderRegistration) => void;
    resetHeader: () => void;
};
