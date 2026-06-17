import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ShareView from "./pages/ShareView";
import AdminLayout from "./pages/admin/AdminLayout";

function Router() {
  return (
    <Switch>
      {/* 客户专属展示页 - 通过 token 访问，完全隔离，无后台入口 */}
      <Route path="/s/:token" component={ShareView} />

      {/* 管理员后台 - 登录保护，仅管理员可见 */}
      <Route path="/admin" component={AdminLayout} />
      <Route path="/admin/:rest*" component={AdminLayout} />

      {/* 根路径重定向到管理后台（仅管理员使用，客户不会访问根路径） */}
      <Route path="/" component={AdminLayout} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
