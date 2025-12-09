import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../src/components/layout/Layout"; 
import Dashboard from "../src/pages/Dashboard/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
