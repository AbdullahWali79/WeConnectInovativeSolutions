import { CmsElement } from "@/components/cms/cms-element";
import { getPublicSimulationCategories } from "./actions";
import { PublicHeader } from "@/components/public/public-header";
import { PublicSimulationsClient } from "./client";

export default async function SimulationsPage() {
  const { data: categories } = await getPublicSimulationCategories();

  return (
    <CmsElement cmsId="6ffe14f7-0" as="main">
      <PublicHeader />
      <CmsElement cmsId="6ffe14f7-1" as="div" className="container mx-auto px-4 py-8 min-h-screen pt-24">
        <CmsElement cmsId="6ffe14f7-2" as="div" className="text-center mb-8">
          <CmsElement cmsId="6ffe14f7-3" as="h1" className="text-3xl font-extrabold tracking-tight text-gray-900 mb-3">Interactive Simulations</CmsElement>
          <CmsElement cmsId="6ffe14f7-4" as="p" className="text-base text-gray-600 max-w-2xl mx-auto">
            Practice your programming logic and understand complex concepts through hands-on, interactive simulations.
          </CmsElement>
        </CmsElement>

        <PublicSimulationsClient categories={categories || []} />
      </CmsElement>
    </CmsElement>
  );
}
