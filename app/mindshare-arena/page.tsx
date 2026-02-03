import { notFound } from "next/navigation";
import MindshareArenaClient from "./MindshareArenaClient";
import { isMindshareEnabled } from "@/services/mindshare";

export default function MindshareArenaPage() {
  if (!isMindshareEnabled()) {
    notFound();
  }

  return <MindshareArenaClient />;
}

