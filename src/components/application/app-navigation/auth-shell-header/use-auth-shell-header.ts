"use client";

import { useContext } from "react";
import { AuthShellHeaderContext } from "./auth-shell-header-provider";

export const useAuthShellHeader = () => {
    const context = useContext(AuthShellHeaderContext);

    if (!context) {
        throw new Error("useAuthShellHeader must be used within AuthShellHeaderProvider");
    }

    return context;
};
