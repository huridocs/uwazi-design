import { Navbar } from "./components/layout/Navbar";
import { ReferencesView } from "./views/ReferencesView";

export function App() {
  return (
    <div className="h-full flex flex-col">
      <Navbar />
      <ReferencesView />
    </div>
  );
}
