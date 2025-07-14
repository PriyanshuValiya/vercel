import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables in port manager !!");
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

let basePort = 8000;
const usedPorts = new Set<number>();
let portsLoaded = false;

export async function loadPorts(): Promise<void> {
  if (portsLoaded) {
    return;
  }

  const { data, error } = await supabase
    .from("projects")
    .select("port")
    .eq("framework", "Node")
    .not("port", "is", null);

  if (error) {
    console.error("Failed to load ports from DB:", error.message);
    return;
  }

  data?.forEach((row) => {
    if (row.port) usedPorts.add(row.port);
  });

  portsLoaded = true;
  console.log(`Loaded ${usedPorts.size} used ports from DB.`);
}

export async function getAvailablePort(): Promise<number> {
  await loadPorts();

  while (usedPorts.has(basePort)) {
    basePort++;
  }

  usedPorts.add(basePort);
  return basePort;
}

export function releasePort(port: number): void {
  usedPorts.delete(port);
}
