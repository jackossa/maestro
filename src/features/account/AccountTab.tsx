import { PageHeader } from "../../shared/components/PageHeader";
import { SectionHeader } from "../../shared/components/SectionHeader";
import { GoogleIcon } from "../auth/GoogleIcon";
import { useAccount } from "./useAccount";

export function AccountTab() {
  const { displayName, email, photoURL } = useAccount();

  return (
    <div>
      <PageHeader eyebrow="Ossa Studio" title="Account" subtitle="Your Maestro sign-in identity." />

      <div className="flex items-center gap-4 mb-[30px]">
        {photoURL ? (
          <img src={photoURL} alt="" className="w-14 h-14 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-grad-accent text-white flex items-center justify-center font-bold text-[20px]">
            {displayName.charAt(0).toUpperCase() || "?"}
          </div>
        )}
        <div>
          <div className="font-bold text-[16px] text-os-ink">{displayName}</div>
          <div className="text-[13px] text-os-600">{email}</div>
        </div>
      </div>

      <SectionHeader>Connected Account</SectionHeader>
      <div className="mt-3 flex items-center justify-between rounded-brand-sm border border-os-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <GoogleIcon />
          <div>
            <div className="font-bold text-[13px] text-os-ink">Google</div>
            <div className="text-[12px] text-os-600">Connected as {email}</div>
          </div>
        </div>
        <span className="flex-none font-bold text-[11px] tracking-[.05em] uppercase text-os-orange-700 bg-os-orange-050 px-[10px] py-[5px] rounded-full">
          Status: Connected
        </span>
      </div>
      <p className="mt-2 text-[12px] text-os-500">
        Google is your only sign-in method for Maestro, so it can't be disconnected here.
      </p>
    </div>
  );
}
