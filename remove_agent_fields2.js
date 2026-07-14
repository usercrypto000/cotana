const fs = require('fs');

const path = 'C:/Users/HP/cotana/apps/admin/components/admin-app-form.tsx';
let content = fs.readFileSync(path, 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// 1. Remove agent-config imports
content = content.replace(/import \{\n  agentAuthTypeValues,[\s\S]*?\} from "\.\.\/lib\/agent-config";\n/g, '');

// 2. Remove parseAgentCapabilities
content = content.replace(/function parseAgentCapabilities[\s\S]*?\} catch \{[\s\S]*?\}\n\}\n\n/g, '');

// 3. Remove parseAgentCapabilities call inside submit
content = content.replace(/    try \{\n      return parseAgentCapabilities\(form\.agentCapabilitiesJson\);\n    \} catch \(err\) \{\n      const message = err instanceof Error \? err\.message : "Invalid JSON";\n      throw new Error\(`Invalid capability JSON: \$\{message\}`\);\n    \}\n  \}\(\);\n/g, '');

// 4. Remove agentCapabilities local variable in submit
content = content.replace(/      const agentCapabilities = parseAgentCapabilities\(form\.agentCapabilitiesJson\);\n/g, '');

// 5. Remove agent fields in JSON.stringify payload
content = content.replace(/        agentAudience: form\.agentAudience,\n        agentListingStatus: form\.agentListingStatus,\n        agentSummary: form\.agentSummary,\n        agentDocsUrl: form\.agentDocsUrl \|\| null,\n        agentIntegrationNotes: form\.agentIntegrationNotes,\n/g, '');
content = content.replace(/        agentCapabilities,\n/g, '');

// 6. Remove Manifest v{app.agentManifestVersion} badge
content = content.replace(/          \{app \? <Badge variant="agent">Manifest v\{app\.agentManifestVersion\}<\/Badge> : null\}\n/g, '');
content = content.replace(/          \{app\?\.agentLastReviewedAt \? \(\n            <Badge variant="secondary">Reviewed \{new Date\(app\.agentLastReviewedAt\)\.toLocaleDateString\(\)\}<\/Badge>\n          \) : null\}\n/g, '');

// 7. Remove UI sections. Using a brute force regex to match the large chunks.
content = content.replace(/        <div className="grid gap-4 md:grid-cols-2">\n          <label className="space-y-2 text-sm text-brand-text\/72">\n            <span>Agent registry audience<\/span>[\s\S]*?<\/label>\n        <\/div>\n/g, '');
content = content.replace(/        <label className="space-y-2 text-sm text-brand-text\/72">\n          <span>Agent integration notes<\/span>[\s\S]*?<\/label>\n/g, '');
content = content.replace(/        <label className="space-y-2 text-sm text-brand-text\/72">\n          <span>Agent capabilities JSON<\/span>[\s\S]*?<\/label>\n/g, '');
content = content.replace(/        <div className="flex flex-wrap gap-2">\n          <Badge variant="agent">\{capabilityPreview\.length\} capabilities<\/Badge>[\s\S]*?<\/div>\n/g, '');
content = content.replace(/        <Button type="button" variant="outline" onClick=\{setAgentCapabilitiesToExample\}>\n          Reset agent example\n        <\/Button>\n/g, '');

fs.writeFileSync(path, content);
console.log("Done part 2");
