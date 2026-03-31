import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "cotana-admin"
});

export async function safeSendInngestEvent<T extends Record<string, unknown>>(name: string, data: T) {
  try {
    await inngest.send({
      name,
      data
    });
  } catch {
    return null;
  }

  return true;
}
