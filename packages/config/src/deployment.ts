export const cotanaDeploymentTargets = {
  githubRepository: "usercrypto000/cotana",
  vercelTeamId: "team_1zJHST7CZfbOjBYh89rHmYih",
  store: {
    projectName: "cotana",
    projectId: "prj_yaOIBs4AOh8CTsTd2d101waV5EIU",
    productionUrl: "https://cotana.xyz",
    bundlePath: ".vercel-bundles/store"
  },
  admin: {
    projectName: "cotana-admin",
    projectId: "prj_VLTSKcPDS0F1JcFVphm08v4xu5Qc",
    productionUrl: "https://cotana-admin.vercel.app",
    bundlePath: ".vercel-bundles/admin"
  }
} as const;

export function getVercelProjectForApp(app: "store" | "admin") {
  return cotanaDeploymentTargets[app];
}
