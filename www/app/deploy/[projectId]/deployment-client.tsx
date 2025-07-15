"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitBranch,
  Globe,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Project {
  id: string;
  user_id: string;
  repo_url: string;
  project_name: string;
  framework: string;
  env_variables: Record<string, string>;
  status: "queued" | "building" | "deployed" | "failed";
  deployed_url: string | null;
  port: number | null;
  created_at: string;
  logs: string | null;
}

interface DeploymentClientProps {
  initialProject: Project;
}

export default function DeploymentClient({
  initialProject,
}: DeploymentClientProps) {
  const [project, setProject] = useState<Project>(initialProject);
  const [isPolling, setIsPolling] = useState(false);

  const isDeploying =
    project.status === "queued" || project.status === "building";

  useEffect(() => {
    if (isDeploying) {
      setIsPolling(true);
      const interval = setInterval(async () => {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", project.id)
          .single();

        if (data && !error) {
          setProject(data);

          // Stop polling if deployment is complete
          if (data.status === "deployed" || data.status === "failed") {
            setIsPolling(false);
            clearInterval(interval);
          }
        }
      }, 5000);

      return () => {
        clearInterval(interval);
        setIsPolling(false);
      };
    }
  }, [project.id, isDeploying]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "queued":
        return <Clock className="w-4 h-4" />;
      case "building":
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case "deployed":
        return <CheckCircle className="w-4 h-4" />;
      case "failed":
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "queued":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "building":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "deployed":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatLogs = (logs: string | null) => {
    if (!logs) return [];

    return logs
      .split("\n")
      .filter((line) => line.trim())
      .map((line, index) => {
        let color = "text-gray-700";
        let icon = null;

        if (line.startsWith("$")) {
          color = "text-green-600";
          icon = <CheckCircle className="w-3 h-3 mr-2 flex-shrink-0 mt-0.5" />;
        } else if (line.startsWith("#")) {
          color = "text-red-600";
          icon = <XCircle className="w-3 h-3 mr-2 flex-shrink-0 mt-0.5" />;
        } else if (line.startsWith("@")) {
          color = "text-yellow-600";
          icon = <AlertCircle className="w-3 h-3 mr-2 flex-shrink-0 mt-0.5" />;
        }

        return {
          id: index,
          text: line.substring(1), 
          color,
          icon,
          hasPrefix:
            line.startsWith("$") ||
            line.startsWith("#") ||
            line.startsWith("@"),
        };
      });
  };

  const getRepoName = (repoUrl: string) => {
    try {
      const url = new URL(repoUrl);
      return url.pathname.replace("/", "").replace(".git", "");
    } catch {
      return repoUrl;
    }
  };

  const logEntries = formatLogs(project.logs);

  return (
    <div className="container mx-auto p-6 max-w-8xl px-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{project.project_name}</h1>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Project Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              <p className="text-xl">Repository Information</p>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-base font-medium text-muted-foreground">
                Repository
              </label>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-lg">
                  <a
                    href={project.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600"
                  >
                    {getRepoName(project.repo_url)}
                  </a>
                </span>
              </div>
            </div>

            <div className="flex">
              <div className="w-[50%]">
                <label className="text-base font-medium text-muted-foreground">
                  Framework
                </label>
                <p className="mt-1 capitalize text-base">{project.framework}</p>
              </div>

              {project.port && (
                <div>
                  <label className="text-base font-medium text-muted-foreground">
                    Port
                  </label>
                  <p className="mt-1 font-mono text-base">{project.port}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Deployment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              <p className="text-xl">Deployment Status</p>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-base font-medium text-muted-foreground">
                Status
              </label>
              <div className="mt-1">
                <Badge
                  className={`${getStatusColor(
                    project.status
                  )} flex items-center gap-1 w-fit`}
                >
                  {getStatusIcon(project.status)}
                  {project.status.charAt(0).toUpperCase() +
                    project.status.slice(1)}
                </Badge>
              </div>
            </div>

            {project.deployed_url && (
              <div>
                <label className="text-base font-medium text-muted-foreground">
                  Live URL
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-base text-blue-600">
                    <a
                      href={project.deployed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {project.deployed_url}
                    </a>
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Environment Variables */}
      {/* {project.env_variables && Object.keys(project.env_variables).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>Environment variables configured for this deployment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(project.env_variables).map(([key]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="font-mono text-sm">{key}</span>
                  <span className="font-mono text-sm text-muted-foreground">{"*".repeat(8)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )} */}

      {/* Deployment Logs */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-xl">Deployment Logs</span>
            {isPolling && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Live
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full rounded-xl border bg-black p-4">
            {logEntries.length > 0 ? (
              <div className="space-y-1 font-mono text-sm">
                {logEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center ${entry.color}`}
                  >
                    {entry.hasPrefix && entry.icon}
                    <span className="whitespace-pre-wrap break-all">
                      {entry.hasPrefix ? entry.text : entry.text}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No logs available yet</p>
                  <p className="text-sm">
                    Logs will appear when deployment starts
                  </p>
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
