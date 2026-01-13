// src/pages/AuthCallback.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refreshToken = searchParams.get('refreshToken');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!refreshToken) {
      // Если refresh token нет, перенаправляем на главную
      navigate('/', { replace: true });
      return;
    }

    // Обрабатываем refresh token через API, используя fetch вместо прямого редиректа
    // Это избежит блокировки браузером URL с токеном
    const processRefreshToken = async () => {
      try {
        console.log('Processing refresh token...');
        // Используем GET запрос к callback API, но через fetch
        const response = await fetch(`/api/auth/callback?refreshToken=${encodeURIComponent(refreshToken)}`, {
          method: 'GET',
          credentials: 'include', // Важно для передачи cookies
          redirect: 'follow', // Следуем редиректам
        });

        console.log('Callback response status:', response.status);
        console.log('Callback response ok:', response.ok);

        if (response.ok) {
          // Пытаемся получить JSON ответ
          try {
            const data = await response.json();
            console.log('Callback response data:', data);
            
            if (data.success && data.redirectUrl) {
              // Cookie уже установлен сервером, переходим на главную
              console.log('Authorization successful, redirecting to home...');
              // Используем полный редирект для обновления состояния
              window.location.href = data.redirectUrl || '/';
            } else {
              // Если нет redirectUrl, просто переходим на главную
              console.log('Authorization successful, redirecting to home...');
              window.location.href = '/';
            }
          } catch (e) {
            // Если не JSON, возможно это HTML (для WebView), просто переходим на главную
            console.log('Response is not JSON, assuming success, redirecting...');
            window.location.href = '/';
          }
        } else {
          // Пытаемся получить текст ошибки
          let errorText = 'Authorization failed';
          try {
            const errorData = await response.json();
            errorText = errorData.error || errorData.message || 'Authorization failed';
            console.error('Callback error:', errorData);
          } catch (e) {
            const text = await response.text().catch(() => '');
            errorText = text || 'Authorization failed';
            console.error('Callback error text:', text);
          }
          setError(errorText);
          // Через 3 секунды редиректим на главную даже при ошибке
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
        }
      } catch (err: any) {
        console.error('Error processing refresh token:', err);
        setError(err.message || 'Failed to fetch');
        // Через 3 секунды редиректим на главную даже при ошибке
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    };

    processRefreshToken();
  }, [refreshToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <div className="text-red-500 text-lg font-semibold">Authorization Error</div>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground">Redirecting to home page...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Authorizing...</p>
          </>
        )}
      </div>
    </div>
  );
}

