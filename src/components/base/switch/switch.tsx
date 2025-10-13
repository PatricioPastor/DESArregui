"use client";

import { Switch as AriaSwitch } from "react-aria-components";
import { cx } from "@/utils/cx";

interface SwitchProps {
  isSelected?: boolean;
  onChange?: (isSelected: boolean) => void;
  isDisabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Switch({ 
  isSelected, 
  onChange, 
  isDisabled, 
  className,
  children 
}: SwitchProps) {
  return (
    <AriaSwitch
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      className={cx(
        "group inline-flex touch-none items-center",
        className
      )}
    >
      <div className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-gray-700 transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 group-data-[selected]:bg-primary group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-50">
        <span
          className={cx(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
            "translate-x-0 group-data-[selected]:translate-x-5"
          )}
        />
      </div>
      {children && (
        <span className="ml-3 text-sm font-medium text-primary">
          {children}
        </span>
      )}
    </AriaSwitch>
  );
}
