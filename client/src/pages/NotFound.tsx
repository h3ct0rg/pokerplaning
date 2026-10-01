import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

interface Props {
  title?: string;
  message?: string;
}

export function NotFound({
  title = 'Sala no encontrada',
  message = 'La sala que buscas no existe o ya expiró. Revisa el código o crea una nueva.',
}: Props) {
  return (
    <div className="home-bg">
      <main className="gate">
        <div className="panel center">
          <Logo size={48} withText={false} />
          <h1 className="h-lg">{title}</h1>
          <p className="muted">{message}</p>
          <Link to="/" className="btn btn-primary btn-lg">
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
