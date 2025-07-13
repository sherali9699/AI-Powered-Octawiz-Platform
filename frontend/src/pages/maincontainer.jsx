import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import CategorySelection from './CategorySelection';
import MainlandLegalStructure from './mainland/legalStructure';
import MainlandBusinessName from './mainland/businessName';
import Dashboard from './freezone/dashboard';
import MainlandContactInformation from './mainland/ContactInformation';
import MainlandEmployeeCount from './mainland/EmployeeCount';
import MainlandBusinessProposal from './mainland/BusinessProposal';
import MainlandNotes from './mainland/Notes';

// Offshore Components
import OffshoreStep1 from './Offshore/OffshoreStep1';
import OffshoreStep2 from './Offshore/OffshoreStep2';
import OffshoreStep3 from './Offshore/OffshoreStep3';
import OffshoreStep4 from './Offshore/OffshoreStep4';
import OffshoreStep5 from './Offshore/OffshoreStep5';
import StepsSidebar_offshore from '../components/stepsidebar_offshore';
import { useNavigate } from 'react-router-dom';  // Add this import

// Freezone Screens
import Step2CompanyStructure from './step2companystructure';
import Step3Industry from './freezone/step3industry';
import Step4ActivitySelection from './freezone/step4ActivitySelection';
import Step5VisaRequirement from './freezone/step5visarequirment';
import Step6OfficePreference from './freezone/step6officepref';
import Step7Ownership from './freezone/step7ownership';
import Step8ZoneRecommendation from './freezone/step8recommnededzone';
import Step9TradeName from './freezone/step9tradename';
import Step10Stakeholders from './freezone/step10stakeholders';
import Step11ShareCapital from './freezone/step11sharecapital';
import Step12UploadDocuments from './freezone/step12uploaddocuments';
import Step13ReviewPayment from './freezone/step13reviewpayment';
import Step14Confirmation from './freezone/step14confirmation';

import NotAvailable from './notavailiable';
import StepsSidebar from '../components/stepsidebar';
import StepsSidebar_freezone from '../components/stepsidebar_freezone';
// import ChatBot from '../components/chatbot';

