import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";
import { NavComponent } from "./components/nav";

export default function App() {
  return (
    <Router
      root={(props) => (
        <>
          <NavComponent />
          <Suspense>{props.children}</Suspense>
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
