import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          console.error('No authenticated user:', error);
          navigate('/signin');
          return;
        }

        let { data: userData, error: userError } = await supabase
          .from('Users')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (!userData || userError) {
          const { data: newUser, error: insertError } = await supabase
            .from('Users')
            .insert([{
              email: user.email,
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || '',
              role: user.user_metadata?.role || 'user',
              auth_user_id: user.id
            }])
            .select('*')
            .single();

          if (insertError) throw insertError;
          userData = newUser;

          await supabase.from('Onboarding').insert([{ user_id: userData.user_id, paid: false }]);
        }

        localStorage.setItem('user', JSON.stringify({
          user_id: userData.user_id,
          auth_user_id: user.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          role: userData.role
        }));

        const { data: onboarding } = await supabase
          .from('Onboarding')
          .select('paid')
          .eq('user_id', userData.user_id)
          .maybeSingle();

        navigate(onboarding?.paid ? '/dashboard' : '/onboarding');
      } catch (error) {
        console.error('AuthCallback error:', error);
        alert('Login failed. Try again.');
        navigate('/signin');
      }
    };

    handleAuth();
  }, [navigate]);

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Verifying and redirecting...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
