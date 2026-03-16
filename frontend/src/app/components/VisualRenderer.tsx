"use client";

import ConceptCard from "./visuals/ConceptCard";
import SteppedProcess from "./visuals/SteppedProcess";
import DataPoint from "./visuals/DataPoint";
import CodeSnippet from "./visuals/CodeSnippet";
import FullSystemMap from "./visuals/FullSystemMap";
import EducationalCard, { type StructuredVis } from "./EducationalCard";

export type VisType =
  | "concept_card"
  | "stepped_process"
  | "data_point"
  | "code_snippet"
  | "full_system_map"
  | "legacy";

export interface VisualEntry {
  id: string;
  label: string;
  vis_type: VisType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

interface VisualRendererProps {
  entry: VisualEntry;
}

/**
 * VisualRenderer dynamically selects and renders the correct
 * visual component based on the vis_type from the backend.
 */
export default function VisualRenderer({ entry }: VisualRendererProps) {
  switch (entry.vis_type) {
    case "concept_card":
      return <ConceptCard data={entry.data} />;

    case "stepped_process":
      return <SteppedProcess data={entry.data} />;

    case "data_point":
      return <DataPoint data={entry.data} />;

    case "code_snippet":
      return <CodeSnippet data={entry.data} />;

    case "full_system_map":
      return <FullSystemMap data={entry.data} />;

    case "legacy":
      // Backward compat: render the old EducationalCard for legacy structured data
      return <EducationalCard data={entry.data as StructuredVis} cardId={entry.id} />;

    default:
      return (
        <div className="w-full h-full flex items-center justify-center">
          <p className="maestro-breadcrumb">UNKNOWN VISUAL TYPE</p>
        </div>
      );
  }
}
