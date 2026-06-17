import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Route, Switch, useLocation } from "wouter";
import { BarChart3, Database, FolderOpen, Key, Link2, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Dashboard from "./Dashboard";
import Records from "./Records";
import Groups from "./Groups";
import Links from "./Links";
import ApiKeys from "./ApiKeys";

const navItems = [
  { path: "/admin", label: "数据总览", icon: BarChart3, exact: true },
  { path: "/admin/records", label: "所有记录", icon: Database },
  { path: "/admin/groups", label: "分组管理", icon: FolderOpen },
  { path: "/admin/links", label: "链接管理", icon: Link2 },
  { path: "/admin/apikeys", label: "API 密钥", icon: Key },
];

export default function AdminLayout() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm animate-pulse">加载中...</div>
      </div>
    );
  }

  // 未登录
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Key className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">管理员登录</h1>
          <p className="text-muted-foreground text-sm mb-6">
            请使用管理员账号登录以访问后台管理系统
          </p>
          <Button
            className="w-full"
            onClick={() => (window.location.href = getLoginUrl())}
          >
            登录
          </Button>
        </div>
      </div>
    );
  }

  // 非管理员
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold mb-2">权限不足</h1>
          <p className="text-muted-foreground text-sm mb-6">
            您的账号没有管理员权限，请联系系统管理员。
          </p>
          <Button variant="outline" onClick={() => logout()}>
            退出登录
          </Button>
        </div>
      </div>
    );
  }

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location === path;
    return location.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* 侧边栏遮罩（移动端） */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-card border-r border-border flex flex-col z-50 transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="font-bold text-base">x-ui 管理后台</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.name || "管理员"}</p>
          </div>
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 导航 */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path, item.exact);
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                  ${active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* 底部退出 */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* 移动端顶栏 */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">x-ui 管理后台</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/admin" component={Dashboard} />
            <Route path="/admin/records" component={Records} />
            <Route path="/admin/groups" component={Groups} />
            <Route path="/admin/links" component={Links} />
            <Route path="/admin/apikeys" component={ApiKeys} />
          </Switch>
        </div>
      </main>
    </div>
  );
}
