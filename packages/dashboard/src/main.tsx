import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { Overview } from "./views/Overview";
import { SiteDetail } from "./views/SiteDetail";
import { Layout } from "./Layout";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/sites/:id" element={<SiteDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  </React.StrictMode>
);
