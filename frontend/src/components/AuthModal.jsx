import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { useState } from 'react'

export default function AuthModal({ onClose, onLoginSuccess }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleGoogleLogin = async () => {
        setLoading(true)
        setError('')
        try {
            const result = await signInWithPopup(auth, googleProvider)
            onLoginSuccess(result.user)
            onClose()
        } catch (err) {
            console.error('Login error:', err)
            setError('Failed to login with Google. Please check your Firebase settings.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <button className="modal-close" onClick={onClose}>&times;</button>
                <div className="modal-logo">||</div>
                <h2>Welcome to SER App</h2>

                {error && <p className="error-text" style={{ color: '#ef4444', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</p>}

                <button
                    className="btn-google"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" width="18" alt="" />
                    {loading ? 'Connecting...' : 'Continue with Google'}
                </button>
                <button className="btn-apple" disabled>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.152 6.896c-.448 0-1.088.352-1.424.512-.336.16-.544.16-.88 0-.336-.16-.976-.512-1.424-.512-1.104 0-2.016.928-2.016 2.016 0 1.28 1.056 3.104 2.224 4.88.512.784 1.104 1.632 1.84 1.632.72 0 .976-.448 1.84-.448.848 0 1.104.448 1.84.448.736 0 1.328-.848 1.84-1.632 1.168-1.776 2.224-3.6 2.224-4.88 0-1.088-.912-2.016-2.016-2.016-.448 0-1.088.352-1.424.512-.336.16-.544.16-.88 0-.336-.16-.976-.512-1.424-.512zm.048-2.048c.592 0 1.12.336 1.408.848.288-.512.816-.848 1.408-.848 1.2 0 2.16.96 2.16 2.16 0 2.24-2.512 5.28-4.976 8.368-.288.352-.624.352-.912 0-2.464-3.088-4.976-6.128-4.976-8.368 0-1.2.96-2.16 2.16-2.16.592 0 1.12.336 1.408.848.288-.512.816-.848 1.408-.848z" /></svg>
                    Continue with Apple
                </button>

                <div className="divider">or</div>

                <div className="input-group">
                    <label>Email Address</label>
                    <input type="email" placeholder="name@example.com" disabled />
                </div>

                <button className="btn-submit" disabled>Continue</button>

                <div className="modal-footer">
                    Already have an account? <a>Sign in</a>
                </div>
            </div>
        </div>
    )
}

