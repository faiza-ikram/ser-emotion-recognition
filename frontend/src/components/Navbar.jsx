import { auth } from '../firebase'
import { signOut } from 'firebase/auth'

export default function Navbar({ user, onDashboard }) {
    const handleLogout = () => {
        signOut(auth)
    }

    return (
        <nav className="navbar">
            <a href="/" className="navbar-brand">
                <span className="brand-icon">||</span>
                SER App
            </a>

            <ul className="navbar-links">
                <li><a href="#">Features</a></li>
                <li><a href="#">Download</a></li>
                <li><a href="#">Explore</a></li>
            </ul>

            <div className="navbar-actions">
                {user ? (
                    <div className="user-profile">
                        {user.photoURL && <img src={user.photoURL} alt="Profile" className="user-avatar" />}
                        <span className="user-name">{user.displayName || 'User'}</span>
                        <button className="btn-logout" onClick={handleLogout}>Logout</button>
                    </div>
                ) : (
                    <button className="btn-dashboard" onClick={onDashboard}>
                        Login &rarr;
                    </button>
                )}
            </div>
        </nav>
    )
}

