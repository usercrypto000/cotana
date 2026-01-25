"use client";

import { useEffect, useMemo, useState } from "react";

type Project = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  raise?: string | null;
  archived?: boolean | null;
  website?: string | null;
  logoUrl?: string | null;
  chains: string[];
  tags: string[];
};

type Incentive = {
  id: number;
  projectId: number;
  title?: string | null;
  description?: string | null;
  status: string;
  types: string[];
  defillamaSlug?: string | null;
  rewardAssetType: string;
  rewardAssetSymbol?: string | null;
  rewardAssetAddress?: string | null;
  rewardAssetChain?: string | null;
  capitalRequired: string;
  timeIntensity: string;
  riskFlags: string[];
  riskScore?: number | null;
  saturationScore?: number | null;
  flowSummary?: string | null;
  statusRationale?: string | null;
  howToExtract?: string | null;
  xHandleUrl?: string | null;
  participationUrl?: string | null;
  snapshotWindow?: string | null;
  verified?: boolean | null;
  startAt?: string | null;
  endAt?: string | null;
};

type LinkItem = {
  id: number;
  label: string;
  url: string;
  type: string;
  tier?: string | null;
  projectId?: number | null;
  incentiveId?: number | null;
};

// Incentive updates removed; manual-only workflow.

type IncentiveEvent = {
  id: number;
  incentiveId: number;
  title: string;
  detail?: string | null;
  eventType: string;
  effectiveAt: string;
};

type IncentiveProof = {
  id: number;
  incentiveId: number;
  proofType: string;
  label: string;
  url: string;
  chain?: string | null;
};

type IncentiveMetric = {
  id: number;
  incentiveId: number;
  tvlUsd?: string | null;
};

const emptyProjectForm = {
  id: null as number | null,
  name: "",
  slug: "",
  description: "",
  raise: "",
  archived: false,
  website: "",
  logoUrl: "",
  chainsText: "",
  tagsText: "",
};

const emptyIncentiveForm = {
  id: null as number | null,
  projectId: "",
  title: "",
  description: "",
  status: "EARLY",
  typesText: "",
  defillamaSlug: "",
  rewardAssetType: "POINTS",
  rewardAssetSymbol: "",
  rewardAssetAddress: "",
  rewardAssetChain: "",
  capitalRequired: "LOW",
  timeIntensity: "PASSIVE",
  riskFlagsText: "",
  riskScore: "",
  saturationScore: "",
  flowSummary: "",
  statusRationale: "",
  howToExtract: "",
  xHandleUrl: "",
  participationUrl: "",
  snapshotWindow: "",
  verified: false,
  startAt: "",
  endAt: "",
};

const emptyLinkForm = {
  id: null as number | null,
  targetType: "project",
  targetId: "",
  tier: "TIER1",
  type: "DOCS",
  label: "",
  url: "",
};

const emptyEventForm = {
  id: null as number | null,
  incentiveId: "",
  title: "",
  detail: "",
  eventType: "EmissionChange",
  effectiveAt: "",
};

const emptyProofForm = {
  id: null as number | null,
  incentiveId: "",
  proofType: "Contract",
  label: "",
  url: "",
  chain: "",
};

const emptyMetricForm = {
  id: null as number | null,
  incentiveId: "",
  tvlUsd: "",
};

