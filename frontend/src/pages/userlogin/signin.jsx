// Updated signin.jsx
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

      // Admin login
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

      // User login
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (authError || !authData?.user) {
          setSigninError(authError?.message || 'Authentication failed');
          setLoading(false);
          return;
        }

        const authUser = authData.user;

        // Try to fetch from Users table
        let { data: userData, error: userError } = await supabase
          .from('Users')
          .select('user_id, first_name, last_name, email, role')
          .eq('email', authUser.email)
          .maybeSingle();

        // If not found, insert
        if (!userData || userError) {
          const insertPayload = {
            email: authUser.email,
            first_name: authUser.user_metadata?.first_name || '',
            last_name: authUser.user_metadata?.last_name || '',
            role: 'user',
            password: null,
            auth_user_id: authUser.id,
          };

          const { data: newUser, error: insertError } = await supabase
            .from('Users')
            .insert([insertPayload])
            .select('user_id, first_name, last_name, email, role')
            .single();

          if (insertError) {
            setSigninError('Failed to save user profile. Try again later.');
            setLoading(false);
            return;
          }

          userData = newUser;

          // Create Onboarding record
          await supabase
            .from('Onboarding')
            .insert([{ user_id: userData.user_id, paid: false }]);
        }

        // Save to localStorage
        localStorage.setItem('user', JSON.stringify({
          user_id: userData.user_id,
          auth_user_id: authUser.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          role: userData.role
        }));

        // Check Onboarding
        const { data: onboarding } = await supabase
          .from('Onboarding')
          .select('paid')
          .eq('user_id', userData.user_id)
          .maybeSingle();

        navigate(onboarding?.paid ? '/dashboard' : '/onboarding');
      } catch (err) {
        console.error(err);
        setSigninError('Unexpected error. Try again.');
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
