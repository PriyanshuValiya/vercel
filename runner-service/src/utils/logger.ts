import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase environment variables in runner service !!"
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function updateLogs(projectId: string, line: string) {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("logs")
      .eq("id", projectId)
      .single();

    if (error) {
      throw error;
    }

    const updatedLogs = (data.logs || "") + "\n" + line;

    const { error: updateError } = await supabase
      .from("projects")
      .update({ logs: updatedLogs })
      .eq("id", projectId);

    if (updateError) {
      throw updateError;
    }
  } catch (err) {
    console.error("# Failed to update logs in Supabase:", err);
  }
}
