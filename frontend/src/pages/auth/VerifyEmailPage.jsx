import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { FaEnvelope, FaExclamationCircle, FaCheckCircle } from "react-icons/fa";

export default function VerifyEmailPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, resendOtp } = useAuthStore();
  const email = location.state?.email || "";

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const otpString = otp.join("");

    if (otpString.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsLoading(true);
    try {
      await verifyEmail(email, otpString);
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      setError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await resendOtp(email);
      setCountdown(60);
      setCanResend(false);
    } catch (err) {
      setError(err.message || "Failed to resend OTP");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <FaEnvelope className="w-12 h-12 text-blue-900" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Verify Your Email
          </h2>
          <p className="text-gray-600 mt-2">
            We've sent a 6-digit code to <br />
            <span className="font-medium">{email}</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <FaExclamationCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <FaCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-green-800">
                Email verified successfully! Redirecting...
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex justify-center gap-2 mb-6">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? "Verifying..." : "Verify Email"}
            </button>
          </form>

          <div className="mt-6 text-center">
            {canResend ? (
              <button
                onClick={handleResend}
                className="text-blue-900 hover:underline font-medium"
              >
                Resend Code
              </button>
            ) : (
              <p className="text-sm text-gray-600">
                Resend code in {countdown}s
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}