import { describe, expect, it } from "vitest";
import { buildAppEmbeddingText } from "./index";

describe("agent-aware app embedding text", () => {
  it("includes audience, agent summary, and capability text", () => {
    const text = buildAppEmbeddingText({
      name: "Harbor Yield",
      shortDescription: "Stablecoin yield strategies.",
      longDescription: "Compare curated yield options.",
      agentAudience: "HYBRID",
      agentListingStatus: "PUBLISHED",
      agentSummary: "Agents can compare yield products.",
      agentDocsUrl: "https://example.com/docs/agents",
      category: {
        slug: "lending-yield",
        name: "Lending & Yield",
        sortOrder: 2
      },
      tags: ["yield"],
      agentCapabilities: [
        {
          name: "Compare yield options",
          description: "Returns structured yield comparisons.",
          capabilityType: "comparison",
          docsUrl: "https://example.com/docs/agents#compare"
        }
      ]
    });

    expect(text).toContain("Audience: HYBRID");
    expect(text).toContain("Agent summary: Agents can compare yield products.");
    expect(text).toContain("Compare yield options (comparison)");
  });

  it("omits draft agent capabilities from embedding text", () => {
    const text = buildAppEmbeddingText({
      name: "Draft Agent App",
      shortDescription: "Draft agent metadata.",
      longDescription: "This listing is still being reviewed.",
      agentAudience: "HYBRID",
      agentListingStatus: "DRAFT",
      agentSummary: "Agents should not see this yet.",
      agentDocsUrl: "https://example.com/draft",
      category: {
        slug: "defi",
        name: "DeFi",
        sortOrder: 1
      },
      tags: [],
      agentCapabilities: [
        {
          name: "Hidden capability",
          description: "Draft capability.",
          capabilityType: "data"
        }
      ]
    });

    expect(text).not.toContain("Agents should not see this yet.");
    expect(text).not.toContain("Hidden capability");
  });
});
