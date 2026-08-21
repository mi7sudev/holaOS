import { useState, useRef, useEffect } from "react";
import { ExternalLink, FileText, ChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
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
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!sourcesOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Don't close if clicking on a link (let navigation happen)
      const targetElement = event.target as HTMLElement;
      if (targetElement.closest("a")) return;
      
      const clickedButton = buttonRef.current?.contains(target);
      const clickedDropdown = dropdownRef.current?.contains(target);
      if (!clickedButton && !clickedDropdown) {
        setSourcesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sourcesOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!sourcesOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSourcesOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [sourcesOpen]);

  if (outputs.length === 0 && sourceTokens.length === 0) return null;

  return (
    <div className="mt-2.5 flex flex-col gap-1.5">
      {/* Sources button + inline dropdown */}
      {sourceTokens.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <button
            ref={buttonRef}
            type="button"
            aria-expanded={sourcesOpen}
            aria-haspopup="menu"
            onClick={() => setSourcesOpen((current) => !current)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[6px] px-1.5 py-0.5 text-left transition-colors duration-150 hover:bg-hover",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "w-fit"
            )}
          >
            <span className="flex -space-x-1">
              {sourceTokens.slice(0, 5).map((token, i) => (
                <img
                  key={token.source.url}
                  src={token.faviconUrl}
                  alt=""
                  className="source-avatar size-3.5 rounded-full bg-muted shadow-[0_0_0_1.5px_var(--border)]"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${getDomain(token.source.url)}&sz=32`;
                  }}
                  style={{ zIndex: 5 - i }}
                />
              ))}
              {sourceTokens.length > 5 && (
                <span
                  className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground"
                  style={{ zIndex: 0 }}
                >
                  +{sourceTokens.length - 5}
                </span>
              )}
            </span>
            <span className="text-[12px] text-muted-foreground">
              {sourceTokens.length} source{sourceTokens.length === 1 ? "" : "s"}
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                sourcesOpen && "rotate-180"
              )}
            />
          </button>

          {/* Inline dropdown - pushes content down when open */}
          {sourcesOpen && (
            <div
              ref={dropdownRef}
              className={cn(
                "rounded-[10px] border border-border bg-card shadow-xl",
                "animate-in fade-in-0 duration-150 ease-out-expo"
              )}
              role="menu"
              aria-label="Sources"
            >
              <div className="flex flex-col gap-0.5 p-2 max-h-[300px] overflow-auto">
                {sourceTokens.map((token) => (
                  <a
                    key={token.source.url}
                    href={token.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "flex items-center gap-2 rounded-[6px] px-1.5 py-1 text-[12px] text-muted-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground",
                      "group/source-row"
                    )}
                  >
                    <img
                      src={token.faviconUrl}
                      alt=""
                      className="source-avatar size-4 rounded-[4px]"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${getDomain(token.source.url)}&sz=32`;
                      }}
                    />
                    <span className="animated-underline truncate flex-1">
                      {token.source.title || getDomain(token.source.url)}
                    </span>
                    <span className="ml-auto font-mono text-[10.5px] text-muted-foreground/70">
                      {getDomain(token.source.url)}
                    </span>
                    <ExternalLink className="size-3 shrink-0 opacity-50 group-hover/source-row:opacity-100" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Output files */}
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