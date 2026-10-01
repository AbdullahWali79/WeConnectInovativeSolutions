import { CmsElement, CmsLink } from "@/components/cms/cms-element";
import { getPublicSimulationBySlug } from "../../actions";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/public/public-header";
import { ProtectedSimulationRenderer } from "@/components/public/protected-simulation";

export default async function SimulationExecutionPage({ 
  params 
}: { 
  params: Promise<{ category: string; slug: string }> 
}) {
  const { category, slug } = await params;
  const { data: simulation, success } = await getPublicSimulationBySlug(category, slug);

  if (!success || !simulation) {
    return notFound();
  }

  return (
    <CmsElement cmsId="cae1b96a-0" as="main" className="min-h-screen bg-gray-50 flex flex-col">
      <PublicHeader />
      
      <CmsElement cmsId="cae1b96a-1" as="div" className="flex-1 flex flex-col pt-20">
        <CmsElement cmsId="cae1b96a-2" as="div" className="bg-white border-b border-gray-200 py-3 px-6 shadow-sm flex items-center gap-4">
          <CmsLink cmsId="cae1b96a-3" href="/simulations" className="text-gray-500 hover:text-gray-900 font-medium text-sm flex items-center gap-1">
            <CmsElement cmsId="cae1b96a-4" as="span" className="material-symbols-outlined text-sm">arrow_back</CmsElement>
            Back to Simulations
          </CmsLink>
          <CmsElement cmsId="cae1b96a-5" as="div" className="h-4 w-px bg-gray-300"></CmsElement>
          <CmsElement cmsId="cae1b96a-6" as="span" className="text-sm text-gray-500">{simulation.simulation_categories.name}</CmsElement>
          <CmsElement cmsId="cae1b96a-7" as="span" className="text-gray-400">/</CmsElement>
          <CmsElement cmsId="cae1b96a-8" as="h1" className="font-semibold text-gray-900">{simulation.title}</CmsElement>
        </CmsElement>

        <CmsElement cmsId="cae1b96a-9" as="div" className="flex-1 p-0 m-0 bg-white relative">
          <ProtectedSimulationRenderer 
            html={simulation.html_script} 
            title={simulation.title} 
          />
        </CmsElement>
      </CmsElement>
    </CmsElement>
  );
}
