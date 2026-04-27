import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";

import { Shell } from "@/components/layout/Shell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

import Marketing from "@/pages/marketing";
import SignIn from "@/pages/auth/sign-in";
import SignUp from "@/pages/auth/sign-up";
import Dashboard from "@/pages/dashboard";
import Portfolio from "@/pages/portfolio";
import Markets from "@/pages/markets";
import SymbolDetail from "@/pages/markets/symbol";
import Trade from "@/pages/trade";
import Watchlist from "@/pages/watchlist";
import Transactions from "@/pages/transactions";
import Advisor from "@/pages/advisor";
import Funding from "@/pages/funding";
import FundingSuccess from "@/pages/funding/success";
import Profile from "@/pages/profile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Marketing} />
      <Route path="/sign-in/*?" component={SignIn} />
      <Route path="/sign-up/*?" component={SignUp} />
      
      <Route path="/dashboard"><ProtectedRoute><Shell><Dashboard /></Shell></ProtectedRoute></Route>
      <Route path="/portfolio"><ProtectedRoute><Shell><Portfolio /></Shell></ProtectedRoute></Route>
      <Route path="/markets"><ProtectedRoute><Shell><Markets /></Shell></ProtectedRoute></Route>
      <Route path="/markets/:symbol"><ProtectedRoute><Shell><SymbolDetail /></Shell></ProtectedRoute></Route>
      <Route path="/trade"><ProtectedRoute><Shell><Trade /></Shell></ProtectedRoute></Route>
      <Route path="/watchlist"><ProtectedRoute><Shell><Watchlist /></Shell></ProtectedRoute></Route>
      <Route path="/transactions"><ProtectedRoute><Shell><Transactions /></Shell></ProtectedRoute></Route>
      <Route path="/advisor"><ProtectedRoute><Shell><Advisor /></Shell></ProtectedRoute></Route>
      <Route path="/funding"><ProtectedRoute><Shell><Funding /></Shell></ProtectedRoute></Route>
      <Route path="/funding/success"><ProtectedRoute><Shell><FundingSuccess /></Shell></ProtectedRoute></Route>
      <Route path="/profile"><ProtectedRoute><Shell><Profile /></Shell></ProtectedRoute></Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
