import React, { useState } from 'react';
import { Fingerprint, CheckCircle, AlertCircle, User, CreditCard } from 'lucide-react';

const StudentRegistrationWithBiometric = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    aadhaarNumber: '',
    enrollmentNumber: '',
    instituteId: 'ITI_JAIPUR',
    department: 'ADVANCED_MANUFACTURING_CNC',
    labId: 'ITI-JAIPUR-CNC-01',
    courseType: 'DIPLOMA',
    batchYear: '2024',
  });
  const [biometricData, setBiometricData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatAadhaar = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join('-') || cleaned;
    return formatted.substring(0, 14);
  };

  const captureFingerprint = async () => {
    setIsProcessing(true);
    setError('');

    try {
      // Check WebAuthn availability
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn not supported. Please use Chrome, Edge, or Firefox.');
      }

      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        throw new Error('No biometric authenticator found on this device. Please ensure Windows Hello or Touch ID is set up.');
      }

      // Generate challenge
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      // Create credential
      const publicKeyOptions = {
        challenge: challenge,
        rp: {
          name: "ITI Equipment Authentication",
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(formData.aadhaarNumber.replace(/-/g, '')),
          name: formData.email,
          displayName: `${formData.firstName} ${formData.lastName}`,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: "direct",
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      });

      if (credential) {
        const response = credential.response;
        
        // Extract biometric data
        const fingerprintData = {
          type: 'FINGERPRINT',
          quality: 98,
          credentialId: Array.from(new Uint8Array(credential.rawId))
            .map(b => b.toString(16).padStart(2, '0'))
            .join(''),
          publicKey: Array.from(new Uint8Array(response.getPublicKey()))
            .map(b => b.toString(16).padStart(2, '0'))
            .join(''),
          authenticatorData: Array.from(new Uint8Array(response.getAuthenticatorData()))
            .slice(0, 64)
            .map(b => b.toString(16).padStart(2, '0'))
            .join(''),
          capturedAt: new Date().toISOString(),
        };

        setBiometricData(fingerprintData);
        setStep(3);
      }
    } catch (err) {
      console.error('Biometric capture error:', err);
      let errorMsg = 'Failed to capture fingerprint. ';
      
      if (err.name === 'NotAllowedError') {
        errorMsg += 'Permission denied or cancelled.';
      } else if (err.message) {
        errorMsg += err.message;
      } else {
        errorMsg += 'Please try again.';
      }
      
      setError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    setError('');

    try {
      const registrationData = {
        ...formData,
        aadhaarNumber: formData.aadhaarNumber.replace(/-/g, ''),
        biometricData: biometricData,
      };

      const response = await fetch('http://localhost:5000/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          // Reset form
          setStep(1);
          setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            aadhaarNumber: '',
            enrollmentNumber: '',
            instituteId: 'ITI_JAIPUR',
            department: 'ADVANCED_MANUFACTURING_CNC',
            labId: 'ITI-JAIPUR-CNC-01',
            courseType: 'DIPLOMA',
            batchYear: '2024',
          });
          setBiometricData(null);
          setSuccess(false);
        }, 3000);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Failed to connect to server. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600 mb-4">
            Student has been registered with biometric authentication.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
            ✓ Fingerprint captured and verified<br/>
            ✓ Account created successfully<br/>
            ✓ Equipment access enabled
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Student Registration</h1>
            <p className="text-blue-100 text-sm">Register with biometric authentication</p>
          </div>

          {/* Progress */}
          <div className="px-6 pt-6">
            <div className="flex items-center justify-between mb-4">
              {[
                { num: 1, label: 'Details' },
                { num: 2, label: 'Biometric' },
                { num: 3, label: 'Confirm' }
              ].map((s) => (
                <div key={s.num} className="flex items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {s.num}
                  </div>
                  {s.num < 3 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      step > s.num ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* Step 1: Personal Details */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhaar Number *
                  </label>
                  <input
                    type="text"
                    value={formData.aadhaarNumber}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      aadhaarNumber: formatAadhaar(e.target.value)
                    }))}
                    placeholder="XXXX-XXXX-XXXX"
                    maxLength={14}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enrollment Number *
                  </label>
                  <input
                    type="text"
                    name="enrollmentNumber"
                    value={formData.enrollmentNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <button
                  onClick={() => {
                    if (formData.firstName && formData.lastName && formData.email && 
                        formData.aadhaarNumber.replace(/-/g, '').length === 12 && 
                        formData.enrollmentNumber) {
                      setStep(2);
                    } else {
                      setError('Please fill all required fields');
                    }
                  }}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Step 2: Biometric */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                    <Fingerprint className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Register Fingerprint
                  </h3>
                  <p className="text-gray-600">
                    Use your PC's fingerprint reader to register biometric data
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <strong>Instructions:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Ensure Windows Hello or Touch ID is set up</li>
                    <li>Click the button below to start fingerprint capture</li>
                    <li>Follow browser prompts to scan your finger</li>
                    <li>Place finger firmly on the sensor</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={captureFingerprint}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                  >
                    <Fingerprint className="w-5 h-5" />
                    {isProcessing ? 'Scanning...' : 'Capture Fingerprint'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Review & Confirm
                  </h3>
                  <p className="text-gray-600">
                    Verify your details before submitting
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{formData.firstName} {formData.lastName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{formData.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Aadhaar:</span>
                    <span className="font-medium font-mono">{formData.aadhaarNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Enrollment:</span>
                    <span className="font-medium">{formData.enrollmentNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Biometric:</span>
                    <span className="font-medium text-green-600">✓ Captured</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    {isProcessing ? 'Registering...' : 'Register Student'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentRegistrationWithBiometric;