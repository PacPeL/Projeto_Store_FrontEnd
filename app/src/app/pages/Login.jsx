import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { useTranslation } from 'react-i18next';
import * as db from '../services/database'; // <- interface backend

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const user = await db.auth.signIn(form.email.trim(), form.password);
      // Persistencia: cookie + localStorage (opcional)
      Cookies.set('session_uid', user.uid, { expires: 7, sameSite: 'Lax' });
      localStorage.setItem('user', JSON.stringify(user));

      // Redirige a Home
      navigate('/home');
    } catch (error) {
      setErr(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth auth--login">
      <div className="auth__card">
        <h1 className="auth__title">{t('login.title', 'Iniciar sesión')}</h1>
        <p className="auth__subtitle">
          {t('login.subtitle', 'Bienvenido, ingresa para continuar')}
        </p>

        <form className="auth__form" onSubmit={onSubmit} noValidate>
          <label className="field">
            <span className="field__label">{t('login.email', 'Email')}</span>
            <input
              type="email"
              name="email"
              className="field__input"
              placeholder="tucorreo@dominio.com"
              value={form.email}
              onChange={onChange}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">{t('login.password', 'Contraseña')}</span>
            <div className="field__password">
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                className="field__input"
                placeholder={t('login.passwordPlaceholder', '••••••••')}
                value={form.password}
                onChange={onChange}
                required
                minLength={6}
              />
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setShowPass((s) => !s)}
                aria-label={showPass ? t('login.hide', 'Ocultar') : t('login.show', 'Mostrar')}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          {err && <div className="alert alert--error">{err}</div>}

          <button className="btn btn--primary" type="submit" disabled={loading}>
            {loading ? t('common.loading', 'Cargando...') : t('login.signIn', 'Entrar')}
          </button>
        </form>

        <div className="auth__footer">
          <span>{t('login.noAccount', '¿No tienes cuenta?')}</span>{' '}
          <Link to="/register" className="link">
            {t('login.register', 'Regístrate')}
          </Link>
        </div>
      </div>
    </section>
  );
}