export default function OnboardingContainer() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const handler = () => setCurrentStep(13);
    window.addEventListener('advanceStepAfterSubmit', handler);
    return () => window.removeEventListener('advanceStepAfterSubmit', handler);
  }, []);
  const [category, setCategory] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({});
  const [onboardingId, setOnboardingId] = useState(null);
  const navigate = useNavigate();

  // Add this function for Offshore submission
  const handleSubmitOffshore = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const user_id = user?.user_id;

      if (!user_id) {
        console.error('No user found in localStorage');
        return;
      }

      const { error } = await supabase
        .from('OffshoreUserInfo')
        .insert([
          {
            user_id: user_id,
            contact_name: onboardingData.contactName || null,
            contact_phone: onboardingData.contactPhone || null,
            contact_email: onboardingData.contactEmail || null,
            business_name: onboardingData.businessName || null,
            jurisdiction: onboardingData.jurisdiction || null,
            business_proposal: onboardingData.proposal || null,
            estimated_share_capital: onboardingData.shareCapital || null,
            preferred_language: onboardingData.language || null,
            notes: onboardingData.notes || null
          }
        ]);

      if (error) throw error;

      // Show success and move to next step
      alert('Offshore application submitted successfully!');
      setCurrentStep(6);
    } catch (error) {
      console.error('Error submitting offshore application:', error);
      alert('Failed to submit application. Please try again.');
    }
  };


  const handleSubmitMainland = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const user_id = user?.user_id;
      if (!user_id) {
        console.error('No user found in localStorage');
        return;
      }

      // Build payload from your form data
      const payload = {
        user_id,
        business_name:          onboardingData.businessName  || null,
        legal_structure:        onboardingData.legalStructure|| null,
        full_name:              onboardingData.contactName   || null,
        phone_number:           onboardingData.contactPhone  || null,
        email_address:          onboardingData.contactEmail  || null,
        estimated_employees_range: onboardingData.employeeCount || null,
        business_proposal:      onboardingData.businessProposal || null,
        notes:                  onboardingData.notes        || null,
      };

      console.log('Inserting Mainland payload:', payload);
      const { data, error } = await supabase
        .from('MainlandUserInfo')
        .insert([payload]);
      
      if (error) throw error;
      console.log('Mainland insert success:', data);

      // Advance to a new success step
      setCurrentStep(7);

    } catch (err) {
      console.error('Error submitting mainland application:', err);
      alert('Failed to submit mainland application.');
    }
  };

  // const handleSubmitMainland = async () => {
  //   try {
  //     const user = JSON.parse(localStorage.getItem('user'));
  //     const user_id = user?.user_id;
      
  //     if (!onboardingId) {
  //       console.error('No onboarding ID found');
  //       return;
  //     }

  //     const { error } = await supabase
  //       .from('Onboarding')
  //       .update({
  //         business_name: onboardingData.businessName,
  //         legal_structure: onboardingData.legalStructure,
  //         contact_name: onboardingData.contactName,
  //         contact_phone: onboardingData.contactPhone,
  //         contact_email: onboardingData.contactEmail,
  //         employee_count: onboardingData.employeeCount,
  //         business_proposal: onboardingData.businessProposal,
  //         notes: onboardingData.notes,
  //         status: 'submitted',
  //         updated_at: new Date().toISOString()
  //       })
  //       .eq('id', onboardingId);

  //     if (error) throw error;

  //     setCurrentStep(8); // Navigate to confirmation step
  //   } catch (error) {
  //     console.error('Error submitting mainland application:', error);
  //     // Handle error (show toast, etc.)
  //   }
  // };

  useEffect(() => {
    // Only restore if onboarding exists for user
    const fetchOnboarding = async () => {
      const user = JSON.parse(localStorage.getItem('user'));
      const user_id = user?.user_id;
      if (!user_id) return;
      let { data, error } = await supabase
        .from('Onboarding')
        .select('*')
        .eq('user_id', user_id)
        .single();
      if (data && data.id) {
        setOnboardingId(data.id);
        let onboardingData = {};
        if (data.industry) onboardingData.industryId = data.industry;
        if (data.activity || data.custom_activity) {
          if (data.activity) {
            const { data: act } = await supabase
              .from('Activities')
              .select('name')
              .eq('id', data.activity)
              .single();
            onboardingData.activities = act && act.name ? [act.name] : [];
          } else {
            onboardingData.activities = [];
          }
          onboardingData.customActivity = data.custom_activity || '';
        }
        if (data.ownership) onboardingData.ownership = data.ownership;
        if (data.freezone) onboardingData.freezone = data.freezone;
        if (data.visa_requirement) onboardingData.visa_requirement = data.visa_requirement;
        if (data.office_type) onboardingData.office_type = data.office_type;
        if (data.trade_name) onboardingData.trade_name = data.trade_name;
        if (data.trade_name2) onboardingData.trade_name2 = data.trade_name2;
        if (data.trade_name3) onboardingData.trade_name3 = data.trade_name3;
        const { data: stakeholders } = await supabase
          .from('Shareholder')
          .select('shareholder_id, name, nationality, passport_no, email, share_capital, percentage, shares')
          .eq('onboarding_id', data.id);
        if (stakeholders && stakeholders.length > 0) {
          onboardingData.stakeholders = stakeholders.map(s => ({
            name: s.name,
            nationality: s.nationality,
            passport: s.passport_no,
            email: s.email,
            shareholder_id: s.shareholder_id,
            shares: s.shares,
            percentage: s.percentage,
            share_capital: s.share_capital
          }));
          onboardingData.equity = stakeholders.map(s => s.percentage);
          onboardingData.shareCapital = data.total_share_capital || 5000;
        }
        const { data: documents } = await supabase
          .from('Documents')
          .select('*')
          .eq('onboarding_id', data.id);
        if (documents && documents.length > 0) {
          onboardingData.documents = documents;
        }
        if (data.submitted) {
          navigate('/dashboard'); // Directly redirect to dashboard
        } else {
          setCurrentStep(1);
        }
        setOnboardingData(onboardingData);
      }
      setLoading(false);
    };
    fetchOnboarding();
  }, []);

  // Only create onboarding row when user selects Freezone
  const handleCategorySelect = async (cat) => {
    setCategory(cat);
    setCurrentStep(1);
    setOnboardingData({ category: cat });
    if (cat === 'freezone') {
      const user = JSON.parse(localStorage.getItem('user'));
      const user_id = user?.user_id;
      // Check if onboarding row already exists
      const { data: existing, error: fetchError } = await supabase
        .from('Onboarding')
        .select('*')
        .eq('user_id', user_id)
        .single();
      if (existing && existing.id) {
        setOnboardingId(existing.id);
        // Restore progress
        let onboardingData = {};
        if (existing.industry) onboardingData.industryId = existing.industry;
        if (existing.activity || existing.custom_activity) {
          if (existing.activity) {
            const { data: act } = await supabase
              .from('Activities')
              .select('name')
              .eq('id', existing.activity)
              .single();
            onboardingData.activities = act && act.name ? [act.name] : [];
          } else {
            onboardingData.activities = [];
          }
          onboardingData.customActivity = existing.custom_activity || '';
        }
        if (existing.ownership) onboardingData.ownership = existing.ownership;
        if (existing.freezone) onboardingData.freezone = existing.freezone;
        if (existing.visa_requirement) onboardingData.visa_requirement = existing.visa_requirement;
        if (existing.office_type) onboardingData.office_type = existing.office_type;
        if (existing.trade_name) onboardingData.trade_name = existing.trade_name;
        if (existing.trade_name2) onboardingData.trade_name2 = existing.trade_name2;
        if (existing.trade_name3) onboardingData.trade_name3 = existing.trade_name3;
        const { data: stakeholders } = await supabase
          .from('Shareholder')
          .select('shareholder_id, name, nationality, passport_no, email, share_capital, percentage, shares')
          .eq('onboarding_id', existing.id);
        if (stakeholders && stakeholders.length > 0) {
          onboardingData.stakeholders = stakeholders.map(s => ({
            name: s.name,
            nationality: s.nationality,
            passport: s.passport_no,
            email: s.email,
            shareholder_id: s.shareholder_id,
            shares: s.shares,
            percentage: s.percentage,
            share_capital: s.share_capital
          }));
          onboardingData.equity = stakeholders.map(s => s.percentage);
          onboardingData.shareCapital = stakeholders[0].share_capital;
        }
        const { data: documents } = await supabase
          .from('Documents')
          .select('*')
          .eq('onboarding_id', existing.id);
        if (documents && documents.length > 0) {
          onboardingData.documents = documents;
        }
        setOnboardingData(onboardingData);
      } else {
        // Only create if not exists
        const { data: newData, error: insertError } = await supabase
          .from('Onboarding')
          .insert([{ user_id }])
          .select('id')
          .single();
        if (!insertError) {
          setOnboardingId(newData?.id);
        }
      }
    } else {
      setOnboardingId(null);
    }
  };

  const nextStep = (data = {}) => {
    setOnboardingData(prev => ({ ...prev, ...data }));
    setCurrentStep(prev => prev + 1);
    console.log('Onboarding Data:', { ...onboardingData, ...data });
  };

  const prevStep = (type) => {
    if (type === 'category') {
      setCategory(null);
    } else if (category === 'freezone' && currentStep === 1) {
      setCategory(null);
      setCurrentStep(1);
      setOnboardingData({});
    } else {
      setCurrentStep(prev => (prev > 1 ? prev - 1 : 1));
    }
  };

  const renderStep = () => {
    if (loading) {
      return <div className="d-flex justify-content-center align-items-center vh-100 bg-dark text-white"><span>Loading...</span></div>;
    }
    if (!category) {
      return <CategorySelection onSelect={handleCategorySelect} />;
    }

    if (category === 'mainland') {
      switch (currentStep) {
        case 1:
          return <MainlandBusinessName onNext={(data) => data?.backToCategory ? setCategory(null) : nextStep(data)} />;
        case 2:
          return <MainlandLegalStructure onNext={nextStep} onPrev={() => setCurrentStep(1)} recommended={null} />;
        case 3:
          return (
            <MainlandContactInformation
              formData={onboardingData}
              setFormData={(data) => setOnboardingData(prev => ({ ...prev, ...data }))}
              onNext={() => nextStep()}
              onPrev={() => setCurrentStep(2)}
            />
          );
        case 4:  // Now this is EmployeeCount (previously was step 5)
          return (
            <MainlandEmployeeCount
              formData={onboardingData}
              setFormData={(data) => setOnboardingData(prev => ({ ...prev, ...data }))}
              onNext={() => nextStep()}
              onPrev={() => setCurrentStep(3)}  // Goes back to ContactInformation now
            />
          );
        case 5:  // Now this is BusinessProposal (previously was step 6)
          return (
            <MainlandBusinessProposal
              formData={onboardingData}
              setFormData={(data) => setOnboardingData(prev => ({ ...prev, ...data }))}
              onNext={() => nextStep()}
              onPrev={() => setCurrentStep(4)}  // Goes back to EmployeeCount now
            />
          );
        case 6:  // Now this is Notes (previously was step 7)
          return (
            <MainlandNotes
              formData={onboardingData}
              setFormData={(data) => setOnboardingData(prev => ({ ...prev, ...data }))}
              onSubmit={handleSubmitMainland}
              onPrev={() => setCurrentStep(5)}  // Goes back to BusinessProposal now
            />
          );
        case 7:
          return (
            <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-dark text-white">
              <h2 className="mb-3">Application Has Been Submitted</h2>
              <p className="lead mb-4">We will contact you shortly.</p>
              <button
                className="btn btn-outline-danger"
                onClick={() => {
                  localStorage.removeItem('user');
                  navigate('/signin');
                }}
              >
                Logout
              </button>
            </div>
          );

        default:
          return <div className="p-5 text-white">Mainland step not implemented yet.</div>;
      }
    }
    if (category === 'freezone') {
      // Wait for onboardingId before rendering steps that require it
      if (!onboardingId && currentStep > 0) {
        return <div className="p-5 text-white">Loading onboarding...</div>;
      }
      switch (currentStep) {
        case 0:
          return <Step2CompanyStructure onNext={nextStep} onPrev={prevStep} onboardingId={onboardingId} />;
        case 1:
          return (
            <Step3Industry
              onNext={nextStep}
              onPrev={prevStep}
              onboardingId={onboardingId}
              selectedIndustryId={onboardingData.industryId}
            />
          );
        case 2:
          return (
            <Step4ActivitySelection
              onNext={nextStep}
              onPrev={prevStep}
              selectedIndustryId={onboardingData.industryId}
              onboardingId={onboardingId}
              selectedActivities={onboardingData.activities}
              customActivity={onboardingData.customActivity}
            />
          );
        case 3:
          return <Step7Ownership onNext={nextStep} onPrev={prevStep} onboardingId={onboardingId} selectedOwnershipId={onboardingData.ownership} />;
        case 4:
          return <Step8ZoneRecommendation onNext={nextStep} onPrev={prevStep} onboardingId={onboardingId} selectedFreezoneId={onboardingData.freezone} />;
        case 5:
          return <Step5VisaRequirement onNext={nextStep} onPrev={prevStep} onboardingId={onboardingId} selectedVisaRequirement={onboardingData.visa_requirement} />;
        case 6:
          return <Step6OfficePreference onNext={nextStep} onPrev={prevStep} onboardingId={onboardingId} selectedOfficeType={onboardingData.office_type} />;
        case 7:
          return <Step9TradeName 
            onNext={nextStep} 
            onPrev={prevStep} 
            onboardingId={onboardingId} 
            initialTradeName={onboardingData.trade_name} 
            initialTradeName2={onboardingData.trade_name2} 
            initialTradeName3={onboardingData.trade_name3} 
          />;
        case 8:
          return <Step10Stakeholders
            onNext={async () => {
              // Refresh stakeholders from DB before equity screen
              const { data: stakeholders } = await supabase
                .from('Shareholder')
                .select('shareholder_id, name, nationality, passport_no, email, share_capital, percentage, shares')
                .eq('onboarding_id', onboardingId);
              onboardingData.stakeholders = stakeholders?.map(s => ({
                name: s.name,
                nationality: s.nationality,
                passport: s.passport_no,
                email: s.email,
                shareholder_id: s.shareholder_id,
                shares: s.shares,
                percentage: s.percentage,
                share_capital: s.share_capital
              })) || [];
              nextStep();
            }}
            onPrev={prevStep}
            onboardingId={onboardingId}
            initialStakeholders={onboardingData.stakeholders}
            ownerStructureId={onboardingData.ownership}
          />;
        case 9:
          return <Step11ShareCapital onNext={nextStep} onPrev={prevStep} stakeholders={onboardingData.stakeholders || []} onboardingId={onboardingId} initialEquity={onboardingData.equity} initialShareCapital={onboardingData.shareCapital} />;
        case 10:
          return <Step12UploadDocuments onNext={nextStep} onPrev={prevStep} onboardingId={onboardingId} previousDocuments={onboardingData.documents || []} ownerStructureId={onboardingData.ownership} />;
        case 11:
          return <Step13ReviewPayment onboardingData={onboardingData} onPrev={prevStep} onboardingId={onboardingId} />;
        case 12:
          // Payment screen omitted, skip to confirmation
        case 13:
          return <Step14Confirmation onDashboard={() => setCurrentStep(14)} onboardingId={onboardingId} />;
        case 14:
          return <Dashboard onboardingId={onboardingId} />;
        case 99:
          return <NotAvailable onBack={() => setCurrentStep(1)} />;
        default:
          return <div className="p-5 text-white">Step not implemented yet.</div>;
      }
    }
    if (category === 'offshore') {
      switch (currentStep) {
        case 1:
          return (
            <OffshoreStep1
              formData={onboardingData}
              setFormData={(data) => setOnboardingData(prev => ({ ...prev, ...data }))}
              onNext={(data) => data?.backToCategory ? setCategory(null) : nextStep(data)}
              onBack={() => setCategory(null)}
            />
          );
        case 2:
          return (
            <OffshoreStep2
              formData={onboardingData}
              setFormData={(data) => setOnboardingData(prev => ({ ...prev, ...data }))}
              onNext={nextStep}
              onBack={() => setCurrentStep(1)}
            />
          );
        case 3:
          return (
            <OffshoreStep3
              formData={onboardingData}
              setFormData={(data) => setOnboardingData(prev => ({ ...prev, ...data }))}
              onNext={nextStep}
              onBack={() => setCurrentStep(2)}
            />
          );
        case 4:
          return (
            <OffshoreStep4
              formData={onboardingData}
              setFormData={(data) => setOnboardingData(prev => ({ ...prev, ...data }))}
              onNext={nextStep}
              onBack={() => setCurrentStep(3)}
            />
          );
        case 5:
          return (
            <OffshoreStep5
              formData={onboardingData}
              setFormData={(data) => setOnboardingData(prev => ({ ...prev, ...data }))}
              onSubmit={handleSubmitOffshore}
              onBack={() => setCurrentStep(4)}
            />
          );
        case 6:
          return (
            <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-dark text-white">
              <h2 className="mb-3">Application Has Been Submitted</h2>
              <p className="lead mb-4">We will contact you shortly.</p>
              <button
                className="btn btn-outline-danger"
                onClick={() => {
                  localStorage.removeItem('user');
                  navigate('/signin');
                }}
              >
                Logout
              </button>
            </div>
          );


        default:
          return <div className="p-5 text-white">Offshore step not implemented yet.</div>;
      }
    }
    return <NotAvailable onBack={() => setCategory(null)} />;
  };

  return (
    <div className="d-flex vh-100 bg-dark text-white">
      {category === 'freezone' && currentStep !== 15 && <StepsSidebar_freezone currentStep={currentStep} />}
      {category === 'mainland' && <StepsSidebar currentStep={currentStep} />}
      {category === 'offshore' && <StepsSidebar_offshore currentStep={currentStep} />}
      <main className="flex-grow-1 overflow-auto p-5">{renderStep()}</main>
      {/* <ChatBot /> */}
    </div>
  );
}




