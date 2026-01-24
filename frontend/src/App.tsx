import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MapPage from './app/MapPage';
import StatsPage from './app/StatsPage'; // Assuming default export

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/stat" element={<StatsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
