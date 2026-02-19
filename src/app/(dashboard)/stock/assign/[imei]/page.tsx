import { notFound, redirect } from "next/navigation";

type LegacyAssignPageParams = {
    imei: string;
};

export default async function LegacyAssignPage({ params }: { params: Promise<LegacyAssignPageParams> }) {
    const { imei: rawImei } = await params;
    const imei = rawImei?.trim();

    if (!imei) {
        notFound();
    }

    redirect(`/stock/assign?imei=${encodeURIComponent(imei)}`);
}
