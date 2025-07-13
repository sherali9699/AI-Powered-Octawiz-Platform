import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    confirmEmail: '',
    password: '',
    confirmPassword: '',
    role: 'user', // Default role
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setSignupError('');
  const newErrors = {};

  if (!formData.firstName) newErrors.firstName = 'First name is required';
  if (!formData.lastName) newErrors.lastName = 'Last name is required';
  if (!formData.email) newErrors.email = 'Email is required';
  if (formData.email !== formData.confirmEmail) newErrors.confirmEmail = 'Emails do not match';
  if (!formData.password) newErrors.password = 'Password is required';
  if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

  setErrors(newErrors);

  if (Object.keys(newErrors).length === 0) {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: formData.role,
          },
          emailRedirectTo: `${window.location.origin}/auth-callback`,
        },
      });

      setLoading(false);

      if (error) {
        if (error.message.includes('already registered')) {
          setSignupError('An account with this email already exists.');
          const goToSignIn = window.confirm(
            'An account with this email already exists. Would you like to sign in instead?'
          );
          if (goToSignIn) navigate('/signin');
        } else {
          setSignupError(error.message);
        }
        return;
      }

      if (data?.user) {
        alert('Verification email sent! Please check your inbox.');
        navigate('/signin');
      }
    } catch (err) {
      console.error(err);
      setSignupError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }
};



  return (
    <div className="signup container py-5">
      <div className="mx-auto" style={{ maxWidth: '500px' }}>
        <h2 className="mb-3">Create an Account</h2>
        <p>
          Already have an account? <Link to="/signin" className="text-primary">Sign in</Link>
        </p>
        {signupError && <div className="alert alert-danger">{signupError}</div>}
        <form onSubmit={handleSubmit} className="needs-validation" noValidate>
          <div className="mb-1">
            <label className="form-label">First Name</label>
            <input
              type="text"
              className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Enter your first name"
            />
            <div className="invalid-feedback">{errors.firstName}</div>
          </div>

          <div className="mb-1">
            <label className="form-label">Last Name</label>
            <input
              type="text"
              className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Enter your last name"
            />
            <div className="invalid-feedback">{errors.lastName}</div>
          </div>

          <div className="mb-1">
            <label className="form-label">Email</label>
            <input
              type="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@email.com"
            />
            <div className="invalid-feedback">{errors.email}</div>
          </div>

          <div className="mb-1">
            <label className="form-label">Confirm Email</label>
            <input
              type="email"
              className={`form-control ${errors.confirmEmail ? 'is-invalid' : ''}`}
              name="confirmEmail"
              value={formData.confirmEmail}
              onChange={handleChange}
              placeholder="Confirm email"
            />
            <div className="invalid-feedback">{errors.confirmEmail}</div>
          </div>

          <div className="mb-1">
            <label className="form-label">Password</label>
            <input
              type="password"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
            />
            <div className="invalid-feedback">{errors.password}</div>
          </div>

          <div className="mb-1">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
            />
            <div className="invalid-feedback">{errors.confirmPassword}</div>
          </div>

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>{loading ? 'Signing up...' : 'Sign up'}</button>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
