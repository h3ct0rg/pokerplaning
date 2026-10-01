import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Home } from './pages/Home';
import { Room } from './pages/Room';
import { NotFound } from './pages/NotFound';
import { roomPath } from './lib/roomCode';

/** /room/:id (v1) → /r/:id */
function LegacyRoomRedirect() {
  const { id = '' } = useParams();
  return <Navigate to={roomPath(id.trim().toUpperCase())} replace />;
}

/** Remonta la sala al cambiar de código para no arrastrar estado. */
function RoomRoute() {
  const { code = '' } = useParams();
  return <Room key={code.toUpperCase()} />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/r/:code" element={<RoomRoute />} />
      <Route path="/room/:id" element={<LegacyRoomRedirect />} />
      <Route path="*" element={<NotFound title="Página no encontrada" message="Esta página no existe." />} />
    </Routes>
  );
}