const toCsv = (items: string[]) => items.join(", ");
const fromCsv = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function IncentivesAdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [events, setEvents] = useState<IncentiveEvent[]>([]);
  const [proofs, setProofs] = useState<IncentiveProof[]>([]);
  const [metrics, setMetrics] = useState<IncentiveMetric[]>([]);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [incentiveForm, setIncentiveForm] = useState(emptyIncentiveForm);
  const [linkForm, setLinkForm] = useState(emptyLinkForm);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [proofForm, setProofForm] = useState(emptyProofForm);
  const [metricForm, setMetricForm] = useState(emptyMetricForm);
  const [status, setStatus] = useState("Idle");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [customChain, setCustomChain] = useState("");

  const chainOptions = [
    "Ethereum",
    "Arbitrum",
    "Optimism",
    "Base",
    "Solana",
    "BNB Chain",
    "Polygon",
    "Avalanche",
    "zkSync Era",
    "Starknet",
    "Scroll",
    "Linea",
    "Mantle",
    "Blast",
    "Sei",
    "Sui",
    "Aptos",
    "Near",
    "Tron",
  ];

  const toggleChain = (value: string) => {
    const current = new Set(fromCsv(projectForm.chainsText));
    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }
    setProjectForm({ ...projectForm, chainsText: Array.from(current).join(", ") });
  };

  const addCustomChain = () => {
    const trimmed = customChain.trim();
    if (!trimmed) {
      return;
    }
    const current = new Set(fromCsv(projectForm.chainsText));
    current.add(trimmed);
    setProjectForm({ ...projectForm, chainsText: Array.from(current).join(", ") });
    setCustomChain("");
  };

  const uploadProjectLogo = async (file: File) => {
    setLogoError("");
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Upload failed");
      }
      const data = await res.json();
      if (data?.url) {
        setProjectForm((prev) => ({ ...prev, logoUrl: data.url }));
      }
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  };

  const projectOptions = useMemo(
    () => projects.map((project) => ({ id: project.id, label: project.name })),
    [projects]
  );

  const refreshAll = async () => {
    setStatus("Loading...");
    const [
      projectRes,
      incentiveRes,
      incentiveLinkRes,
      projectLinkRes,
      eventRes,
      proofRes,
      metricRes,
    ] =
      await Promise.all([
        fetch("/api/admin/projects"),
        fetch("/api/admin/incentives"),
        fetch("/api/admin/incentive-links"),
        fetch("/api/admin/project-links"),
        fetch("/api/admin/incentive-events"),
        fetch("/api/admin/incentive-proofs"),
        fetch("/api/admin/incentive-metrics"),
      ]);
    const [
      projectData,
      incentiveData,
      incentiveLinkData,
      projectLinkData,
      eventData,
      proofData,
      metricData,
    ] =
      await Promise.all([
        projectRes.json(),
        incentiveRes.json(),
        incentiveLinkRes.json(),
        projectLinkRes.json(),
        eventRes.json(),
        proofRes.json(),
        metricRes.json(),
      ]);
    setProjects(projectData.items ?? []);
    setIncentives(incentiveData.items ?? []);
    setLinks([...(projectLinkData.items ?? []), ...(incentiveLinkData.items ?? [])]);
    setEvents(eventData.items ?? []);
    setProofs(proofData.items ?? []);
    setMetrics(metricData.items ?? []);
    setStatus("Ready");
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  const handleProjectSubmit = async () => {
    const payload = {
      id: projectForm.id,
      name: projectForm.name,
      slug: projectForm.slug,
      description: projectForm.description,
      raise: projectForm.raise,
      archived: projectForm.archived ?? false,
      website: projectForm.website,
      logoUrl: projectForm.logoUrl,
      chains: fromCsv(projectForm.chainsText),
      tags: fromCsv(projectForm.tagsText),
    };
    const method = projectForm.id ? "PUT" : "POST";
    await fetch("/api/admin/projects", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setProjectForm(emptyProjectForm);
    await refreshAll();
  };

  const handleIncentiveSubmit = async () => {
    const payload = {
      id: incentiveForm.id,
      projectId: Number(incentiveForm.projectId),
      status: incentiveForm.status,
      title: incentiveForm.title,
      description: incentiveForm.description,
      types: fromCsv(incentiveForm.typesText),
      defillamaSlug: incentiveForm.defillamaSlug,
      rewardAssetType: incentiveForm.rewardAssetType,
      rewardAssetSymbol: incentiveForm.rewardAssetSymbol,
      rewardAssetAddress: incentiveForm.rewardAssetAddress,
      rewardAssetChain: incentiveForm.rewardAssetChain,
      capitalRequired: incentiveForm.capitalRequired,
      timeIntensity: incentiveForm.timeIntensity,
      riskFlags: fromCsv(incentiveForm.riskFlagsText),
      riskScore: incentiveForm.riskScore ? Number(incentiveForm.riskScore) : null,
      saturationScore: incentiveForm.saturationScore
        ? Number(incentiveForm.saturationScore)
        : null,
      flowSummary: incentiveForm.flowSummary,
      statusRationale: incentiveForm.statusRationale,
      howToExtract: incentiveForm.howToExtract,
      xHandleUrl: incentiveForm.xHandleUrl,
      participationUrl: incentiveForm.participationUrl,
      snapshotWindow: incentiveForm.snapshotWindow,
      verified: incentiveForm.verified,
      startAt: incentiveForm.startAt || null,
      endAt: incentiveForm.endAt || null,
    };
    const method = incentiveForm.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/incentives", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    const savedId = data?.item?.id ?? incentiveForm.id;
    if (savedId && incentiveForm.defillamaSlug) {
      await fetch("/api/admin/defillama-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incentiveId: savedId }),
      });
    }
    setIncentiveForm(emptyIncentiveForm);
    await refreshAll();
  };

  const handleLinkSubmit = async () => {
    const endpoint =
      linkForm.targetType === "project"
        ? "/api/admin/project-links"
        : "/api/admin/incentive-links";
    const payload = {
      id: linkForm.id,
      targetId: Number(linkForm.targetId),
      tier: linkForm.tier,
      type: linkForm.type,
      label: linkForm.label,
      url: linkForm.url,
    };
    const method = linkForm.id ? "PUT" : "POST";
    await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLinkForm(emptyLinkForm);
    await refreshAll();
  };

  const handleEventSubmit = async () => {
    const payload = {
      id: eventForm.id,
      incentiveId: Number(eventForm.incentiveId),
      title: eventForm.title,
      detail: eventForm.detail,
      eventType: eventForm.eventType,
      effectiveAt: eventForm.effectiveAt,
    };
    const method = eventForm.id ? "PUT" : "POST";
    await fetch("/api/admin/incentive-events", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setEventForm(emptyEventForm);
    await refreshAll();
  };

  const handleProofSubmit = async () => {
    const payload = {
      id: proofForm.id,
      incentiveId: Number(proofForm.incentiveId),
      proofType: proofForm.proofType,
      label: proofForm.label,
      url: proofForm.url,
      chain: proofForm.chain,
    };
    const method = proofForm.id ? "PUT" : "POST";
    await fetch("/api/admin/incentive-proofs", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setProofForm(emptyProofForm);
    await refreshAll();
  };

  const handleMetricSubmit = async () => {
    const payload = {
      id: metricForm.id,
      incentiveId: Number(metricForm.incentiveId),
      tvlUsd: metricForm.tvlUsd,
    };
    const method = metricForm.id ? "PUT" : "POST";
    await fetch("/api/admin/incentive-metrics", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setMetricForm(emptyMetricForm);
    await refreshAll();
  };


  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Cotana Admin
        </div>
        <div className="top-actions">
          <button className="action" onClick={refreshAll}>
            Refresh
          </button>
          <span className="small-note">{status}</span>
        </div>
      </header>

      <div className="shell-body no-sidebar">
        <main className="content">
          <div className="tracker-header incentives-header">
            <h1 className="tracker-title">Incentives Admin</h1>
            <div className="tracker-status">
              Manage projects, incentives, and source links. Manual changes are live.
            </div>
          </div>

          <section className="admin-grid">
            <div className="admin-card">
              <h3>Project editor</h3>
              {projectForm.id ? (
                <div className="small-note">Editing: {projectForm.name}</div>
              ) : (
                <div className="small-note">Create a new project.</div>
              )}
              <div className="admin-form">
                <label className="form-label">Select project to edit</label>
                <select
                  value={projectForm.id ?? ""}
                  onChange={(event) => {
                    const id = Number(event.target.value);
                    const project = projects.find((item) => item.id === id);
                    if (!project) {
                      setProjectForm(emptyProjectForm);
                      return;
                    }
                    setProjectForm({
                      id: project.id,
                      name: project.name,
                      slug: project.slug,
                      description: project.description ?? "",
                      raise: project.raise ?? "",
                      archived: project.archived ?? false,
                      website: project.website ?? "",
                      logoUrl: project.logoUrl ?? "",
                      chainsText: toCsv(project.chains),
                      tagsText: toCsv(project.tags),
                    });
                  }}
                >
                  <option value="">Select project to edit</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <label className="form-label">Project name</label>
                <input
                  placeholder="Name (e.g. Kamino Finance)"
                  value={projectForm.name}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, name: event.target.value })
                  }
                />
                <label className="form-label">Slug</label>
                <input
                  placeholder="Slug (e.g. kamino)"
                  value={projectForm.slug}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, slug: event.target.value })
                  }
                />
                <label className="form-label">Raise</label>
                <input
                  placeholder="Raise (e.g. $10M seed)"
                  value={projectForm.raise}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, raise: event.target.value })
                  }
                />
                <label className="form-label">Website</label>
                <input
                  placeholder="Website (https://...)"
                  value={projectForm.website}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, website: event.target.value })
                  }
                />
                <label className="form-label">Project logo</label>
                <div className="upload-row">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void uploadProjectLogo(file);
                      }
                    }}
                  />
                  <div className="small-note">
                    {logoUploading ? "Uploading..." : "Upload logo image"}
                  </div>
                  {logoError ? <div className="small-note danger-text">{logoError}</div> : null}
                </div>
                {projectForm.logoUrl ? (
                  <img
                    className="project-logo-preview"
                    src={projectForm.logoUrl}
                    alt="Project logo preview"
                  />
                ) : (
                  <div className="small-note">No logo uploaded.</div>
                )}
                <label className="form-label">Chains</label>
                <div className="chain-picker">
                  {chainOptions.map((chain) => {
                    const selected = fromCsv(projectForm.chainsText).includes(chain);
                    return (
                      <button
                        key={chain}
                        type="button"
                        className={`chain-option${selected ? " active" : ""}`}
                        onClick={() => toggleChain(chain)}
                      >
                        {chain}
                      </button>
                    );
                  })}
                </div>
                <div className="chain-custom">
                  <input
                    placeholder="Add custom chain"
                    value={customChain}
                    onChange={(event) => setCustomChain(event.target.value)}
                  />
                  <button type="button" className="btn secondary" onClick={addCustomChain}>
                    Add
                  </button>
                </div>
                <input
                  placeholder="Chains (comma separated, e.g. Solana, Base)"
                  value={projectForm.chainsText}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, chainsText: event.target.value })
                  }
                />
                <label className="form-label">Tags</label>
                <input
                  placeholder="Tags (comma separated, e.g. lending, restaking)"
                  value={projectForm.tagsText}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, tagsText: event.target.value })
                  }
                />
                <label className="form-label">Description</label>
                <textarea
                  placeholder="Project description (1-2 lines)"
                  value={projectForm.description}
                  onChange={(event) =>
                    setProjectForm({ ...projectForm, description: event.target.value })
                  }
                />
                <label className="check">
                  <input
                    type="checkbox"
                    checked={Boolean(projectForm.archived)}
                    onChange={(event) =>
                      setProjectForm({ ...projectForm, archived: event.target.checked })
                    }
                  />
                  Archived
                </label>
                <div className="admin-actions">
                  <button className="btn" onClick={handleProjectSubmit}>
                    {projectForm.id ? "Update project" : "Add project"}
                  </button>
                  {projectForm.id ? (
                    <button
                      className="btn secondary"
                      onClick={() => setProjectForm(emptyProjectForm)}
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="admin-list">
                {projects.map((project) => (
                  <div className="admin-row" key={project.id}>
                    <div>
                      <strong>
                        {project.name}
                        {project.archived ? " (Archived)" : ""}
                      </strong>
                      <div className="small-note">{project.slug}</div>
                    </div>
                    <div className="admin-actions">
                      <button
                        className="btn secondary"
                        onClick={() =>
                          setProjectForm({
                            id: project.id,
                            name: project.name,
                            slug: project.slug,
                            description: project.description ?? "",
                            raise: project.raise ?? "",
                            archived: project.archived ?? false,
                            website: project.website ?? "",
                            logoUrl: project.logoUrl ?? "",
                            chainsText: toCsv(project.chains),
                            tagsText: toCsv(project.tags),
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="btn secondary"
                        onClick={async () => {
                          await fetch("/api/admin/projects", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: project.id }),
                          });
                          await refreshAll();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card">
              <h3>Incentive editor</h3>
              <div className="admin-form">
                <label className="form-label">Project</label>
                <select
                  value={incentiveForm.projectId}
                  onChange={(event) =>
                    setIncentiveForm({ ...incentiveForm, projectId: event.target.value })
                  }
                >
                  <option value="">Select project</option>
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.label}
                    </option>
                  ))}
                </select>
                <label className="form-label">Title</label>
                <input
                  placeholder="Title (card headline)"
                  value={incentiveForm.title}
                  onChange={(event) =>
                    setIncentiveForm({ ...incentiveForm, title: event.target.value })
                  }
                />
                <label className="form-label">Description</label>
                <textarea
                  placeholder="Description (card summary)"
                  value={incentiveForm.description}
                  onChange={(event) =>
                    setIncentiveForm({ ...incentiveForm, description: event.target.value })
                  }
                />
                <label className="form-label">Status</label>
                <select
                  value={incentiveForm.status}
                  onChange={(event) =>
                    setIncentiveForm({ ...incentiveForm, status: event.target.value })
                  }
                >
                  <option value="EARLY">Early</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SATURATED">Saturated</option>
                  <option value="ENDING">Ending</option>
                </select>
                <label className="form-label">Incentive types</label>
                <input
                  placeholder="Incentive types (comma separated)"
                  value={incentiveForm.typesText}
                  onChange={(event) =>
                    setIncentiveForm({ ...incentiveForm, typesText: event.target.value })
                  }
                />
                <label className="form-label">DefiLlama slug</label>
                <input
                  placeholder="DefiLlama slug (protocol or chain)"
                  value={incentiveForm.defillamaSlug}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      defillamaSlug: event.target.value,
                    })
                  }
                />
                <label className="form-label">Reward asset type</label>
                <select
                  value={incentiveForm.rewardAssetType}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      rewardAssetType: event.target.value,
                    })
                  }
                >
                  <option value="TOKEN">Token</option>
                  <option value="POINTS">Points</option>
                  <option value="FEES">Fees</option>
                </select>
                <label className="form-label">Reward symbol</label>
                <input
                  placeholder="Reward symbol (e.g. ARB)"
                  value={incentiveForm.rewardAssetSymbol}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      rewardAssetSymbol: event.target.value,
                    })
                  }
                />
                <label className="form-label">Reward asset address</label>
                <input
                  placeholder="Reward asset address (0x...)"
                  value={incentiveForm.rewardAssetAddress}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      rewardAssetAddress: event.target.value,
                    })
                  }
                />
                <label className="form-label">Reward asset chain</label>
                <input
                  placeholder="Reward asset chain (e.g. Arbitrum)"
                  value={incentiveForm.rewardAssetChain}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      rewardAssetChain: event.target.value,
                    })
                  }
                />
                <label className="form-label">Capital required</label>
                <select
                  value={incentiveForm.capitalRequired}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      capitalRequired: event.target.value,
                    })
                  }
                >
                  <option value="NONE">None</option>
                  <option value="LOW">Low</option>
                  <option value="MED">Med</option>
                  <option value="HIGH">High</option>
                </select>
                <label className="form-label">Time intensity</label>
                <select
                  value={incentiveForm.timeIntensity}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      timeIntensity: event.target.value,
                    })
                  }
                >
                  <option value="PASSIVE">Passive</option>
                  <option value="SEMI">Semi</option>
                  <option value="ACTIVE">Active</option>
                </select>
                <label className="form-label">Risk flags</label>
                <input
                  placeholder="Risk flags (comma separated, e.g. Lockup, KYC)"
                  value={incentiveForm.riskFlagsText}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      riskFlagsText: event.target.value,
                    })
                  }
                />
                <label className="form-label">Risk score</label>
                <input
                  placeholder="Risk score (0-10)"
                  value={incentiveForm.riskScore}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      riskScore: event.target.value,
                    })
                  }
                />
                <label className="form-label">Saturation score</label>
                <input
                  placeholder="Saturation score (0-100)"
                  value={incentiveForm.saturationScore}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      saturationScore: event.target.value,
                    })
                  }
                />
                <label className="check">
                  <input
                    type="checkbox"
                    checked={incentiveForm.verified}
                    onChange={(event) =>
                      setIncentiveForm({
                        ...incentiveForm,
                        verified: event.target.checked,
                      })
                    }
                  />
                  Verified
                </label>
                <label className="form-label">Start date</label>
                <input
                  type="date"
                  placeholder="Start date"
                  value={incentiveForm.startAt}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      startAt: event.target.value,
                    })
                  }
                />
                <label className="form-label">End date</label>
                <input
                  type="date"
                  placeholder="End date"
                  value={incentiveForm.endAt}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      endAt: event.target.value,
                    })
                  }
                />
                <label className="form-label">Flow summary</label>
                <textarea
                  placeholder="Flow summary (card + drawer)"
                  value={incentiveForm.flowSummary}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      flowSummary: event.target.value,
                    })
                  }
                />
                <label className="form-label">Snapshot window</label>
                <input
                  placeholder="Snapshot window (e.g. weekly / Jan 15)"
                  value={incentiveForm.snapshotWindow}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      snapshotWindow: event.target.value,
                    })
                  }
                />
                <label className="form-label">How to participate</label>
                <textarea
                  placeholder="How to participate (plain language)"
                  value={incentiveForm.howToExtract}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      howToExtract: event.target.value,
                    })
                  }
                />
                <label className="form-label">X handle link</label>
                <input
                  placeholder="X handle link (https://x.com/...)"
                  value={incentiveForm.xHandleUrl}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      xHandleUrl: event.target.value,
                    })
                  }
                />
                <label className="form-label">Participation link</label>
                <input
                  placeholder="Participation link (app/bridge/DEX)"
                  value={incentiveForm.participationUrl}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      participationUrl: event.target.value,
                    })
                  }
                />
                <label className="form-label">Status rationale</label>
                <textarea
                  placeholder="Status rationale (why Early/Active/etc)"
                  value={incentiveForm.statusRationale}
                  onChange={(event) =>
                    setIncentiveForm({
                      ...incentiveForm,
                      statusRationale: event.target.value,
                    })
                  }
                />
                <div className="admin-actions">
                  <button className="btn" onClick={handleIncentiveSubmit}>
                    {incentiveForm.id ? "Save edits" : "Add incentive"}
                  </button>
                  {incentiveForm.id ? (
                    <button
                      className="btn secondary"
                      onClick={() => setIncentiveForm(emptyIncentiveForm)}
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="admin-list">
                {incentives.map((incentive) => (
                  <div className="admin-row" key={incentive.id}>
                    <div>
                      <strong>
                        {projects.find((p) => p.id === incentive.projectId)?.name ??
                          "Unknown"} - {incentive.status}
                      </strong>
                      <div className="small-note">{toCsv(incentive.types)}</div>
                    </div>
                    <div className="admin-actions">
                      <button
                        className="btn secondary"
                        onClick={() =>
                          setIncentiveForm({
                            id: incentive.id,
                            projectId: String(incentive.projectId),
                            title: incentive.title ?? "",
                            description: incentive.description ?? "",
                            status: incentive.status,
                            typesText: toCsv(incentive.types),
                            defillamaSlug: incentive.defillamaSlug ?? "",
                            rewardAssetType: incentive.rewardAssetType,
                            rewardAssetSymbol: incentive.rewardAssetSymbol ?? "",
                            rewardAssetAddress: incentive.rewardAssetAddress ?? "",
                            rewardAssetChain: incentive.rewardAssetChain ?? "",
                            capitalRequired: incentive.capitalRequired,
                            timeIntensity: incentive.timeIntensity,
                            riskFlagsText: toCsv(incentive.riskFlags),
                            riskScore: incentive.riskScore?.toString() ?? "",
                            saturationScore: incentive.saturationScore?.toString() ?? "",
                            flowSummary: incentive.flowSummary ?? "",
                            statusRationale: incentive.statusRationale ?? "",
                            howToExtract: incentive.howToExtract ?? "",
                            xHandleUrl: incentive.xHandleUrl ?? "",
                            participationUrl: incentive.participationUrl ?? "",
                            snapshotWindow: incentive.snapshotWindow ?? "",
                            verified: incentive.verified ?? false,
                            startAt: incentive.startAt
                              ? new Date(incentive.startAt).toISOString().slice(0, 10)
                              : "",
                            endAt: incentive.endAt
                              ? new Date(incentive.endAt).toISOString().slice(0, 10)
                              : "",
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="btn secondary"
                        onClick={async () => {
                          await fetch("/api/admin/incentives", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: incentive.id }),
                          });
                          await refreshAll();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="admin-card">
            <h3>Links manager</h3>
            <div className="admin-form admin-form-row">
              <label className="form-label">Target type</label>
              <select
                value={linkForm.targetType}
                onChange={(event) =>
                  setLinkForm({ ...linkForm, targetType: event.target.value })
                }
              >
                <option value="project">Project</option>
                <option value="incentive">Incentive</option>
              </select>
              <label className="form-label">Target</label>
              <select
                value={linkForm.targetId}
                onChange={(event) =>
                  setLinkForm({ ...linkForm, targetId: event.target.value })
                }
              >
                <option value="">Select target</option>
                {linkForm.targetType === "project"
                  ? projectOptions.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.label}
                      </option>
                    ))
                  : incentives.map((incentive) => (
                      <option key={incentive.id} value={incentive.id}>
                        {incentive.id} - {projects.find((p) => p.id === incentive.projectId)?.name ?? "Unknown"}
                      </option>
                    ))}
              </select>
              <label className="form-label">Tier</label>
              <select
                value={linkForm.tier}
                onChange={(event) => setLinkForm({ ...linkForm, tier: event.target.value })}
              >
                <option value="TIER1">Tier 1</option>
                <option value="TIER2">Tier 2</option>
                <option value="TIER3">Tier 3</option>
              </select>
              <label className="form-label">Type</label>
              <select
                value={linkForm.type}
                onChange={(event) => setLinkForm({ ...linkForm, type: event.target.value })}
              >
                <option value="APP">App</option>
                <option value="DOCS">Docs</option>
                <option value="BLOG">Blog</option>
                <option value="DASHBOARD">Dashboard</option>
                <option value="EXPLORER">Explorer</option>
                <option value="GUIDE">Guide</option>
                <option value="BRIDGE">Bridge</option>
                <option value="DEX">DEX</option>
                <option value="REFERRAL">Referral</option>
                <option value="SNAPSHOT">Snapshot</option>
                <option value="FORUM">Forum</option>
                <option value="OTHER">Other</option>
              </select>
              <label className="form-label">Label</label>
              <input
                placeholder="Label"
                value={linkForm.label}
                onChange={(event) => setLinkForm({ ...linkForm, label: event.target.value })}
              />
              <label className="form-label">URL</label>
              <input
                placeholder="URL"
                value={linkForm.url}
                onChange={(event) => setLinkForm({ ...linkForm, url: event.target.value })}
              />
              <button className="btn" onClick={handleLinkSubmit}>
                Add link
              </button>
            </div>
            <div className="admin-list">
              {links.map((link) => (
                <div className="admin-row" key={link.id}>
                  <div>
                    <strong>{link.label}</strong>
                    <div className="small-note">
                      {link.tier ?? "Tier?"} - {link.type} - {link.url}
                    </div>
                  </div>
                  <div className="admin-actions">
                    <button
                      className="btn secondary"
                      onClick={async () => {
                        const endpoint = link.projectId
                          ? "/api/admin/project-links"
                          : "/api/admin/incentive-links";
                        await fetch(endpoint, {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: link.id }),
                        });
                        await refreshAll();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-grid">
            <div className="admin-card">
              <h3>Events</h3>
              <div className="admin-form">
                <label className="form-label">Incentive</label>
                <select
                  value={eventForm.incentiveId}
                  onChange={(event) =>
                    setEventForm({ ...eventForm, incentiveId: event.target.value })
                  }
                >
                  <option value="">Select incentive</option>
                  {incentives.map((incentive) => (
                    <option key={incentive.id} value={incentive.id}>
                      {incentive.id} - {projects.find((p) => p.id === incentive.projectId)?.name ?? "Unknown"}
                    </option>
                  ))}
                </select>
                <label className="form-label">Title</label>
                <input
                  placeholder="Title"
                  value={eventForm.title}
                  onChange={(event) =>
                    setEventForm({ ...eventForm, title: event.target.value })
                  }
                />
                <label className="form-label">Detail</label>
                <input
                  placeholder="Detail"
                  value={eventForm.detail}
                  onChange={(event) =>
                    setEventForm({ ...eventForm, detail: event.target.value })
                  }
                />
                <label className="form-label">Event type</label>
                <input
                  placeholder="Event type"
                  value={eventForm.eventType}
                  onChange={(event) =>
                    setEventForm({ ...eventForm, eventType: event.target.value })
                  }
                />
                <label className="form-label">Effective date</label>
                <input
                  type="date"
                  placeholder="Effective date"
                  value={eventForm.effectiveAt}
                  onChange={(event) =>
                    setEventForm({ ...eventForm, effectiveAt: event.target.value })
                  }
                />
                <button className="btn" onClick={handleEventSubmit}>
                  {eventForm.id ? "Update event" : "Add event"}
                </button>
              </div>
              <div className="admin-list">
                {events.map((event) => (
                  <div className="admin-row" key={event.id}>
                    <div>
                      <strong>{event.title}</strong>
                      <div className="small-note">{event.eventType}</div>
                    </div>
                    <div className="admin-actions">
                      <button
                        className="btn secondary"
                        onClick={() =>
                          setEventForm({
                            id: event.id,
                            incentiveId: String(event.incentiveId),
                            title: event.title,
                            detail: event.detail ?? "",
                            eventType: event.eventType,
                            effectiveAt: new Date(event.effectiveAt)
                              .toISOString()
                              .slice(0, 10),
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="btn secondary"
                        onClick={async () => {
                          await fetch("/api/admin/incentive-events", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: event.id }),
                          });
                          await refreshAll();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card">
              <h3>Proofs</h3>
              <div className="admin-form">
                <label className="form-label">Incentive</label>
                <select
                  value={proofForm.incentiveId}
                  onChange={(event) =>
                    setProofForm({ ...proofForm, incentiveId: event.target.value })
                  }
                >
                  <option value="">Select incentive</option>
                  {incentives.map((incentive) => (
                    <option key={incentive.id} value={incentive.id}>
                      {incentive.id} - {projects.find((p) => p.id === incentive.projectId)?.name ?? "Unknown"}
                    </option>
                  ))}
                </select>
                <label className="form-label">Proof type</label>
                <input
                  placeholder="Proof type"
                  value={proofForm.proofType}
                  onChange={(event) =>
                    setProofForm({ ...proofForm, proofType: event.target.value })
                  }
                />
                <label className="form-label">Label</label>
                <input
                  placeholder="Label"
                  value={proofForm.label}
                  onChange={(event) =>
                    setProofForm({ ...proofForm, label: event.target.value })
                  }
                />
                <label className="form-label">URL</label>
                <input
                  placeholder="URL"
                  value={proofForm.url}
                  onChange={(event) =>
                    setProofForm({ ...proofForm, url: event.target.value })
                  }
                />
                <label className="form-label">Chain</label>
                <input
                  placeholder="Chain"
                  value={proofForm.chain}
                  onChange={(event) =>
                    setProofForm({ ...proofForm, chain: event.target.value })
                  }
                />
                <button className="btn" onClick={handleProofSubmit}>
                  {proofForm.id ? "Update proof" : "Add proof"}
                </button>
              </div>
              <div className="admin-list">
                {proofs.map((proof) => (
                  <div className="admin-row" key={proof.id}>
                    <div>
                      <strong>{proof.label}</strong>
                      <div className="small-note">{proof.proofType}</div>
                    </div>
                    <div className="admin-actions">
                      <button
                        className="btn secondary"
                        onClick={() =>
                          setProofForm({
                            id: proof.id,
                            incentiveId: String(proof.incentiveId),
                            proofType: proof.proofType,
                            label: proof.label,
                            url: proof.url,
                            chain: proof.chain ?? "",
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="btn secondary"
                        onClick={async () => {
                          await fetch("/api/admin/incentive-proofs", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: proof.id }),
                          });
                          await refreshAll();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card">
              <h3>Metrics</h3>
              <div className="admin-form">
                <label className="form-label">Incentive</label>
                <select
                  value={metricForm.incentiveId}
                  onChange={(event) =>
                    setMetricForm({ ...metricForm, incentiveId: event.target.value })
                  }
                >
                  <option value="">Select incentive</option>
                  {incentives.map((incentive) => (
                    <option key={incentive.id} value={incentive.id}>
                      {incentive.id} - {projects.find((p) => p.id === incentive.projectId)?.name ?? "Unknown"}
                    </option>
                  ))}
                </select>
                <label className="form-label">TVL USD</label>
                <input
                  placeholder="TVL USD"
                  value={metricForm.tvlUsd}
                  onChange={(event) =>
                    setMetricForm({ ...metricForm, tvlUsd: event.target.value })
                  }
                />
                <button className="btn" onClick={handleMetricSubmit}>
                  {metricForm.id ? "Update metrics" : "Upsert metrics"}
                </button>
              </div>
              <div className="admin-list">
                {metrics.map((metric) => (
                  <div className="admin-row" key={metric.id}>
                    <div>
                      <strong>
                        Metrics for {projects.find((p) => p.id === incentives.find((i) => i.id === metric.incentiveId)?.projectId)?.name ?? "Unknown"}
                      </strong>
                      <div className="small-note">
                        TVL: {metric.tvlUsd ?? "-"}
                      </div>
                    </div>
                    <div className="admin-actions">
                      <button
                        className="btn secondary"
                        onClick={() =>
                          setMetricForm({
                            id: metric.id,
                            incentiveId: String(metric.incentiveId),
                            tvlUsd: metric.tvlUsd ?? "",
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="btn secondary"
                        onClick={async () => {
                          await fetch("/api/admin/incentive-metrics", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: metric.id }),
                          });
                          await refreshAll();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
