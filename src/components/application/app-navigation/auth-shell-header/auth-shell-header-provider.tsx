"use client";

import { type PropsWithChildren, createContext, useCallback, useState } from "react";
import type { AuthShellHeaderContextValue, AuthShellHeaderRegistration, AuthShellHeaderState } from "./types";

const EMPTY_HEADER_ACTIONS = null;

export const AuthShellHeaderContext = createContext<AuthShellHeaderContextValue | null>(null);

interface AuthShellHeaderProviderProps extends PropsWithChildren {
    defaultHeader: Omit<AuthShellHeaderRegistration, "actions">;
}

const resolveHeader = (defaultHeader: Omit<AuthShellHeaderRegistration, "actions">, overrides?: AuthShellHeaderRegistration): AuthShellHeaderState => {
    if (!overrides) {
        return {
            ...defaultHeader,
            actions: EMPTY_HEADER_ACTIONS,
        };
    }

    return {
        title: overrides.title,
        subtitle: overrides.subtitle,
        actions: overrides.actions ?? EMPTY_HEADER_ACTIONS,
    };
};

export const AuthShellHeaderProvider = ({ children, defaultHeader }: AuthShellHeaderProviderProps) => {
    const [headerOverride, setHeaderOverride] = useState<AuthShellHeaderRegistration | undefined>();

    const setHeader = useCallback((next: AuthShellHeaderRegistration) => {
        setHeaderOverride(next);
    }, []);

    const resetHeader = useCallback(() => {
        setHeaderOverride(undefined);
    }, []);

    const header = resolveHeader(defaultHeader, headerOverride);

    const value: AuthShellHeaderContextValue = {
        header,
        setHeader,
        resetHeader,
    };

    return <AuthShellHeaderContext.Provider value={value}>{children}</AuthShellHeaderContext.Provider>;
};
