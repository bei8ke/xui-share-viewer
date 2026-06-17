import { trpc } from "@/lib/trpc";
import { BarChart3, Database, FolderOpen, Link2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <Card className="border-white/10 bg-white/5">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.admin.getStats.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">数据总览</h2>
        <p className="text-muted-foreground mt-1">系统运行状态一览</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Database}
          label="总记录数"
          value={stats?.totalRecords ?? 0}
          color="bg-blue-500"
        />
        <StatCard
          icon={FolderOpen}
          label="未分配记录"
          value={stats?.unassignedRecords ?? 0}
          color="bg-amber-500"
        />
        <StatCard
          icon={Users}
          label="客户分组"
          value={stats?.totalGroups ?? 0}
          color="bg-violet-500"
        />
        <StatCard
          icon={Link2}
          label="活跃链接"
          value={stats?.activeGroups ?? 0}
          color="bg-emerald-500"
        />
      </div>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-4 h-4" />
            快速操作指引
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
            <p>在「<strong className="text-foreground">所有记录</strong>」页面查看本地端推送的所有批量操作结果，可按「已分配/未分配」筛选。</p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
            <span className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            <p>在「<strong className="text-foreground">分组管理</strong>」页面勾选记录、输入客户名称，创建专属分组并生成客户访问链接。</p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
            <p>在「<strong className="text-foreground">链接管理</strong>」页面复制客户专属链接，或禁用/启用对应链接的访问权限。</p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
            <p>在「<strong className="text-foreground">API 密钥</strong>」页面生成密钥，配置到本地端工具以推送数据到云端。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
