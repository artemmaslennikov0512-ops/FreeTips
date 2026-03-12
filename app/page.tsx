import { HeroPremium } from "@/components/landing/HeroPremium";
import { AppPremium } from "@/components/landing/AppPremium";
import { FeaturesPremium } from "@/components/landing/FeaturesPremium";
import { ProcessPremium } from "@/components/landing/ProcessPremium";
import { BusinessPremium } from "@/components/landing/BusinessPremium";
import { CTAPremium } from "@/components/landing/CTAPremium";

export default function HomePage() {
  return (
    <>
      <HeroPremium />
      <AppPremium />
      <FeaturesPremium />
      <ProcessPremium />
      <BusinessPremium />
      <CTAPremium />
    </>
  );
}
