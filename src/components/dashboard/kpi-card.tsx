import { Icon } from "next/dist/lib/metadata/types/metadata-types";
import { FeaturedIcon } from "../foundations/featured-icon/featured-icons";


interface KpiCardProps {
  label: string;
  value: string | number;
  icon: any;
  details?: string;
}

export function KpiCard({ label, value, icon, details = "Detalles" }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-surface bg-surface-1 p-4">
      <div className="flex gap-2 items-start justify-start">
        <FeaturedIcon
          size="md"
          color="brand"
          className="text-gray-500"
          theme="modern-neue"
          icon={icon}
        />
        <h3 className="font-medium">{label}</h3>
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-xs text-muted-foreground">{details}</p>
    </div>
  );
}