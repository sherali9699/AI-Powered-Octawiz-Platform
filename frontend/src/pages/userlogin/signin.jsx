import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const SignInPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [signinError, setSigninError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSigninError('');
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);

      // Admin path
      if (isAdmin) {
        const { data, error } = await supabase
          .from('Admins')
          .select('*')
          .eq('email', formData.email)
          .single();
        setLoading(false);

        if (error || !data || data.password !== formData.password) {
          setSigninError('Invalid admin email or password.');
          return;
        }

        localStorage.setItem('admin', JSON.stringify({ email: data.email }));
        navigate('/admin');
        return;
      }

      // User path
      try {
        // Step 1: Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (authError) {
          console.error('Auth Sign-In Error:', authError);
          setSigninError(authError.message || 'Invalid email or password');
          setLoading(false);
          return;
        }

        console.log('✅ Auth success:', authData.user);

        const authUser = authData.user;

        // Step 2: Check if user exists in Users table
        const { data: userData, error: userError } = await supabase
          .from('Users')
          .select('user_id, first_name, last_name, email, role')
          .eq('email', authUser.email)
          .single();

        let userToUse = userData;

        if (userError) {
          console.warn('⚠️ User not found in Users table:', userError?.message);

          // Step 3: Insert new user in Users table
          const insertPayload = {
            email: authUser.email,
            first_name: authUser.user_metadata?.first_name || '',
            last_name: authUser.user_metadata?.last_name || '',
            role: 'user',
            password: null,
            auth_user_id: authUser.id,
          };

          console.log('ℹ️ Inserting new user:', insertPayload);

          const { data: insertedUser, error: insertError } = await supabase
            .from('Users')
            .insert([insertPayload])
            .select('user_id, first_name, last_name, email, role')
            .single();

          if (insertError) {
            console.error('❌ Insert Error:', insertError);
            setSigninError('Failed to insert user into database. Please contact support.');
            setLoading(false);
            return;
          }
          // 💡 Immediately create Onboarding record
          const { error: onboardingInsertError } = await supabase
            .from('Onboarding')
            .insert([{ user_id: insertedUser.user_id, paid: false }]);

          if (onboardingInsertError) {
            console.error('❌ Failed to create Onboarding record:', onboardingInsertError);
            setSigninError('Unexpected error during onboarding setup. Please try again.');
            setLoading(false);
            return;
          }
          userToUse = insertedUser;
        }

        // Step 4: Save user to localStorage
        localStorage.setItem('user', JSON.stringify({
          user_id: userToUse.user_id,
          auth_user_id: authUser.id,
          first_name: userToUse.first_name,
          last_name: userToUse.last_name,
          email: userToUse.email,
          role: userToUse.role
        }));

        console.log('✅ User saved to localStorage:', userToUse);

        // Step 5: Check onboarding status
        const { data: onboarding, error: onboardingError } = await supabase
          .from('Onboarding')
          .select('paid')
          .eq('user_id', userToUse.user_id)
          .single();

        if (onboardingError) {
          console.warn('ℹ️ Onboarding record not found. Creating new one.');
          await supabase.from('Onboarding').insert([{ user_id: userToUse.user_id, paid: false }]);
          navigate('/onboarding');
          return;
        }

        navigate(onboarding?.paid ? '/dashboard' : '/onboarding');
      } catch (err) {
        console.error('Unexpected Signin Error:', err);
        setSigninError('Unexpected error. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100 signin-bg">
      <div className="card p-4 shadow signin-card">
        <h2 className="text-center mb-3" style={{ color: 'var(--color-primary)' }}>Sign In</h2>
        <p className="text-center mb-4 text-muted">
          Don’t have an account? <Link to="/signup" className="text-primary text-decoration-none">Create one</Link>
        </p>
        {signinError && <div className="alert alert-danger">{signinError}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email address</label>
            <input
              type="email"
              name="email"
              id="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
            />
            {errors.email && <div className="invalid-feedback">{errors.email}</div>}
          </div>
          <div className="mb-2">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              name="password"
              id="password"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
            />
            {errors.password && <div className="invalid-feedback">{errors.password}</div>}
          </div>
          <div className="form-check mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="adminCheck"
              checked={isAdmin}
              onChange={() => setIsAdmin(!isAdmin)}
            />
            <label className="form-check-label" htmlFor="adminCheck">
              Sign in as Admin
            </label>
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignInPage;
