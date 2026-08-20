import { useState } from "react";
import { ExternalLink, X, FileText } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import type { ChatTraceSource, ChatAssistantSegment, WorkspaceOutputRecordPayload } from "../types";

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).origin;
    return `${domain}/favicon.ico`;
  } catch {
    return "";
  }
}

interface SourceToken {
  source: ChatTraceSource;
  faviconUrl: string;
}

function extractSourceTokens(segments: ChatAssistantSegment[]): SourceToken[] {
  const tokens: SourceToken[] = [];
  const seen = new Set<string>();
  for (const segment of segments) {
    if (segment.kind === "execution") {
      for (const item of segment.items) {
        if (item.kind === "trace_step" && item.step.sources) {
          for (const source of item.step.sources) {
            if (!seen.has(source.url)) {
              seen.add(source.url);
              tokens.push({
                source,
                faviconUrl: getFaviconUrl(source.url),
              });
            }
          }
        }
      }
    }
  }
  return tokens;
}

export function AssistantTurnSources({
  outputs,
  segments,
  onOpenOutput,
  onLinkClick,
}: {
  outputs: WorkspaceOutputRecordPayload[];
  segments: ChatAssistantSegment[];
  onOpenOutput?: (output: WorkspaceOutputRecordPayload) => void;
  onLinkClick?: (url: string) => void;
}) {
  const sourceTokens = extractSourceTokens(segments);
  const [openSource, setOpenSource] = useState<string | null>(null);

  if (outputs.length === 0 && sourceTokens.length === 0) return null;

  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {sourceTokens.map((token, index) => (
        <div
          key={token.source.url}
          className="relative group/source"
        >
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[11.5px] text-muted-foreground shadow-sm transition-colors hover:bg-fg-6",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            onClick={() => setOpenSource(openSource === token.source.url ? null : token.source.url)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpenSource(openSource === token.source.url ? null : token.source.url);
              }
            }}
            aria-expanded={openSource === token.source.url}
            aria-haspopup="dialog"
          >
            <img
              src={token.faviconUrl}
              alt=""
              className="size-3.5 rounded"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${getDomain(token.source.url)}&sz=32`;
              }}
            />
            <span className="truncate max-w-[180px]">{token.source.title}</span>
            <ExternalLink className="size-3 shrink-0 opacity-50 group-hover/source:opacity-100" />
          </button>

          {openSource === token.source.url && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpenSource(null)}
                aria-hidden="true"
              />
              {createPortal(
                <div
                  className={cn(
                    "fixed z-50 w-72 rounded-[10px] border border-border bg-card shadow-xl",
                    "animate-in fade-in-0 zoom-in-95 duration-150 ease-out-expo"
                  )}
                  style={{
                    top: 40 + index * 44,
                    right: 12,
                  }}
                  role="dialog"
                  aria-label={token.source.title}
                >
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={token.faviconUrl}
                        alt=""
                        className="size-4 rounded"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${getDomain(token.source.url)}&sz=32`;
                        }}
                      />
                      <span className="truncate text-sm font-medium text-foreground">
                        {token.source.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenSource(null)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                      aria-label="Close"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="p-3">
                    <div className="text-xs text-muted-foreground mb-2 break-all">
                      {token.source.url}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          window.open(token.source.url, "_blank", "noopener,noreferrer");
                          setOpenSource(null);
                        }}
                        className="flex-1 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(token.source.url);
                          setOpenSource(null);
                        }}
                        className="flex-1 py-1.5 rounded-md border border-border bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>,
                document.body,
              )}
            </>
          )}
        </div>
      ))}
      {outputs.map((output) => (
        <div key={output.id} className="relative group/output">
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[11.5px] text-muted-foreground shadow-sm transition-colors hover:bg-fg-6",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            onClick={() => onOpenOutput?.(output)}
          >
            <FileText className="size-3.5" />
            <span className="truncate max-w-[180px]">{output.title}</span>
            <ExternalLink className="size-3 shrink-0 opacity-50 group-hover/output:opacity-100" />
          </button>
        </div>
      ))}
    </div>
  );
}