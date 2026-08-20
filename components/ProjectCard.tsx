"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProject } from "@/lib/actions/projects";

export default function ProjectCard({
  id,
  name,
  prompt,
}: {
  id: string;
  name: string;
  prompt: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDeleteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await deleteProject(id);
      if ("error" in result) {
        toast.error(result.error);
        setConfirming(false);
      } else {
        toast.success("Project deleted");
        router.refresh();
      }
    });
  }

  return (
    <div className="group relative rounded-lg border border-border bg-surface p-4 hover:border-primary">
      <Link href={`/project/${id}`} className="block pr-8">
        <p className="truncate font-medium">{name}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted">{prompt}</p>
      </Link>

      <button
        onClick={handleDeleteClick}
        onBlur={() => setConfirming(false)}
        disabled={isPending}
        title={confirming ? "Click again to confirm delete" : "Delete project"}
        className={`absolute right-3 top-3 rounded-md p-1.5 text-muted opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 disabled:opacity-100 ${
          confirming ? "bg-red-500/20 text-red-400 opacity-100" : "hover:bg-white/10"
        }`}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>

      {confirming && !isPending && (
        <span className="absolute right-10 top-3 text-[10px] text-red-400">
          Click again
        </span>
      )}
    </div>
  );
}
