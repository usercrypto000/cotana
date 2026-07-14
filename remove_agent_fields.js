const fs = require('fs');

const path = 'C:/Users/HP/cotana/apps/admin/components/admin-app-form.tsx';
let content = fs.readFileSync(path, 'utf8');

// Normalize line endings for regex matching
content = content.replace(/\r\n/g, '\n');

// Remove agent fields from AppRecord
content = content.replace(/  agentAudience: AppAudienceValue;\n/g, '');
content = content.replace(/  agentListingStatus: AgentListingStatusValue;\n/g, '');
content = content.replace(/  agentSummary: string \| null;\n/g, '');
content = content.replace(/  agentDocsUrl: string \| null;\n/g, '');
content = content.replace(/  agentIntegrationNotes: string \| null;\n/g, '');
content = content.replace(/  agentManifestVersion: number;\n/g, '');
content = content.replace(/  agentLastReviewedAt: Date \| string \| null;\n/g, '');
content = content.replace(/  agentCapabilities: AgentCapabilityFormRecord\[\];\n/g, '');

// Remove agent fields from FormState
content = content.replace(/  agentAudience: AppAudienceValue;\n/g, '');
content = content.replace(/  agentListingStatus: AgentListingStatusValue;\n/g, '');
content = content.replace(/  agentSummary: string;\n/g, '');
content = content.replace(/  agentDocsUrl: string;\n/g, '');
content = content.replace(/  agentIntegrationNotes: string;\n/g, '');
content = content.replace(/  agentCapabilitiesJson: string;\n/g, '');

// Remove initial state fields
content = content.replace(/    agentAudience: app\?\.agentAudience \?\? "HUMAN",\n/g, '');
content = content.replace(/    agentListingStatus: app\?\.agentListingStatus \?\? "NOT_APPLICABLE",\n/g, '');
content = content.replace(/    agentSummary: app\?\.agentSummary \?\? "",\n/g, '');
content = content.replace(/    agentDocsUrl: app\?\.agentDocsUrl \?\? "",\n/g, '');
content = content.replace(/    agentIntegrationNotes: app\?\.agentIntegrationNotes \?\? "",\n/g, '');
content = content.replace(/    agentCapabilitiesJson: JSON\.stringify\(agentCapabilities, null, 2\)\n/g, '');
content = content.replace(/  const agentCapabilities = app\?\.agentCapabilities\?\.length \? app\.agentCapabilities : \[\];\n/g, '');

// Fix comma after screenshots if needed (the line before agentCapabilitiesJson)
content = content.replace(/screenshots: app\?\.screenshots\.map\(\(item\) => item\.imageUrl\)\.join\("\\n"\) \?\? "",\n/g, 'screenshots: app?.screenshots.map((item) => item.imageUrl).join("\\n") ?? ""\n');

// Remove AgentCapabilityFormRecord and defaultAgentCapability
content = content.replace(/type AgentCapabilityFormRecord = \{[\s\S]*?\};\n/g, '');
content = content.replace(/const defaultAgentCapability: AgentCapabilityFormRecord = \{[\s\S]*?\};\n\nfunction/g, 'function');

// Remove setAgentCapabilitiesToExample function
content = content.replace(/  function setAgentCapabilitiesToExample\(\) \{[\s\S]*?\}\n\n/g, '');

fs.writeFileSync(path, content);
console.log("Done");
