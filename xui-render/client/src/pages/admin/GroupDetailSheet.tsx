import { trpc } from "@/lib/trpc";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Wifi } from "lucide-react";
import { toast } from "sonner";

interface Props {
  groupId: number;
  onClose: () => void;
}

export default function GroupDetailSheet({ groupId, onClose }: Props) {
  const { data, isLoading } = trpc.admin.getGroupDetail.useQuery({ groupId });

  const copyText = async (text: string, label = "已复制") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("复制失败");
    }
  };

  const shareLink = data?.group
    ? `${window.location.origin}/s/${data.group.groupToken}`
    : "";

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            {isLoading ? "加载中..." : data?.group.customerName}
          </SheetTitle>
          {data?.group && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className={
                  data.group.status === "active"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                }
              >
                {data.group.status === "active" ? "活跃" : "已禁用"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {data.records.length} 条记录
              </span>
            </div>
          )}
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* 专属链接 */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
              <p className="text-sm font-medium">客户专属链接</p>
              <p className="text-xs font-mono break-all text-muted-foreground">{shareLink}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => copyText(shareLink, "链接已复制")}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  复制链接
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(shareLink, "_blank")}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* 记录列表 */}
            <div>
              <p className="text-sm font-medium mb-3">包含记录（{data.records.length}）</p>
              <div className="space-y-2">
                {data.records.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">暂无记录</p>
                ) : (
                  data.records.map((record, idx) => (
                    <div
                      key={record.id}
                      className="p-3 rounded-xl border border-border bg-muted/30 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium">
                            {record.remark || `节点 ${idx + 1}`}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {(record.protocol || "vmess").toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <Wifi className="w-3.5 h-3.5" />
                        {record.accelerateIp}:{record.acceleratePort}
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {record.vmessLink && (
                          <button
                            onClick={() => copyText(record.vmessLink!, "VMess 链接已复制")}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            VMess
                          </button>
                        )}
                        {record.clashLink && (
                          <button
                            onClick={() => copyText(record.clashLink!, "Clash 链接已复制")}
                            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            Clash
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">分组不存在</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
