import React, { useState, useEffect } from 'react';
import { Fingerprint, Lock, Unlock, CheckCircle, AlertCircle, User, CreditCard, Loader } from 'lucide-react';

const BiometricAuthModal = ({ 
  isOpen, 
  onClose, 
  equipmentId, 
  equipmentName,
  onAuthSuccess 
}) => {
  const [step, setStep] = useState(1); // 1: Aadhaar, 2: Biometric, 3: Processing, 4: Success/Error
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [biometricData, setBiometricData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [scanProgress, setScanProgress] = useState(0);

  // Simulate biometric scanner connection
  const [scannerConnected, setScannerConnected] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Simulate scanner initialization
      setTimeout(() => setScannerConnected(true), 500);
    } else {
      // Reset state when modal closes
      setStep(1);
      setAadhaarNumber('');
      setBiometricData(null);
      setError('');
      setScanProgress(0);
    }
  }, [isOpen]);

  // Format Aadhaar input (XXXX-XXXX-XXXX)
  const formatAadhaar = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join('-') || cleaned;
    return formatted.substring(0, 14); // Max length with dashes
  };

  const handleAadhaarSubmit = () => {
    const cleaned = aadhaarNumber.replace(/-/g, '');
    if (cleaned.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    setError('');
    setStep(2);
  };

  // Use Windows Hello / WebAuthn for biometric scan
  const simulateBiometricScan = async () => {
    setIsProcessing(true);
    setScanProgress(0);
    setError('');
    
    try {
      // Check if WebAuthn is available
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn not supported on this browser');
      }

      // Check if platform authenticator is available (fingerprint reader)
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      if (!available) {
        throw new Error('No fingerprint reader detected on this device');
      }

      // Simulate progressive scanning UI
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 15;
        });
      }, 150);

      // Generate a challenge (in production, this should come from server)
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      // Create credential options
      const publicKeyOptions = {
        challenge: challenge,
        rp: {
          name: "ITI Equipment Authentication",
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(aadhaarNumber.replace(/-/g, '')),
          name: aadhaarNumber,
          displayName: `Student ${aadhaarNumber}`,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Use built-in authenticator
          userVerification: "required", // Require biometric
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: "none",
      };

      // Prompt for fingerprint
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      });

      clearInterval(interval);
      setScanProgress(100);

      if (credential) {
        // Extract authenticator data
        const response = credential.response;
        const clientDataJSON = new TextDecoder().decode(response.clientDataJSON);
        const attestationObject = response.attestationObject;

        // Create biometric fingerprint from credential data
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
          deviceInfo: {
            platform: navigator.platform,
            userAgent: navigator.userAgent.substring(0, 100),
          }
        };

        setBiometricData(fingerprintData);
        setIsProcessing(false);
        setStep(3);
        
        // Auto-proceed to authentication
        setTimeout(() => handleAuthentication(fingerprintData), 500);
      }
    } catch (error) {
      console.error('Biometric scan error:', error);
      clearInterval(interval);
      
      let errorMessage = 'Fingerprint scan failed. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Access denied or cancelled by user.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Fingerprint reader not supported.';
      } else if (error.name === 'InvalidStateError') {
        errorMessage += 'Please try again.';
      } else if (error.message.includes('not supported')) {
        errorMessage += 'Your browser or device does not support biometric authentication.';
      } else if (error.message.includes('No fingerprint')) {
        errorMessage += 'No fingerprint reader detected. Please use a device with a built-in fingerprint sensor.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }
      
      setError(errorMessage);
      setIsProcessing(false);
      setScanProgress(0);
    }
  };

  const handleAuthentication = async (bioData) => {
    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/equipment-auth/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aadhaarNumber: aadhaarNumber.replace(/-/g, ''),
          biometricData: bioData,
          equipmentId: equipmentId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep(4);
        setTimeout(() => {
          onAuthSuccess && onAuthSuccess(data.data);
          onClose();
        }, 2000);
      } else {
        setError(data.message || 'Authentication failed');
        setStep(2);
        setBiometricData(null);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Failed to connect to authentication server');
      setStep(2);
      setBiometricData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Equipment Authentication</h3>
                <p className="text-xs text-blue-100">{equipmentName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full mx-1 transition-all ${
                  s <= step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Aadhaar Input */}
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-3">
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-1">Enter Aadhaar Number</h4>
                <p className="text-sm text-gray-600">Provide your 12-digit Aadhaar number</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aadhaar Number
                </label>
                <input
                  type="text"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(formatAadhaar(e.target.value))}
                  placeholder="XXXX-XXXX-XXXX"
                  maxLength={14}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-center text-lg font-mono tracking-wider"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleAadhaarSubmit}
                disabled={aadhaarNumber.replace(/-/g, '').length !== 12}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Biometric Scan */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                  <Fingerprint className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-1">Biometric Verification</h4>
                <p className="text-sm text-gray-600">Place your finger on the scanner</p>
              </div>

              {/* Scanner Status */}
              <div className={`p-4 rounded-lg border-2 ${
                scannerConnected ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'
              }`}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className={`w-3 h-3 rounded-full ${
                    scannerConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                  }`} />
                  {scannerConnected ? 'PC Fingerprint Reader Ready' : 'Connecting to fingerprint reader...'}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Your PC's built-in fingerprint sensor will be used for authentication
                </p>
              </div>

              {/* Scan Animation */}
              {isProcessing && (
                <div className="space-y-3">
                  <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Fingerprint className="w-24 h-24 text-gray-300" />
                    </div>
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-blue-600/20 transition-all duration-200"
                      style={{ height: `${scanProgress}%` }}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">Scanning... {scanProgress}%</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={simulateBiometricScan}
                  disabled={!scannerConnected || isProcessing}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      Use PC Fingerprint Reader
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-bottom duration-300 text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-3">
                <Loader className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <h4 className="text-xl font-bold text-gray-900">Verifying Identity</h4>
              <p className="text-sm text-gray-600">
                Matching biometric data with Aadhaar records...
              </p>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="space-y-4 animate-in slide-in-from-bottom duration-300 text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900">Authentication Successful!</h4>
              <p className="text-sm text-gray-600">
                Equipment access granted. You may now use the equipment.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
                <Unlock className="w-4 h-4" />
                Equipment Unlocked
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BiometricAuthModal;